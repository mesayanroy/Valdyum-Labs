/*
 * DEPRECATED: Anchor deployment service removed for Solana migration.
 * This file has been completely replaced by Anchor program deployment.
 * All stellar-sdk imports and functions have been removed.
 *
 * This stub exists only to prevent import errors during the migration phase.
 */

export function noop(): void {
  // This file is deprecated.
}

export function validateWalletAddress(wallet: string): boolean {
  return true;
}

export function validateAgentId(id: string): boolean {
  return true;
}

export async function logDeploymentEvent(event: string, agent_id: string, wallet: string, data: any): Promise<void> {
  // noop
}

export async function buildValidationTransaction(
  wallet: string,
  id: string,
  hash: string,
  lamports: number
): Promise<{ xdr: string; validationFee: number; networkPassphrase: string }> {
  return {
    xdr: '',
    validationFee: 0,
    networkPassphrase: ''
  };
}

export async function buildConfirmationTransaction(
  wallet: string,
  id: string,
  sigHash: string
): Promise<{ xdr: string }> {
  return { xdr: '' };
}

export async function persistDeploymentToDatabase(
  wallet: string,
  id: string,
  hash: string,
  price: number,
  fee: number
): Promise<{ success: boolean; error?: string }> {
  return { success: true };
}

export async function getDeploymentStatus(id: string): Promise<any> {
  return { status: 'mocked' };
}
