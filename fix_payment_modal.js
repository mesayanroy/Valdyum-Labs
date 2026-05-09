const fs = require('fs');
const file = 'c:/Users/SAYAN/Valdyum-Labs-1/client/components/PaymentModal.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace function
const oldFunc = /async function buildAndSendSolanaTransfer\([\s\S]*?return \{ txHash, sender \};\s*\}/;
const newFunc = `async function buildAndSendAnchorPayment(
  agentId: string,
  amountSol: number
): Promise<{ txHash: string; sender: string }> {
  const provider = getPhantomProvider();
  if (!provider?.isPhantom) throw new Error('Phantom wallet not found');
  await provider.connect();
  const sender = provider.publicKey?.toString();
  const cluster = process.env.NEXT_PUBLIC_SOLANA_CLUSTER || 'testnet';
  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || (cluster === 'mainnet-beta' ? 'https://api.mainnet-beta.solana.com' : 'https://api.testnet.solana.com');
  const connection = new (require('@solana/web3.js').Connection)(rpcUrl, 'confirmed');
  const program = require('@/lib/anchor_program').getProgram(connection, provider);
  const feeLamports = Math.round(amountSol * require('@solana/web3.js').LAMPORTS_PER_SOL);
  const txHash = await program.methods.recordPayment(new (program as any).anchor.BN(feeLamports)).accounts({
    payer: new (require('@solana/web3.js').PublicKey)(sender),
    agent: new (require('@solana/web3.js').PublicKey)(agentId),
  }).rpc();
  return { txHash, sender: sender };
}`;

content = content.replace(oldFunc, newFunc);
content = content.replace('buildAndSendSolanaTransfer(ownerAddress, priceSol)', 'buildAndSendAnchorPayment(agentId, priceSol)');
content = content.replace('Payment Required', 'Decree of Payment');
content = content.replace('402 — Pay-per-request via Solana', '402 — Pay-per-request via Senatus Ledger');
content = content.replace('rounded-2xl border border-[rgba(0,255,229,0.2)] bg-[#0a0a10]', 'rounded-3xl border border-[rgba(212,175,55,0.3)] bg-[#120b07]');
content = content.replace('bg-[#00FFE5]', 'bg-[#d4af37]');
content = content.replace('hover:bg-[#00e6ce]', 'hover:bg-[#c69b2f]');
content = content.replace('font-syne text-xl', 'font-cinzel text-xl');

fs.writeFileSync(file, content);
