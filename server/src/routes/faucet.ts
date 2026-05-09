import { Router, Request, Response } from 'express';
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import bs58 from 'bs58';
import Ably from 'ably';

const router: Router = Router();

const FAUCET_MAX_CLAIMS = 3;
const FAUCET_AMOUNT_SOL = 0.5;
const SOLANA_CLUSTER = process.env.NEXT_PUBLIC_SOLANA_CLUSTER || process.env.SOLANA_CLUSTER || 'testnet';
const SOLANA_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL
  || process.env.SOLANA_RPC_URL
  || (SOLANA_CLUSTER === 'mainnet-beta' ? 'https://api.mainnet-beta.solana.com' : 'https://api.testnet.solana.com');

async function pushFaucetActivity(wallet: string, amount: number): Promise<void> {
  const key = process.env.ABLY_API_KEY;
  if (!key) return;
  try {
    const ably = new Ably.Rest({ key });
    await ably.channels.get('marketplace').publish('new_agent', {
      eventType: 'new_agent',
      agentId: 'faucet',
      agentName: 'AF$ Faucet',
      ownerWallet: wallet,
      callerWallet: wallet,
      priceSol: amount,
      timestamp: new Date().toISOString(),
    });
  } catch { /* ignore */ }
}

function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

function parseSolanaSecret(secret: string): Keypair | null {
  try {
    if (secret.trim().startsWith('[')) {
      const arr = JSON.parse(secret) as number[];
      return Keypair.fromSecretKey(Uint8Array.from(arr));
    }
    return Keypair.fromSecretKey(bs58.decode(secret.trim()));
  } catch {
    return null;
  }
}

router.get('/claims', async (req: Request, res: Response) => {
  const wallet = req.query.wallet as string;
  if (!wallet || wallet.length < 32) {
    res.status(400).json({ error: 'Invalid wallet address' });
    return;
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data, error } = await supabase
        .from('faucet_claims')
        .select('claims_count')
        .eq('wallet_address', wallet)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.warn('[faucet/claims] DB error:', error);
      }

      const claimed = data?.claims_count ?? 0;
      res.json({
        claimsRemaining: Math.max(0, FAUCET_MAX_CLAIMS - claimed),
        totalClaimed: claimed,
        wallet,
      });
      return;
    }

    res.json({
      claimsRemaining: FAUCET_MAX_CLAIMS,
      totalClaimed: 0,
      wallet,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post('/claim', async (req: Request, res: Response) => {
  const body = req.body || {};
  const walletAddress = typeof body.walletAddress === 'string' ? body.walletAddress.trim() : '';

  if (!walletAddress || !isValidSolanaAddress(walletAddress)) {
    res.status(400).json({ error: 'Invalid Solana wallet address.' });
    return;
  }

  const faucetSecret = process.env.SOLANA_FAUCET_SECRET || process.env.SOLANA_AGENT_SECRET || '';
  const faucetKeypair = parseSolanaSecret(faucetSecret);
  if (!faucetSecret || !faucetKeypair) {
    res.status(503).json({ error: 'Faucet not configured. Set SOLANA_FAUCET_SECRET (base58 or JSON array secret key).' });
    return;
  }

  // Check & update claims in Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let currentClaims = 0;

  if (supabaseUrl && supabaseKey) {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data } = await supabase
      .from('faucet_claims')
      .select('claims_count')
      .eq('wallet_address', walletAddress)
      .single();

    currentClaims = data?.claims_count ?? 0;
    if (currentClaims >= FAUCET_MAX_CLAIMS) {
      res.status(429).json({ error: 'Faucet claim limit reached (max 3 claims per wallet)' });
      return;
    }
  }

  // Send SOL via Solana
  try {
    const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    const tx = new Transaction({ feePayer: faucetKeypair.publicKey, recentBlockhash: blockhash }).add(
      SystemProgram.transfer({
        fromPubkey: faucetKeypair.publicKey,
        toPubkey: new PublicKey(walletAddress),
        lamports: Math.round(FAUCET_AMOUNT_SOL * LAMPORTS_PER_SOL),
      })
    );

    tx.sign(faucetKeypair);
    const txHash = await connection.sendRawTransaction(tx.serialize());
    await connection.confirmTransaction({ signature: txHash, blockhash, lastValidBlockHeight }, 'confirmed');

    // Update claims in Supabase
    if (supabaseUrl && supabaseKey) {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, supabaseKey);
      await supabase.from('faucet_claims').upsert({
        wallet_address: walletAddress,
        claims_count: currentClaims + 1,
        last_claim_at: new Date().toISOString(),
        total_received_xlm: (currentClaims + 1) * FAUCET_AMOUNT_SOL,
      }, { onConflict: 'wallet_address' });
    }

    await pushFaucetActivity(walletAddress, FAUCET_AMOUNT_SOL);

    res.json({
      txHash,
      claimsRemaining: Math.max(0, FAUCET_MAX_CLAIMS - (currentClaims + 1)),
      amountXlm: FAUCET_AMOUNT_SOL,
      tokenContractId: process.env.NEXT_PUBLIC_AF_TOKEN_CONTRACT_ID || '',
      explorerUrl: `https://explorer.solana.com/tx/${txHash}?cluster=${SOLANA_CLUSTER}`,
    });
  } catch (err) {
    console.error('[faucet/claim] Error:', err);
    res.status(500).json({ error: `Faucet transaction failed: ${String(err)}` });
  }
});

export default router;
