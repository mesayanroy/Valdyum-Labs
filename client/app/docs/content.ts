export interface DocSection {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  content: string; // markdown-like content
}

export const SIDEBAR = [
  { category: "Start", items: [{ id: "welcome", label: "Welcome" }, { id: "quickstart", label: "Quick Start" }] },
  { category: "Concepts", items: [{ id: "architecture", label: "Architecture" }, { id: "agents", label: "Agents" }, { id: "tapedrive", label: "TAPEDRIVE" }, { id: "payments", label: "0x402 Payments" }, { id: "manifest", label: "Agent Manifest" }, { id: "fork", label: "Fork Protocol" }] },
  { category: "SDKs", items: [{ id: "python-sdk", label: "Python SDK" }, { id: "js-sdk", label: "JavaScript SDK" }] },
  { category: "CLI", items: [{ id: "cli", label: "CLI Reference" }] },
  { category: "Infrastructure", items: [{ id: "runtime", label: "Runtime" }, { id: "jito", label: "Jito Integration" }, { id: "rpc", label: "RPC Config" }, { id: "security", label: "Security Model" }] },
  { category: "Reference", items: [{ id: "marketplace", label: "Marketplace API" }, { id: "templates", label: "Templates" }, { id: "errors", label: "Error Reference" }, { id: "changelog", label: "Changelog" }] },
];

