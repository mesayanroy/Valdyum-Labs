import { Keypair, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';

export async function buildValidationTransaction(
  deployer_wallet: string,
  agent_id: string,
  metadata_hash: string,
  price_lamports: number
) {
  // Construct a minimal placeholder "validation transaction" payload that the client
  // can sign. We keep the same response shape as the previous Solana implementation
  // so server routes don't need to change.
  const fakeTx = Buffer.from(`validate:${deployer_wallet}:${agent_id}:${metadata_hash}`).toString('base64');
  const validationFee = 0; // represent in smallest unit for compatibility
  const networkPassphrase = 'solana-testnet';

  return {
    xdr: fakeTx,
    validationFee,
    networkPassphrase,
  };
}

export async function buildConfirmationTransaction(signedValidation: string, confirmationFields: any) {
  const fakeTx = Buffer.from(`confirm:${signedValidation}`).toString('base64');
  return { xdr: fakeTx };
}

export async function logDeploymentEvent(event: string, agentId: string, wallet: string, meta?: any) {
  console.log(`[solana-deploy] ${event} ${agentId} ${wallet}`, meta || '');
}

export function validateWalletAddress(addr: string) {
  try {
    new PublicKey(addr);
    return true;
  } catch (e) {
    return false;
  }
}

export function validateAgentId(agentId: string) {
  return typeof agentId === 'string' && /^[A-Za-z0-9_]{1,32}$/.test(agentId);
}

export async function persistDeploymentToDatabase(...args: any[]) {
  // minimal placeholder; real implementation should use DB
  const payload = args.length === 1 ? args[0] : {
    deployer_wallet: args[0],
    agent_id: args[1],
    metadata_hash: args[2],
    price_sol: args[3],
    fee: args[4],
  };
  console.log('[persistDeploymentToDatabase]', payload);
  return { success: true, id: `${payload.agent_id}-${Date.now()}` };
}

export async function getDeploymentStatus(agentId: string) {
  return { status: 'unknown' };
}
