import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';

function getRpcConfig() {
  const cluster = process.env.NEXT_PUBLIC_SOLANA_CLUSTER || 'testnet';
  const rpcUrl =
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
    (cluster === 'mainnet-beta' ? 'https://api.mainnet-beta.solana.com' : 'https://api.testnet.solana.com');
  return { cluster, rpcUrl };
}

export async function fetchSolBalance(address: string): Promise<number> {
  const { rpcUrl } = getRpcConfig();
  const connection = new Connection(rpcUrl, 'confirmed');
  const pubkey = new PublicKey(address);
  const lamports = await connection.getBalance(pubkey, 'confirmed');
  return lamports / LAMPORTS_PER_SOL;
}

export function solanaClusterLabel(): string {
  return process.env.NEXT_PUBLIC_SOLANA_CLUSTER || 'testnet';
}
