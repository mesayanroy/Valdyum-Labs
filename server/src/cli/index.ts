#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import bs58 from 'bs58';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const program = new Command();
const apiBaseDefault = process.env.VALDYUM_API_URL || 'http://localhost:3000';
const cluster = process.env.SOLANA_CLUSTER || process.env.NEXT_PUBLIC_SOLANA_CLUSTER || 'testnet';
const rpcUrl = process.env.SOLANA_RPC_URL || process.env.NEXT_PUBLIC_SOLANA_RPC_URL || (cluster === 'mainnet-beta' ? 'https://api.mainnet-beta.solana.com' : 'https://api.testnet.solana.com');
const dashboardUrl = process.env.PLATFORM_API_URL || process.env.VALDYUM_DASHBOARD_URL || 'http://localhost:3000';
const agentWallet = process.env.SOLANA_AGENT_WALLET || process.env.AGENT_WALLET || '';

function explorerUrl(sig: string) {
  return `https://explorer.solana.com/tx/${sig}?cluster=${cluster}`;
}

function parseSecret(secret: string): Keypair {
  if (secret.trim().startsWith('[')) {
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(secret) as number[]));
  }
  return Keypair.fromSecretKey(bs58.decode(secret.trim()));
}

function isLikelyValidSecret(secret?: string | null): secret is string {
  if (!secret) return false;

  try {
    if (secret.trim().startsWith('[')) {
      const parsed = JSON.parse(secret) as unknown;
      return Array.isArray(parsed) && parsed.every((value) => Number.isInteger(value) && value >= 0 && value <= 255);
    }

    bs58.decode(secret.trim());
    return true;
  } catch {
    return false;
  }
}

function loadLocalSolanaSecret(): string | null {
  const localSecretPath = path.join(os.homedir(), '.config', 'solana', 'id.json');
  if (!fs.existsSync(localSecretPath)) {
    return null;
  }

  try {
    const contents = fs.readFileSync(localSecretPath, 'utf8');
    const parsed = JSON.parse(contents) as number[];
    return JSON.stringify(parsed);
  } catch {
    return null;
  }
}

function resolveAgentSecret(secret?: string): string {
  const candidates = [
    secret,
    process.env.SOLANA_AGENT_SECRET,
    process.env.AGENT_SECRET,
    loadLocalSolanaSecret(),
  ];

  for (const candidate of candidates) {
    if (isLikelyValidSecret(candidate)) {
      return candidate;
    }
  }

  throw new Error('No valid Solana secret found. Set SOLANA_AGENT_SECRET or keep ~/.config/solana/id.json available.');
}

async function paySol(secret: string, destination: string, amountSol: number) {
  const kp = parseSecret(secret);
  const conn = new Connection(rpcUrl, 'confirmed');
  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash('confirmed');
  const tx = new Transaction({ feePayer: kp.publicKey, recentBlockhash: blockhash }).add(
    SystemProgram.transfer({
      fromPubkey: kp.publicKey,
      toPubkey: new PublicKey(destination),
      lamports: Math.round(amountSol * LAMPORTS_PER_SOL),
    })
  );
  tx.sign(kp);
  const sig = await conn.sendRawTransaction(tx.serialize());
  await conn.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed');
  return sig;
}

async function listAgents(apiBase: string) {
  try {
    const res = await fetch(`${apiBase}/api/agents/list`);
    const data = await res.json() as any;
    const agents = Array.isArray(data?.agents) ? data.agents : [];
    if (!agents.length) {
      console.log(chalk.yellow('No agents found.'));
      return;
    }
    for (const a of agents) {
      console.log(`${chalk.cyan(a.id)}  ${chalk.white(a.name)}  ${chalk.yellow(`${a.price_xlm} SOL`)}  ${chalk.gray(a.wallet_address || '')}`);
    }
  } catch (err) {
    throw new Error(`Unable to fetch agents from ${apiBase}. Start the server or pass --api. (${String(err).slice(0, 120)})`);
  }
}

