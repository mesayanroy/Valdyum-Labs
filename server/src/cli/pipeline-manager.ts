#!/usr/bin/env node
/**
 * Multi-Agent Pipeline Manager
 *
 * Orchestrates execution of multiple agents in sequence or parallel
 * with dependency resolution, error handling, and fee management.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { v4 as uuidv4 } from 'uuid';

// Type definition for Response (built-in fetch API)
type Response = globalThis.Response;

interface PipelineAgent {
  id: string;
  order: number;
  timeout: number;
  dependencies?: string[];  // IDs of agents this depends on
  retryCount?: number;
}

interface PipelineConfig {
  id: string;
  name: string;
  description?: string;
  agents: PipelineAgent[];
  parallelizeGroups?: boolean;  // Group by dependencies and run in parallel
  errorStrategy?: 'stop' | 'continue' | 'skip';
  fees?: {
    perRequest: number;
    currency: string;
  };
}

interface PipelineExecution {
  pipelineId: string;
  executionId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: string;
  endTime?: string;
  results: Map<string, any>;
  errors: Map<string, Error>;
  totalFee: number;
}

interface AgentResult {
  agentId: string;
  status: 'success' | 'failed' | 'skipped';
  output: any;
  duration: number;
  error?: Error;
}

/**
 * Multi-Agent Pipeline Orchestrator
 */
export class PipelineManager {
  private apiBase: string;
  private agentWallet: string;
  private pipelines: Map<string, PipelineConfig> = new Map();
  private executions: Map<string, PipelineExecution> = new Map();

  constructor(apiBase: string, agentWallet: string) {
    this.apiBase = apiBase;
    this.agentWallet = agentWallet;
  }

