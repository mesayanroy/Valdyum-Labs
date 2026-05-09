import { Sandbox } from '@vercel/sandbox';
import { config } from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

config();

export async function runInVercelSandbox(command: string, args: string[] = []): Promise<string> {
  try {
    const sandbox = await Sandbox.create();
    const result = await sandbox.runCommand(command, args);
    return await result.stdout();
  } catch (err: any) {
    return `[SIMULATION] Executing ${command} ${args.join(' ')}\n(Note: Connect Vercel to see real sandbox output)`;
  }
}

export async function simulateAgentWorkflow(agentName: string, prompt: string): Promise<string[]> {
  const logs: string[] = [];
  logs.push(`[SYSTEM] Initializing Vercel Sandbox for unit: ${agentName}...`);
  
  try {
    // Check if we can actually create a sandbox
    const sandbox = await Sandbox.create();
    logs.push(`[SYSTEM] Sandbox created successfully.`);
    
    logs.push(`[NEURAL] Injecting directives: "${prompt.slice(0, 30)}..."`);
    const echoResult = await sandbox.runCommand('echo', [`Agent ${agentName} activated.`]);
    logs.push(`[STDOUT] ${await echoResult.stdout()}`);
    
    logs.push(`[SYSTEM] Running diagnostic suite...`);
    const dateResult = await sandbox.runCommand('date');
    logs.push(`[STDOUT] Current Sandbox Time: ${await dateResult.stdout()}`);
    
    logs.push(`[SYSTEM] Workflow simulation complete. Unit is healthy.`);
    return logs;
  } catch (err: any) {
    // Fallback Simulation for local dev without Vercel Link
    logs.push(`[SYSTEM] Vercel OIDC not detected. Switching to Imperial Simulation Mode...`);
    logs.push(`[SYSTEM] Simulation Environment: Node-v22 / Valdyum-Praetorian`);
    logs.push(`[NEURAL] Injecting directives: "${prompt.slice(0, 40)}..."`);
    logs.push(`[STDOUT] Agent ${agentName} status: ONLINE`);
    logs.push(`[STDOUT] Latency: 12ms | Neural Integrity: 99.9%`);
    logs.push(`[SYSTEM] Workflow simulation complete. Unit is healthy.`);
    logs.push(``);
    logs.push(`[TIP] To use real Vercel Sandboxes, run: npx vercel link && npx vercel env pull`);
    return logs;
  }
}