async function sandboxAgent(apiBase: string, agentId: string, input: string) {
  const res = await fetch(`${apiBase}/api/agents/${agentId}/sandbox`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(agentWallet ? { 'X-Solana-Payment-Wallet': agentWallet } : {}),
      'X-Agent-Sandbox': 'true',
    },
    body: JSON.stringify({ input }),
  });
  const out = await res.json().catch(() => ({} as any));
  if (!res.ok) {
    throw new Error((out as any)?.error || `Sandbox failed: ${res.status}`);
  }
  console.log(chalk.green('Sandbox response:'));
  console.log(JSON.stringify(out, null, 2));
}

async function runAgent(apiBase: string, agentId: string, input: string, secret?: string) {
  let res: Response;

  try {
    res = await fetch(`${apiBase}/api/agents/${agentId}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input }),
    });
  } catch (err) {
    throw new Error(`Unable to reach agent API at ${apiBase}. (${String(err).slice(0, 120)})`);
  }

  if (res.status === 402) {
    const details = await res.json() as any;
    const pd = details?.payment_details;
    if (!pd) throw new Error('Payment required but payment_details missing');
    const resolvedSecret = resolveAgentSecret(secret);

    const spinner = ora(`Paying ${pd.amount_xlm} SOL to ${pd.address}`).start();
    const sig = await paySol(resolvedSecret, pd.address, Number(pd.amount_xlm || 0));
    spinner.succeed(`Payment confirmed: ${sig}`);
    console.log(chalk.gray(explorerUrl(sig)));

    const payer = parseSecret(resolvedSecret);

    res = await fetch(`${apiBase}/api/agents/${agentId}/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Payment-Tx-Hash': sig,
        'X-Solana-Payment-Signature': sig,
        'X-Payment-Wallet': payer.publicKey.toBase58(),
        'X-Solana-Payment-Wallet': payer.publicKey.toBase58(),
      },
      body: JSON.stringify({ input }),
    });
  }

  const out = await res.json().catch(() => ({} as any));
  if (!res.ok) {
    throw new Error((out as any)?.error || `Request failed: ${res.status}`);
  }

  console.log(chalk.green('Agent response:'));
  console.log((out as any).output || JSON.stringify(out, null, 2));
}

program
  .name('valdyum')
  .description('Valdyum CLI (Solana)')
  .option('-a, --api <url>', 'API base URL', apiBaseDefault);

program
  .command('agents:list')
  .description('List available agents')
  .action(async () => {
    const opts = program.opts();
    await listAgents(opts.api);
  });

program
  .command('agents:sandbox')
  .description('Run an agent in sandbox mode before deployment')
  .requiredOption('-i, --id <agentId>', 'Agent id')
  .requiredOption('-p, --prompt <input>', 'Prompt/input')
  .action(async (opts) => {
    const globalOpts = program.opts();
    await sandboxAgent(globalOpts.api, opts.id, opts.prompt);
  });

program
  .command('agents:run')
  .description('Run an agent and auto-handle 402 SOL payment')
  .requiredOption('-i, --id <agentId>', 'Agent id')
  .requiredOption('-p, --prompt <input>', 'Prompt/input')
  .option('-s, --secret <secret>', 'Solana secret key (base58 or JSON array)', process.env.SOLANA_AGENT_SECRET)
  .action(async (opts) => {
    const globalOpts = program.opts();
    await runAgent(globalOpts.api, opts.id, opts.prompt, opts.secret);
  });

program
  .command('tx:status')
  .description('Check Solana transaction confirmation status')
  .requiredOption('-h, --hash <txHash>', 'Transaction hash/signature')
  .action(async (opts) => {
    const conn = new Connection(rpcUrl, 'confirmed');
    const status = await conn.getSignatureStatus(opts.hash);
    console.log(status.value || 'not found');
    console.log(explorerUrl(opts.hash));
  });

