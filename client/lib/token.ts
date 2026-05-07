const decimals = Number(process.env.NEXT_PUBLIC_VALD_TOKEN_DECIMALS || 9);

export const tokenConfig = {
  symbol: process.env.NEXT_PUBLIC_VALD_TOKEN_SYMBOL || 'SOL',
  name: process.env.NEXT_PUBLIC_VALD_TOKEN_NAME || 'Solana',
  mint: process.env.NEXT_PUBLIC_VALD_TOKEN_MINT || '',
  decimals,
  network: process.env.NEXT_PUBLIC_SOLANA_CLUSTER || 'testnet',
};

export function formatTokenAmount(amount: number): string {
  if (!Number.isFinite(amount)) return `0 ${tokenConfig.symbol}`;
  return `${amount.toFixed(4)} ${tokenConfig.symbol}`;
}
