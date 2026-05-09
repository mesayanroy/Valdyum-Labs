import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

const SOLANA_CLUSTER = process.env.NEXT_PUBLIC_SOLANA_CLUSTER || "testnet";
const SOLANA_RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL
  || (SOLANA_CLUSTER === "mainnet-beta" ? "https://api.mainnet-beta.solana.com" : "https://api.testnet.solana.com");

export function truncateAddress(address: string, chars = 4): string {
  if (!address || address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export async function getSolBalance(address: string): Promise<string> {
  try {
    const conn = new Connection(SOLANA_RPC_URL, "confirmed");
    const pk = new PublicKey(address);
    const lamports = await conn.getBalance(pk, "confirmed");
    return (lamports / LAMPORTS_PER_SOL).toFixed(6);
  } catch {
    return "0";
  }
}

export async function fundTestAccount(address: string): Promise<boolean> {
  try {
    const conn = new Connection(SOLANA_RPC_URL, "confirmed");
    const pk = new PublicKey(address);
    const sig = await conn.requestAirdrop(pk, 1 * LAMPORTS_PER_SOL);
    const latest = await conn.getLatestBlockhash();
    await conn.confirmTransaction({ signature: sig, ...latest }, "confirmed");
    return true;
  } catch {
    return false;
  }
}

export const fetchSolBalance = getSolBalance;

export const solanaClusterLabel = () => SOLANA_CLUSTER;