program
  .command('dashboard:open')
  .description('Show the dashboard URL and live infrastructure settings')
  .action(async () => {
    console.log(chalk.cyan(`Dashboard: ${dashboardUrl}`));
    console.log(chalk.gray(`Cluster: ${cluster}`));
    console.log(chalk.gray(`RPC: ${rpcUrl}`));
    console.log(chalk.gray(`Wallet: ${agentWallet || 'unset'}`));
  });

program
  .command('dashboard:status')
  .description('Print a dashboard-ready Solana/QStash status summary')
  .action(async () => {
    console.log(JSON.stringify({
      dashboardUrl,
      rpcUrl,
      cluster,
      agentWallet: agentWallet || null,
      qstashConfigured: Boolean(process.env.QSTASH_TOKEN),
      ablyConfigured: Boolean(process.env.ABLY_API_KEY),
      jupiterKeyConfigured: Boolean(process.env.JUPITER_API_KEY),
    }, null, 2));
  });

// ─────────────────────────────────────────────────────────────────────────────
// ClawCredit Commands
// ─────────────────────────────────────────────────────────────────────────────

import {
  readClawCreditCredentials,
  getClawCreditStatus,
  payMerchantWithCredit,
  hasSufficientCredit,
  getDashboardLink,
} from '../services/clawcredit';

program
  .command('clawcredit:status')
  .description('Show ClawCredit prequalification and credit status')
  .option('-s, --scope <scope>', 'Agent scope', 'main')
  .action(async (opts) => {
    const spinner = ora('Fetching ClawCredit status...').start();
    try {
      const credentials = readClawCreditCredentials(opts.scope);

      if (!credentials) {
        spinner.fail(chalk.yellow('ClawCredit not registered'));
        console.log(chalk.gray('Run: pnpm exec tsx src/scripts/clawcredit-register.ts'));
        return;
      }

      spinner.succeed(chalk.green('Status loaded'));

      // Display concurrent status checks
      const statusSpinner = ora().start();

      const statusChecks = [
        {
          label: 'Pre-qualification Status',
          value: (credentials.prequalification_status as string) || 'unknown',
          icon: (credentials.credit_issued as boolean) ? '✓' : '⏳',
        },
        {
          label: 'Credit Issued',
          value: (credentials.credit_issued as boolean) ? 'Yes' : 'No',
          icon: (credentials.credit_issued as boolean) ? '✓' : '✗',
        },
        {
          label: 'Credit Limit',
          value: `$${credentials.credit_limit || 0}`,
          icon: (credentials.credit_limit as number) > 0 ? '✓' : '-',
        },
        {
          label: 'Credit Balance',
          value: `$${credentials.credit_balance || 0}`,
          icon: '-',
        },
        {
          label: 'Available Credit',
          value: `$${((credentials.credit_limit as number) || 0) - ((credentials.credit_balance as number) || 0)}`,
          icon: '💳',
        },
      ];

      statusSpinner.stop();
      console.log(chalk.cyan.bold('\n📊 ClawCredit Status\n'));

      for (const check of statusChecks) {
        console.log(`${chalk.cyan(check.icon)} ${check.label.padEnd(25)} ${chalk.white(check.value)}`);
      }

      if (credentials.dashboard_link) {
        console.log(`\n${chalk.blue('🔗 Dashboard:')} ${credentials.dashboard_link}`);
      }

      const nextActions = getNextActionsForCLI(credentials);
      if (nextActions.length > 0) {
        console.log(chalk.yellow.bold('\n📝 Next Actions:'));
        for (const action of nextActions) {
          console.log(`  • ${action}`);
        }
      }
    } catch (err) {
      spinner.fail(chalk.red(String(err)));
    }
  });