  private async emitPipelineEvent(payload: Record<string, unknown>): Promise<void> {
    try {
      await fetch(`${this.apiBase}/api/telemetry/pipelines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: this.agentWallet || null,
          executedAt: new Date().toISOString(),
          ...payload,
        }),
      });
    } catch {
      // ignore telemetry failures
    }
  }

  /**
   * Create a new pipeline
   */
  async createPipeline(config: PipelineConfig): Promise<string> {
    const id = config.id || uuidv4();
    this.pipelines.set(id, { ...config, id });
    
    console.log(chalk.green(`✓ Pipeline created: ${id}`));
    console.log(`  Agents: ${config.agents.length}`);
    console.log(`  Strategy: ${config.errorStrategy || 'continue'}`);
    
    return id;
  }

  /**
   * Get pipeline by ID
   */
  getPipeline(pipelineId: string): PipelineConfig | undefined {
    return this.pipelines.get(pipelineId);
  }

  /**
   * List all pipelines
   */
  listPipelines(): PipelineConfig[] {
    return Array.from(this.pipelines.values());
  }

  /**
   * Execute a pipeline
   */
  async executePipeline(
    pipelineId: string,
    input: any,
    secret?: string,
  ): Promise<PipelineExecution> {
    const config = this.getPipeline(pipelineId);
    if (!config) {
      throw new Error(`Pipeline not found: ${pipelineId}`);
    }

    const execution: PipelineExecution = {
      pipelineId,
      executionId: uuidv4(),
      status: 'running',
      startTime: new Date().toISOString(),
      results: new Map(),
      errors: new Map(),
      totalFee: 0,
    };

    this.executions.set(execution.executionId, execution);

    try {
      await this.emitPipelineEvent({
        id: execution.executionId,
        pipelineName: config.name,
        status: 'running',
      });
      // Resolve execution order based on dependencies
      const executionOrder = this.resolveExecutionOrder(config);
      
      // Execute agents in order
      for (const agentGroup of executionOrder) {
        if (config.parallelizeGroups) {
          // Execute group in parallel
          const groupResults = await Promise.allSettled(
            agentGroup.map(agent =>
              this.executeAgent(execution, config, agent, input, secret)
            )
          );
          
          for (const result of groupResults) {
            if (result.status === 'rejected') {
              console.error(chalk.red(`Agent execution failed: ${result.reason}`));
              if (config.errorStrategy === 'stop') {
                throw result.reason;
              }
            }
          }
        } else {
          // Execute agents sequentially
          for (const agent of agentGroup) {
            try {
              await this.executeAgent(execution, config, agent, input, secret);
            } catch (err) {
              console.error(chalk.red(`Agent execution failed: ${err}`));
              if (config.errorStrategy === 'stop') {
                throw err;
              }
            }
          }
        }
      }

      execution.status = 'completed';
      execution.endTime = new Date().toISOString();
      await this.emitPipelineEvent({
        id: execution.executionId,
        pipelineName: config.name,
        status: 'success',
        durationMs: execution.endTime ? new Date(execution.endTime).getTime() - new Date(execution.startTime).getTime() : undefined,
      });
    } catch (err) {
      execution.status = 'failed';
      execution.endTime = new Date().toISOString();
      await this.emitPipelineEvent({
        id: execution.executionId,
        pipelineName: config.name,
        status: 'error',
        durationMs: execution.endTime ? new Date(execution.endTime).getTime() - new Date(execution.startTime).getTime() : undefined,
      });
      throw err;
    }

    return execution;
  }

  /**
   * Execute a single agent within a pipeline
   */
  private async executeAgent(
    execution: PipelineExecution,
    config: PipelineConfig,
    agent: PipelineAgent,
    input: any,
    secret?: string,
  ): Promise<AgentResult> {
    const spinner = ora(`Executing agent: ${agent.id}`).start();
    const startTime = Date.now();

    try {
      // Build agent input from previous results
      const agentInput = this.buildAgentInput(agent, execution, input);

      // Call agent API
      let res = await fetch(
        `${this.apiBase}/api/agents/${agent.id}/run`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Pipeline-Id': config.id,
            'X-Execution-Id': execution.executionId,
          },
          body: JSON.stringify({ input: agentInput }),
        }
      ) as Response;

      // Handle 402 payment
      if (res.status === 402 && secret) {
        const details = await res.json() as any;
        const sig = await this.paymentFlow(details, secret);
        
        res = await fetch(
          `${this.apiBase}/api/agents/${agent.id}/run`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Payment-Tx-Hash': sig,
              'X-Solana-Payment-Signature': sig,
              'X-Pipeline-Id': config.id,
              'X-Execution-Id': execution.executionId,
            },
            body: JSON.stringify({ input: agentInput }),
          }
        ) as Response;

        if (config.fees) {
          execution.totalFee += config.fees.perRequest;
        }
      }

      const output = await res.json() as any;
      
      if (!res.ok) {
        throw new Error(output?.error || `Agent returned ${res.status}`);
      }

      const result: AgentResult = {
        agentId: agent.id,
        status: 'success',
        output: output.output || output,
        duration: Date.now() - startTime,
      };

      execution.results.set(agent.id, result);
      spinner.succeed(
        chalk.green(`✓ ${agent.id}`) +
        chalk.gray(` (${result.duration}ms)`)
      );

      return result;
    } catch (err) {
      execution.errors.set(agent.id, err as Error);
      spinner.fail(chalk.red(`✗ ${agent.id}`));
      throw err;
    }
  }

  /**
   * Resolve execution order based on dependencies
   */
  private resolveExecutionOrder(config: PipelineConfig): PipelineAgent[][] {
    const sorted: PipelineAgent[][] = [];
    const processed = new Set<string>();
    const remaining = new Map<string, PipelineAgent>(
      config.agents.map(a => [a.id, a])
    );

    while (remaining.size > 0) {
      const current: PipelineAgent[] = [];

      for (const [id, agent] of remaining) {
        // Check if all dependencies are satisfied
        const deps = agent.dependencies || [];
        if (deps.every(d => processed.has(d))) {
          current.push(agent);
          remaining.delete(id);
        }
      }

      if (current.length === 0 && remaining.size > 0) {
        // Circular dependency
        throw new Error('Circular dependency detected in pipeline');
      }

      sorted.push(current);
      current.forEach(a => processed.add(a.id));
    }

    return sorted;
  }

  /**
   * Build agent input from pipeline context
   */
  private buildAgentInput(
    agent: PipelineAgent,
    execution: PipelineExecution,
    input: any,
  ): any {
    const deps = agent.dependencies || [];
    const depResults: any = {};

    for (const depId of deps) {
      const result = execution.results.get(depId);
      if (result) {
        depResults[depId] = result.output;
      }
    }

    return {
      ...input,
      _pipeline: {
        pipelineId: execution.pipelineId,
        executionId: execution.executionId,
        agentId: agent.id,
      },
      _dependencies: depResults,
    };
  }

  /**
   * Handle 0x402 payment flow
   */
  private async paymentFlow(details: any, secret: string): Promise<string> {
    // In real implementation, would use the payment client
    // For now, return a mock signature
    return 'payment_tx_' + Date.now();
  }

  /**
   * Get execution status
   */
  getExecutionStatus(executionId: string): PipelineExecution | undefined {
    return this.executions.get(executionId);
  }

  /**
   * List all executions
   */
  listExecutions(pipelineId?: string): PipelineExecution[] {
    const execs = Array.from(this.executions.values());
    return pipelineId
      ? execs.filter(e => e.pipelineId === pipelineId)
      : execs;
  }
}

// CLI Commands
const program = new Command();
const apiBase = process.env.VALDYUM_API_URL || process.env.PLATFORM_API_URL || 'http://localhost:3001';
const agentWallet = process.env.SOLANA_AGENT_WALLET || '';
const manager = new PipelineManager(apiBase, agentWallet);

program
  .name('valdyum-pipeline')
  .description('Multi-agent pipeline orchestration');

program
  .command('create')
  .description('Create a new pipeline')
  .requiredOption('-n, --name <name>', 'Pipeline name')
  .option('-d, --description <desc>', 'Pipeline description')
  .requiredOption('-a, --agents <agents>', 'Agent IDs (comma-separated)')
  .option('--parallel', 'Parallelize independent agents')
  .option('-e, --error-strategy <strategy>', 'Error strategy: stop, continue, skip', 'continue')
  .action(async (opts) => {
    try {
      const agents = opts.agents.split(',').map((id: string, idx: number) => ({
        id: id.trim(),
        order: idx + 1,
        timeout: 30000,
      }));

      const pipelineId = await manager.createPipeline({
        id: `pipeline-${Date.now()}`,
        name: opts.name,
        description: opts.description,
        agents,
        parallelizeGroups: opts.parallel || false,
        errorStrategy: opts.errorStrategy,
      });

      console.log(chalk.cyan(`Pipeline ID: ${pipelineId}`));
    } catch (err) {
      console.error(chalk.red(String(err)));
      process.exit(1);
    }
  });

program
  .command('run')
  .description('Execute a pipeline')
  .requiredOption('-p, --pipeline <id>', 'Pipeline ID')
  .requiredOption('-i, --input <json>', 'Agent input (JSON)')
  .option('-s, --secret <secret>', 'Agent secret for payments', process.env.SOLANA_AGENT_SECRET)
  .action(async (opts) => {
    try {
      const input = JSON.parse(opts.input);
      const spinner = ora('Executing pipeline...').start();

      const execution = await manager.executePipeline(opts.pipeline, input, opts.secret);
      
      spinner.stop();
      console.log(chalk.green(`✓ Pipeline execution completed`));
      console.log(chalk.cyan(`Execution ID: ${execution.executionId}`));
      console.log(chalk.cyan(`Duration: ${execution.startTime} to ${execution.endTime}`));
      console.log(chalk.cyan(`Total fee: ${execution.totalFee} SOL`));
      console.log(chalk.cyan(`Results:`));

      for (const [agentId, result] of execution.results) {
        console.log(`  ${agentId}: ${JSON.stringify(result).slice(0, 80)}`);
      }
    } catch (err) {
      console.error(chalk.red(String(err)));
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List all pipelines')
  .action(() => {
    const pipelines = manager.listPipelines();
    if (pipelines.length === 0) {
      console.log(chalk.yellow('No pipelines found'));
      return;
    }

    console.log(chalk.cyan.bold('Pipelines:'));
    for (const p of pipelines) {
      console.log(`  ${chalk.cyan(p.id)} ${chalk.white(p.name)}`);
      console.log(`    ${p.agents.length} agents`);
    }
  });

program
  .command('status')
  .description('Get execution status')
  .requiredOption('-x, --execution <id>', 'Execution ID')
  .action((opts) => {
    const exec = manager.getExecutionStatus(opts.execution);
    if (!exec) {
      console.log(chalk.yellow('Execution not found'));
      return;
    }

    console.log(chalk.cyan.bold('Execution Status:'));
    console.log(chalk.white(`Status: ${exec.status}`));
    console.log(chalk.white(`Started: ${exec.startTime}`));
    if (exec.endTime) {
      console.log(chalk.white(`Ended: ${exec.endTime}`));
    }
    console.log(chalk.white(`Results: ${exec.results.size}`));
    console.log(chalk.white(`Errors: ${exec.errors.size}`));
    console.log(chalk.white(`Total Fee: ${exec.totalFee} SOL`));
  });

program.parseAsync().catch((err) => {
  console.error(chalk.red(String(err)));
  process.exit(1);
});