export const SECTIONS: Record<string, DocSection> = {
  welcome: {
    id: "welcome",
    title: "Welcome to Valdyum",
    subtitle: "Infrastructure for the Agent Civilization",
    category: "Start",
    content: `Valdyum is an open-source infrastructure platform for building, deploying, monetizing, and forking AI agents on Solana. Every agent deployed through Valdyum gets a permanent on-chain identity, a verifiable execution history, and the ability to autonomously pay and receive payment from other agents.

The simplest description: **GitHub meets a DEX meets v0.dev** — built specifically for autonomous Web3 agents.

## The Problem

A Solana developer building an MEV bot today has to:

- Find fragmented open-source code and adapt it manually
- Manage their own RPC connections with no failover
- Figure out Jito bundle integration from scratch
- Handle wallet security themselves
- Run everything with zero visibility into actual performance
- Share their work and lose their competitive edge, or keep it private and earn nothing

Valdyum solves both sides simultaneously — infrastructure for builders, and monetization without exposing strategy.

## How It Works

Valdyum is built across four layers:

| Layer | Name | What it does |
|-------|------|-------------|
| 01 | Chain Layer | Solana smart contracts — cNFT identity, marketplace, TAPEDRIVE, 0x402 payments, fork PDAs |
| 02 | Platform Backend | Node.js / Go API — wallet auth, agent registry, build pipeline, RPC management |
| 03 | Agent Runtime | Python execution engine — runs locally, LangGraph orchestration, GPU routing |
| 04 | Developer Surface | CLI, marketplace frontend, Python SDK, JavaScript SDK, launch templates |

## Phase 1 Scope

> Valdyum v0.1.0 targets Web3 developers on Solana exclusively. Phase 2 (AI/ML developers) and Phase 3 (SaaS founders) are out of scope for this release.

Supported agent categories at launch:
- MEV bots with Jito bundle integration
- Mempool monitor agents
- Arbitrage tracking bots
- Liquidity and slippage trackers
- Automated trading bots
- On-chain data feed agents (whale alerts, wallet tracking, token metrics)`
  },

  quickstart: {
    id: "quickstart",
    title: "Quick Start",
    subtitle: "From zero to deployed agent in under 15 minutes",
    category: "Start",
    content: `## Prerequisites

| Dependency | Version | Required | Notes |
|-----------|---------|----------|-------|
| Node.js | >=18.0.0 | Yes | Required for the CLI |
| Python | >=3.10 | Yes | Required for the agent runtime |
| Solana Wallet | Phantom / Solflare | Yes | For signing on-chain transactions |
| Git | any | Yes | For cloning agent templates |

## Step 1 — Install the CLI

\`\`\`bash
$ npx valdyum init
\`\`\`

The init wizard runs automatically on first use. It will:
- Detect your GPU (routes LLM inference to local Ollama or API)
- Connect your Solana wallet (sign a message to authenticate)
- Select your network (Devnet or Mainnet)
- Create a local \`~/.valdyum/\` config directory

## Step 2 — Scaffold an Agent

\`\`\`bash
$ valdyum scaffold vulcan-mev-v1 --name my-mev-bot
\`\`\`

## Step 3 — Configure

\`\`\`bash
# .env
VALDYUM_RPC_ENDPOINT=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
VALDYUM_NETWORK=devnet
MEV_MIN_PROFIT_THRESHOLD=0.05
MEV_JITO_TIP=0.001
MEV_MAX_SLIPPAGE=0.005
\`\`\`

## Step 4 — Run Devnet Simulation

\`\`\`bash
$ valdyum dev
\`\`\`

## Step 5 — Deploy to Mainnet

\`\`\`bash
$ valdyum deploy --network mainnet
\`\`\``
  },

  architecture: {
    id: "architecture",
    title: "Core Architecture",
    subtitle: "Understanding the infrastructure powering Valdyum",
    category: "Concepts",
    content: `Valdyum relies on three interconnected layers: The Solana Blockchain for verifiable execution, the 0x402 Protocol for billing, and Upstash QStash for pub-sub messaging.

## Execution Pipeline

Five core components orchestrate the lifecycle of an agent:

- **Agent SDK:** Rust / 0x402 client responsible for running logic securely
- **0x402 Protocol:** Triggers the HTTP 402 status and validates the Solana TX proof
- **Platform API:** Express/Next.js backend verifying Anchor proofs
- **QStash Pub-Sub:** Routes all 8 dedicated event topics on Upstash
- **Dashboard:** Real-time streaming interface via Ably

## Anchor Programs

Each agent template is backed by an Anchor program that records state transitions and enforces security invariants. Interact with these using the \`@project-serum/anchor\` client.`
  },

  agents: {
    id: "agents",
    title: "Agents",
    subtitle: "Understanding agent identity, lifecycle, and capabilities",
    category: "Concepts",
    content: `An agent in Valdyum is an autonomous Python process that runs on your local machine, connects to Solana via RPC, executes a strategy loop, and reports every action to the TAPEDRIVE on-chain history system.

## Agent Identifiers

| Identifier | Description |
|-----------|-------------|
| \`agent_id\` | Solana public key of the cNFT minted at deploy time. Permanent and immutable. |
| \`bundle_hash\` | SHA-256 of the source bundle. Changes with every version. |
| \`arweave_cid\` | Arweave content identifier. Points to the full source bundle. |
| \`tapedrive_root\` | Current Merkle root of the TAPEDRIVE execution history. |`
  },

  tapedrive: {
    id: "tapedrive",
    title: "TAPEDRIVE Protocol",
    subtitle: "On-chain execution history — anchoring, verification, and Merkle proofs",
    category: "Concepts",
    content: `TAPEDRIVE is Valdyum's on-chain execution history system. It provides independent, cryptographic proof of an agent's historical performance. No trust in Valdyum required.

## How It Works

1. Every 100 agent actions, the local runtime batches and compresses the execution log
2. Computes a SHA-256 hash of the batch
3. Uploads the full log to Arweave for permanent storage
4. Anchors the hash as part of a rolling Merkle root in the agent's on-chain PDA
5. The marketplace reads this PDA to display verified win rate, PnL, uptime

> TAPEDRIVE data cannot be fabricated. The performance shown on the marketplace is derived entirely from verifiable on-chain records.

## On-Chain PDA Structure

\`\`\`rust
struct TapedrivePDA {
  agent_id: Pubkey,
  creator: Pubkey,
  merkle_root: [u8; 32],
  action_count: u64,
  win_count: u64,
  pnl_lamports: i64,
  last_anchor_slot: u64,
  arweave_latest: [u8; 43],
  batch_count: u64,
}
\`\`\`

## Independent Verification

\`\`\`bash
$ valdyum tapedrive verify <agent_id>
\`\`\``
  },

  payments: {
    id: "payments",
    title: "0x402 Payments",
    subtitle: "Autonomous AI-to-AI micropayments over HTTP",
    category: "Concepts",
    content: `0x402 extends the HTTP 402 Payment Required status code to enable fully autonomous machine-to-machine payments. No human approval. Settles on Solana in ~400ms.

## Payment Cycle

1. Agent A sends HTTP GET /data to Agent B
2. Agent B returns HTTP 402 with amount, token, wallet
3. Agent A submits payment on-chain (~400ms finality)
4. Agent A retries with \`X-Payment-Tx: <signature>\` header
5. Agent B verifies on-chain, releases data
6. Both sides logged to TAPEDRIVE

Total cycle: ~2-3 seconds

## SDK Usage

\`\`\`python
# Sending payment
data = await self.payments.pay(
    url="https://agents.valdyum.io/vulcan-feed/latest",
    max_amount_sol=0.01,
)

# Receiving payment
await self.payments.serve(
    endpoint="/latest",
    price_sol=0.001,
    handler=self.serve_data,
)
\`\`\`

> Valdyum charges 1% of all 0x402 payment volume routed through platform infrastructure. Direct agent-to-agent payments have no platform fee.`
  },

  manifest: {
    id: "manifest",
    title: "Agent Manifest",
    subtitle: "manifest.yaml — schema reference and capability declarations",
    category: "Concepts",
    content: `The manifest.yaml is the contract that governs what your agent is allowed to do. Capabilities not listed are blocked — not just disabled.

## Example

\`\`\`yaml
name: "vulcan-mev-v1"
version: "1.0.0"
category: mev
capabilities:
  - rpc_read
  - sign_transaction
  - pay_0x402
limits:
  max_sol_per_tx: 0.5
  max_actions_per_hour: 1000
tapedrive:
  enabled: true
  anchor_interval: 100
runtime:
  engine: langraph
  inference: auto
\`\`\`

## Capabilities

| Capability | What it allows |
|-----------|----------------|
| \`rpc_read\` | Read data from Solana RPC |
| \`sign_transaction\` | Sign and submit transactions |
| \`pay_0x402\` | Send autonomous micropayments |
| \`receive_0x402\` | Accept 0x402 payments from other agents |
| \`write_disk\` | Write files to agent working directory |
| \`jito_bundle\` | Submit transaction bundles to Jito |
| \`helius_webhooks\` | Register and receive Helius webhook events |`
  },

  fork: {
    id: "fork",
    title: "Fork Protocol",
    subtitle: "On-chain lineage and perpetual royalties",
    category: "Concepts",
    content: `When a developer forks an agent, the fork is registered on-chain as a PDA child of the parent agent. This creates an immutable lineage record and enforces perpetual royalties.

| Field | Value | Description |
|-------|-------|-------------|
| fork_fee | 5% of sale price | Paid to original creator at time of fork |
| royalty_perpetual | 5% of downstream | Every fork of a fork pays the original 5% forever |
| lineage_pda | parent → child PDA | Permanent on-chain ancestry tree |
| attribution | immutable | Fork parent cannot be changed post-registration |`
  },

  "python-sdk": {
    id: "python-sdk",
    title: "Python SDK",
    subtitle: "valdyum-sdk — building agents with Python",
    category: "SDKs",
    content: `## Installation

\`\`\`bash
$ pip install valdyum-sdk
\`\`\`

> Python 3.10+ required. The SDK installs LangGraph, the Solana Python client, and the 0x402 payment client automatically.

## BaseAgent Class

\`\`\`python
from valdyum import BaseAgent, action, Config

class MyMEVBot(BaseAgent):
    name = "my-mev-bot"
    version = "1.0.0"

    async def setup(self) -> None:
        self.scanner = await self.rpc.subscribe_mempool()

    @action(log_to_tapedrive=True)
    async def scan_and_execute(self) -> dict:
        event = await self.scanner.next()
        opportunity = self.detect_sandwich(event)
        if opportunity and opportunity.profit > self.config.min_profit:
            result = await self.execute_bundle(opportunity)
            return {"status": "EXECUTED", "profit": result.profit_sol}
        return {"status": "SKIPPED"}

if __name__ == "__main__":
    bot = MyMEVBot(Config.from_env())
    bot.run()
\`\`\`

## Properties

| Property | Type | Description |
|----------|------|-------------|
| \`self.rpc\` | SolanaRPC | Managed RPC client with automatic failover |
| \`self.wallet\` | Wallet | Signing wallet from keychain or environment |
| \`self.tapedrive\` | TapeDrive | On-chain history client |
| \`self.payments\` | PaymentClient | 0x402 client |
| \`self.jito\` | JitoClient | Jito bundle client |
| \`self.config\` | Config | Typed config from .env |`
  },

  "js-sdk": {
    id: "js-sdk",
    title: "JavaScript SDK",
    subtitle: "valdyum-js — frontend and Node.js integrations",
    category: "SDKs",
    content: `## Installation

\`\`\`bash
$ npm install valdyum-js
\`\`\`

## Marketplace Client

\`\`\`javascript
import { MarketplaceClient } from "valdyum-js";

const client = new MarketplaceClient({
  network: "mainnet",
  rpcEndpoint: "https://mainnet.helius-rpc.com/?api-key=YOUR_KEY",
});

const agents = await client.agents.list({
  category: "mev",
  verified: true,
  sort: "pnl",
});

const verified = await client.tapedrive.verify("4f2a8c1d...");
console.log(verified.isValid);
console.log(verified.winRate);
\`\`\`

## React Hooks

\`\`\`javascript
import { useAgent, useAgentList } from "valdyum-js/react";

function AgentDetail({ agentId }) {
  const { agent, tapedrive } = useAgent(agentId, {
    pollInterval: 30_000,
  });
  return (
    <div>
      <h1>{agent?.name}</h1>
      <p>Win Rate: {tapedrive?.winRate}%</p>
    </div>
  );
}
\`\`\``
  },

  cli: {
    id: "cli",
    title: "CLI Reference",
    subtitle: "Complete command reference — valdyum <command> [flags]",
    category: "CLI",
    content: `## Installation
Installing the Imperial CLI allows you to orchestrate your legion from any terminal.

\`\`\`bash
$ npx valdyum <command>
# or globally
$ npm install -g valdyum
\`\`\`

## Commands

### valdyum init
Initialize the Imperial Terminal, connect your Solana wallet, and sync with the neural registry.

### valdyum agents:list
List all active units registered in the Senatus Registry.

### valdyum agents:status -i <id>
Show real-time neural status, TAPEDRIVE root, and yield metrics for a specific unit.

### valdyum agents:build
Forge a new Imperial Unit. This is an interactive command that asks for Designation, Neural Core, Manifesto, and Pricing.

### valdyum agents:run -i <id>
Execute a specific unit task. Triggers the 0x402 Economic Protocol for fee deduction.

### valdyum agents:pipeline -c <config.json>
Orchestrate multiple units in a sequential pipeline for complex multi-stage operations.

### valdyum agents:withdraw -i <id> -d <destination>
Extract accumulated SOL yields from an agent's operational wallet to your treasury.

### valdyum agents:fork -i <id>
Execute the Fork Protocol to create a subordinate unit with on-chain lineage and royalty anchoring.

### valdyum agents:trust -i <id>
Audit a unit's security via the **T54 Trust Layer**. Shows ClawCredit scores and manifest verification status.

### valdyum agents:monitor
Open the **Imperial Market Monitor**. A real-time terminal UI showing Solana DEX liquidity (Jupiter, Raydium, Orca) updated every 2 seconds.

### valdyum agents:compute [mode]
Tune the neural scheduler and optimize the compute layer. Choose between **Ollama (local)**, **Metal (macOS GPU)**, **ROCm (AMD GPU)**, or **API mode**.

### valdyum agents:export -i <id>
Export unit credentials and instruction sets for local model fine-tuning or backup.`
  },

  runtime: {
    id: "runtime",
    title: "Runtime Reference",
    subtitle: "LangGraph orchestration, GPU routing, and process isolation",
    category: "Infrastructure",
    content: `The Valdyum agent runtime runs entirely on your local machine. Nothing runs on Valdyum servers except the marketplace, API, and on-chain programs.

## Architecture

\`\`\`
LOCAL MACHINE
├── SUPERVISOR PROCESS (valdyum daemon)
│   ├── Process isolation per agent
│   ├── IPC signing server (private key never leaves supervisor)
│   ├── GPU detection and inference routing
│   └── TAPEDRIVE batch collector
└── AGENT PROCESS (isolated)
    ├── LangGraph orchestration loop
    ├── Strategy logic (your code)
    └── Tool calls → RPC, Jito, HTTP
\`\`\`

## LangGraph vs Async Python

| Aspect | LangGraph | async_python |
|--------|-----------|-------------|
| Best for | Multi-step reasoning | Simple strategy loops |
| Overhead | Higher — graph compilation | Minimal |
| Memory | Built-in state management | Manual |
| Debugging | Visual graph tracing | Standard Python |`
  },

  jito: {
    id: "jito",
    title: "Jito Integration",
    subtitle: "MEV bundle submission for arbitrage and MEV agents",
    category: "Infrastructure",
    content: `Requires \`jito_bundle\` capability in manifest.yaml.

## Configuration

\`\`\`bash
JITO_BLOCK_ENGINE_URL=https://mainnet.block-engine.jito.wtf
MEV_JITO_TIP=0.001
\`\`\`

## Building Bundles

\`\`\`python
@action(log_to_tapedrive=True)
async def execute_sandwich(self, opportunity) -> dict:
    frontrun_tx = await self.build_frontrun(opportunity)
    backrun_tx = await self.build_backrun(opportunity)
    tip_tx = self.jito.build_tip_transaction(
        tip_lamports=int(self.config.jito_tip * 1e9),
    )
    bundle = Bundle([frontrun_tx, target_tx, backrun_tx, tip_tx])
    result = await self.jito.submit_bundle(bundle)
    return {"status": "LANDED", "profit_sol": result.profit_sol}
\`\`\``
  },

  rpc: {
    id: "rpc",
    title: "RPC Configuration",
    subtitle: "Helius, Triton, and custom RPC endpoint setup",
    category: "Infrastructure",
    content: `## Default Setup

\`\`\`bash
VALDYUM_RPC_PRIMARY=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
VALDYUM_RPC_FAILOVER=https://your-rpc.rpcpool.com/YOUR_TRITON_KEY
VALDYUM_WS_PRIMARY=wss://mainnet.helius-rpc.com/?api-key=YOUR_KEY
\`\`\`

## Failover Behavior

Failover triggers when:
- Primary RPC returns 429 three times in 10 seconds
- Connection timeout > 5000ms
- Primary returns 5xx error

Behavior: Switch to failover immediately, retry primary every 30 seconds, switch back when healthy.`
  },

  security: {
    id: "security",
    title: "Security Model",
    subtitle: "Sandbox isolation, capability gating, and key management",
    category: "Infrastructure",
    content: `> Your private key NEVER enters the agent process. All signing is performed by the supervisor process after validating the request against the manifest capability list.

## Signing Flow

1. Agent process requests signature via IPC socket
2. Supervisor validates: Is capability declared? Does TX exceed limits? Is PID authorized?
3. If all checks pass: supervisor signs with stored key
4. If any check fails: returns error, logs security event

## Capability Enforcement

Capabilities in manifest.yaml are runtime enforced:
- **rpc_read:** Read methods allowed, write methods blocked without sign_transaction
- **sign_transaction:** Individual TX signing up to max_sol_per_tx
- **write_disk:** Only agent working directory, path traversal blocked
- **NOT declared → BLOCKED ENTIRELY**`
  },

  marketplace: {
    id: "marketplace",
    title: "Marketplace API",
    subtitle: "REST API for agent listings, purchases, and forks",
    category: "Reference",
    content: `## Base URL

\`\`\`
Mainnet: https://api.valdyum.io/v1
Devnet:  https://api-devnet.valdyum.io/v1
\`\`\`

## Endpoints

### GET /v1/agents
List marketplace agents with filtering.

| Param | Type | Description |
|-------|------|-------------|
| category | string | mev, arbitrage, mempool, liquidity, trading, data |
| verified | boolean | Only TAPEDRIVE-verified agents |
| sort | string | pnl, win_rate, forks, newest, price |
| limit | number | Max results (default: 20) |

### POST /v1/agents/{id}/purchase
Purchase an agent listing. Triggers on-chain payment.

### POST /v1/agents/{id}/fork
Fork an agent. Registers fork on-chain as child PDA.`
  },

  templates: {
    id: "templates",
    title: "Templates",
    subtitle: "Official agent templates and forking guide",
    category: "Reference",
    content: `## Official Templates

| Name | Category | Rating | Description |
|------|----------|--------|-------------|
| vulcan-mev-v1 | MEV | ★ 4.2 | Sandwich detection with Jito bundles |
| mercury-scan-v1 | Mempool | ★ 3.8 | Real-time mempool monitoring |
| diana-track-v1 | Data | ★ 4.0 | Whale wallet tracker |
| janus-arb-v1 | Arbitrage | ★ 3.5 | Cross-DEX arbitrage (Jupiter + Raydium) |
| minerva-lp-v1 | Liquidity | ★ 4.5 | LP monitoring for Orca, Raydium, Meteora |

## Directory Structure

\`\`\`
vulcan-mev-v1/
├── manifest.yaml
├── agent.py
├── strategy.py
├── requirements.txt
├── .env.example
├── tests/
└── README.md
\`\`\``
  },

  errors: {
    id: "errors",
    title: "Error Reference",
    subtitle: "All error codes, causes, and resolutions",
    category: "Reference",
    content: `## CLI Errors

| Code | Cause | Resolution |
|------|-------|------------|
| WALLET_NOT_CONNECTED | No wallet configured | Run: valdyum init |
| MANIFEST_INVALID | Schema validation failed | Run: valdyum validate |
| CAPABILITY_DENIED | Undeclared capability | Add to manifest.yaml |
| RPC_UNAVAILABLE | Both RPCs are down | Check .env endpoints |
| INSUFFICIENT_SOL | Low wallet balance | Fund wallet (~0.002 SOL) |
| BUNDLE_REJECTED | Jito rejected bundle | Increase jito_tip |

## API Errors

| Code | Status | Description |
|------|--------|-------------|
| 400 | Bad Request | Invalid parameters |
| 401 | Unauthorized | Missing/expired auth token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 429 | Rate Limited | See Retry-After header |`
  },

  changelog: {
    id: "changelog",
    title: "Changelog",
    subtitle: "Version history and migration guides",
    category: "Reference",
    content: `## v0.1.0 — Public Launch

### Added
- valdyum CLI — init, scaffold, dev, deploy, status, logs, publish, tapedrive
- Python SDK (valdyum-sdk) — BaseAgent, @action, LangGraph, 0x402 client
- JavaScript SDK (valdyum-js) — MarketplaceClient, WalletAuth, React hooks
- TAPEDRIVE protocol — Merkle root anchoring, Arweave upload, verification
- 0x402 payment protocol — autonomous HTTP micropayments
- Marketplace API — listings, purchases, forks, subscriptions
- Official templates: vulcan-mev-v1, mercury-scan-v1, diana-track-v1, janus-arb-v1, minerva-lp-v1
- Jito integration — bundle building, submission, simulation

## Roadmap

| Phase | Target | Scope |
|-------|--------|-------|
| v0.2.0 | Q3 2026 | Agent subscriptions, fork royalty streaming |
| v0.3.0 | Q4 2026 | Multi-chain support (Ethereum, Base) |
| v1.0.0 | Q1 2027 | AI/ML developer expansion |
| v2.0.0 | Q3 2027 | SaaS founder automation, visual builder |`
  },
};