program
  .command('clawcredit:pay')
  .description('Pay a merchant using ClawCredit')
  .requiredOption('-u, --url <merchantUrl>', 'Merchant URL')
  .requiredOption('-a, --amount <usd>', 'Amount in USD')
  .option('-d, --description <desc>', 'Payment description')
  .option('--trace', 'Enable LLM tracing')
  .action(async (opts) => {
    const spinner = ora('Processing ClawCredit payment...').start();
    try {
      const amountUsd = parseFloat(opts.amount);
      if (Number.isNaN(amountUsd) || amountUsd <= 0) {
        spinner.fail(chalk.red('Invalid amount'));
        return;
      }

      const credentials = readClawCreditCredentials();
      if (!credentials) {
        spinner.fail(chalk.yellow('ClawCredit not registered'));
        return;
      }

      // Check sufficient credit concurrently with payment processing
      const creditCheck = ora('Checking available credit...').start();
      const hasSufficient = await hasSufficientCredit(
        amountUsd,
        'valdyum-agent',
        credentials.apiToken as string,
      );
      creditCheck.stop();

      if (!hasSufficient) {
        spinner.fail(chalk.red(`Insufficient credit for $${amountUsd} payment`));
        console.log(chalk.yellow('Check ClawCredit status for available balance'));
        return;
      }

      creditCheck.succeed(chalk.green('✓ Sufficient credit available'));

      // Process payment
      const paymentSpinner = ora(`Paying $${amountUsd} to ${opts.url}...`).start();
      const result = await payMerchantWithCredit(
        'valdyum-agent',
        {
          merchantUrl: opts.url,
          amountUsd,
          description: opts.description,
          traceEnabled: opts.trace || false,
        },
        credentials.apiToken as string,
      );

      if (result.success) {
        paymentSpinner.succeed(chalk.green(`✓ Payment successful`));
        console.log(chalk.gray(`Transaction ID: ${result.transactionId || 'pending'}`));
      } else {
        paymentSpinner.fail(chalk.red(`Payment failed: ${result.error}`));
      }
    } catch (err) {
      spinner.fail(chalk.red(String(err)));
    }
  });

program
  .command('clawcredit:dashboard')
  .description('Open ClawCredit dashboard in browser or show link')
  .option('-s, --scope <scope>', 'Agent scope', 'main')
  .option('--print-only', 'Print link instead of opening')
  .action(async (opts) => {
    const spinner = ora('Getting dashboard link...').start();
    try {
      const link = getDashboardLink(opts.scope);

      if (!link) {
        spinner.fail(chalk.yellow('ClawCredit dashboard link not available'));
        return;
      }

      spinner.succeed(chalk.green('Dashboard link ready'));

      if (opts.printOnly) {
        console.log(link);
      } else {
        console.log(chalk.blue(`🔗 Opening: ${link}`));
        // In a real CLI, you would use 'open' (macOS) or 'xdg-open' (Linux) here
        console.log(chalk.gray('Copy the link above to open in your browser'));
      }
    } catch (err) {
      spinner.fail(chalk.red(String(err)));
    }
  });

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

function getNextActionsForCLI(credentials: Record<string, unknown>): string[] {
  const actions: string[] = [];
  const status = credentials.prequalification_status as string;
  const creditIssued = credentials.credit_issued as boolean;

  if (!creditIssued) {
    if (status === 'needs_more_context') {
      actions.push('Add agent transcripts to OPENCLAW_TRANSCRIPT_DIRS');
      actions.push('Set OPENCLAW_PROMPT_DIRS for agent prompts');
    } else {
      actions.push('Check dashboard for pre-qualification progress');
    }
  }

  if (creditIssued) {
    const balance = (credentials.credit_balance || 0) as number;
    const limit = (credentials.credit_limit || 0) as number;
    const utilization = (balance / limit) * 100;

    if (utilization > 80) {
      actions.push(`Credit usage high (${Math.round(utilization)}%). Schedule repayment soon.`);
    }

    actions.push('Use clawcredit:pay to make purchases');
  }

  return actions;
}

program.parseAsync().catch((err) => {
  console.error(chalk.red(String(err)));
  process.exit(1);
});
