# Valdyum CLI

The Valdyum CLI provides full terminal access to all platform features.

## Installation

```bash
pnpm install
pnpm cli -- --help
# or build and install globally:
pnpm build && npm install -g .
```

## Terminal Workflow

### 1. Initialize a project

```bash
valdyum init my-agent
cd my-agent
cp .env.example .env
```

`valdyum init` creates the scaffold for agents, tasks, workflows, dashboard config, and docs.

### 2. Inspect agents

```bash
valdyum agents list
```

### 3. Run an agent with payment handling

```bash
valdyum agents run <agentId> \
  --input "Summarize today's market tape" \
  --secret $STELLAR_AGENT_SECRET
```

If the agent returns a 402 challenge, the CLI signs and submits the Solana payment, then retries the request automatically.

### 4. Watch the live dashboard

```bash
valdyum dash --interval 3000
```

The dashboard shows a terminal Polymarket-style view with prices, request stats, earnings, and recent activity.

### 5. Route agent-to-agent work

```bash
valdyum a2a call <fromAgentId> <toAgentId> \
  --input "Delegate: analyze the liquidity report" \
  --secret $STELLAR_AGENT_SECRET
```

### 6. Inspect payments

```bash
valdyum tx status <txHash>
valdyum tx inspect <txHash>
```

## Commands

### `valdyum init [projectName]`
Creates a new Valdyum project scaffold with folders and starter files for agents, tasks, workflows, dashboard config, and CLI docs:
```bash
valdyum init my-trading-agent
```
Creates:
- `my-trading-agent/agents/templates/` — starter agent templates
- `my-trading-agent/tasks/queued.json` — queued task list
- `my-trading-agent/tasks/completed.json` — completed task list
- `my-trading-agent/workflows/default.json` — workflow definition
- `my-trading-agent/config/agents.json` — agent registry config
- `my-trading-agent/config/dashboard.json` — terminal dashboard config
- `my-trading-agent/docs/CLI_GUIDE.md` — local CLI usage guide
- `my-trading-agent/.env.example` — environment template
- `my-trading-agent/.valdyum/dashboard.json` — terminal dashboard metadata

### `valdyum dash`
Opens the live terminal polymarket dashboard with:
- Real-time crypto market prices in green, yellow, red, blue, and white
- Active agent list with earnings
- Recent activity feed (via Ably)
- Simulated PnL tracking and request rates

```bash
valdyum dash --interval 5000  # refresh every 5s
```

### `valdyum agents list`
Lists all available agents with status, price, and stats.

### `valdyum agents run <agentId>`
Runs an agent with optional 0x402 Solana payment.

```bash
valdyum agents run mev_bot --input "Find MEV opportunities" --secret $STELLAR_SECRET
```

If the requested agent is paid, the CLI will:
1. Receive the 402 payment challenge.
2. Build and sign a Solana payment transaction.
3. Submit to RPC.
4. Retry the agent call with payment proof headers.

### `valdyum a2a call <fromAgentId> <toAgentId>`
Routes a request between two agents (multi-agent compose).

```bash
valdyum a2a call mev_bot trading_bot --input "Find and execute best opportunity" --secret $STELLAR_SECRET
```

### `valdyum tx status <txHash>`
Checks the status of a Solana transaction.

### `valdyum tx inspect <txHash>`
Shows full transaction details.

## Multi-Agent (A2A) Workflow

```bash
# Agent 1 analyzes → Agent 2 executes
valdyum a2a call arbitrage_tracker trading_bot \
  --input "Find triangular arbitrage for SOL/USDC/BTC then execute" \
  --secret $STELLAR_SECRET
```

## 0x402 Payment Protocol

When an agent requires payment:
1. CLI detects `payment_details` in the 402 response
2. Builds a Solana SOL payment transaction
3. Signs and submits to RPC
4. Retries the agent call with `X-Payment-Tx-Hash` header

If a faucet or payment step reports `invalid encoded string`, the wallet address is not a valid Solana public key. Use a Phantom address that starts with `G` and retry.

## Python LangGraph Templates

See `agents-sdk/templates/python/README.md` for LangGraph agent templates.

```bash
cd agents-sdk/templates/python
pip install -r requirements.txt
python mev_bot_agent.py
python arbitrage_tracker_agent.py
# etc.
```

## AF$ Token Faucet

Visit `/faucet` in the browser or use the API:
```bash
curl -X POST http://localhost:3000/api/faucet/claim \
  -H "Content-Type: application/json" \
  -d '{"walletAddress": "G..."}'
```

After a successful claim, use the Phantom token add prompt in the faucet UI if AF$ does not appear automatically in your wallet.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VALDYUM_API_URL` | Valdyum server URL (default: http://localhost:3000) |
| `STELLAR_AGENT_SECRET` | Solana secret key for payments |
| `QSTASH_TOKEN` | Upstash QStash token |
| `ABLY_API_KEY` | Ably server API key |
| `OPENAI_API_KEY` | OpenAI API key |
| `ANTHROPIC_API_KEY` | Anthropic API key |
