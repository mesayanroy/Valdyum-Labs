const fs = require('fs');
const file = 'c:/Users/SAYAN/Valdyum-Labs-1/client/components/PaymentModal.tsx';
let content = fs.readFileSync(file, 'utf8');

const newCode = `import { getProgram, BN } from '@/lib/anchor_program';

function getPhantomProvider(): PhantomProvider | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.phantom?.solana || window.solana;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentId: string;
  agentName: string;
  priceSol: number;
  ownerAddress: string;
  paymentMemo: string;
  onPaymentSuccess: (txHash: string, signerWallet: string) => void;
}

type PaymentStep = 'idle' | 'checking_wallet' | 'building_tx' | 'signing' | 'submitting' | 'confirming' | 'done' | 'error';

const STEP_LABELS: Record<PaymentStep, string> = {
  idle: 'Sign & Pay',
  checking_wallet: 'Checking wallet...',
  building_tx: 'Building transaction...',
  signing: 'Sign in Phantom...',
  submitting: 'Submitting to Solana...',
  confirming: 'Confirming on ledger...',
  done: 'Done!',
  error: 'Retry',
};

function extractChainError(err: unknown): string {
  if (!err) return 'Unknown error';
  const msg = String(err);
  if (msg.toLowerCase().includes('phantom')) {
    return msg;
  }
  return msg.startsWith('Error:') ? msg.slice(7).trim() : msg;
}

async function waitForLedgerConfirmation(
  connection: Connection,
  txHash: string,
  timeoutMs = 30_000
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const status = await connection.getSignatureStatus(txHash);
      if (status.value?.confirmationStatus === 'confirmed' || status.value?.confirmationStatus === 'finalized') {
        return;
      }
    } catch {
      // wait and retry
    }
    await new Promise((r) => setTimeout(r, 2_000));
  }
}

async function buildAndSendAnchorPayment(
  agentId: string,
  amountSol: number
): Promise<{ txHash: string; sender: string }> {
  const provider = getPhantomProvider();

  if (!provider?.isPhantom) {
    throw new Error('Phantom wallet not found');
  }

  await provider.connect();
  const sender = provider.publicKey?.toString();
  if (!sender) {
    throw new Error('Could not read connected wallet public key');
  }

  const cluster = process.env.NEXT_PUBLIC_SOLANA_CLUSTER || 'testnet';
  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL
    || (cluster === 'mainnet-beta' ? 'https://api.mainnet-beta.solana.com' : 'https://api.testnet.solana.com');
  const connection = new Connection(rpcUrl, 'confirmed');

  const program = getProgram(connection, provider);
  const feeLamports = Math.round(amountSol * LAMPORTS_PER_SOL);

  const txHash = await program.methods
    .recordPayment(new BN(feeLamports))
    .accounts({
      payer: new PublicKey(sender),
      agent: new PublicKey(agentId),
    })
    .rpc();

  return { txHash, sender: sender! };
}`;

// Find the start of the imports we want to replace
const startMarker = 'import { getProgram }';
const endMarker = 'return { txHash, sender: sender };\n}';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker) + endMarker.length;

if (startIndex !== -1 && endIndex !== -1) {
    content = content.slice(0, startIndex) + newCode + content.slice(endIndex);
    fs.writeFileSync(file, content);
    console.log('Successfully updated PaymentModal.tsx');
} else {
    console.error('Markers not found', { startIndex, endIndex });
}
