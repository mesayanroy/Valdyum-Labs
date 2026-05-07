/**
 * server/src/index.ts
 *
 * Express server entry point.
 * Mounts all API routes and starts the HTTP server.
 *
 * TODO: Convert each Next.js API route in routes/api/ to Express handlers
 *       and mount them here. For now this is the scaffold.
 */

import 'dotenv/config';
import express, { type Express } from 'express';
import cors from 'cors';

const app: Express = express();
const PORT = process.env.PORT || 4000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// ─── Middleware ────────────────────────────────────────────────────────────────

app.use(express.json());

app.use(cors({
  origin: CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: [
    'Content-Type',
    'X-Payment-Tx-Hash',
    'X-Payment-Wallet',
    'X-Payment-Required',
  ],
}));

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'valdyum-server',
    timestamp: new Date().toISOString(),
    facilitatorUrl: process.env.PAYAI_FACILITATOR_URL || 'https://facilitator.payai.network',
    chain: 'solana',
    cluster: process.env.SOLANA_CLUSTER || process.env.NEXT_PUBLIC_SOLANA_CLUSTER || 'testnet',
  });
});

import agentsRouter from './routes/agents';
import agentsDeployRouter from './routes/agents-deploy';
import ablyRouter from './routes/ably';
import dashboardRouter from './routes/dashboard';
import faucetRouter from './routes/faucet';
import paymentRouter from './routes/payment';
import clawcreditRouter from './routes/clawcredit';
import telemetryRouter from './routes/telemetry';
import workflowsRouter from './routes/workflows';

app.use('/api/agents', agentsDeployRouter);
app.use('/api/agents', agentsRouter);
app.use('/api/ably', ablyRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/faucet', faucetRouter);
app.use('/api/payment', paymentRouter);
app.use('/api/clawcredit', clawcreditRouter);
app.use('/api/telemetry', telemetryRouter);
app.use('/api/workflows', workflowsRouter);

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`🚀 Valdyum server running on http://localhost:${PORT}`);
  console.log(`   CORS origin: ${CLIENT_URL}`);
});

export default app;
