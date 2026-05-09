import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider, Idl, BN } from '@project-serum/anchor';

const REGISTRY_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_SOLANA_CONTRACT_ID || '6tpsQxcZaHaj8zJsRv5tHWCpeQ2HT7bBrxC3y4MCaRCi'
);

const VALIDATOR_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_VALIDATOR_CONTRACT_ID || '4SKv6QGeWdHz8mQCmZB344epAvpoMG4R7EPeRM84sdmU'
);

const REGISTRY_IDL: Idl = {
  version: "0.1.0",
  name: "agent_registry",
  instructions: [
    {
      name: "register_agent",
      accounts: [
        { name: "caller", isMut: true, isSigner: true },
        { name: "config", isMut: true, isSigner: false },
        { name: "agent", isMut: true, isSigner: true },
        { name: "system_program", isMut: false, isSigner: false },
      ],
      args: [
        { name: "owner", type: "publicKey" },
        { name: "agent_id", type: "string" },
        { name: "price_lamports", type: "i64" },
        { name: "metadata_hash", type: "string" },
      ],
    },
    {
      name: "fork_agent",
      accounts: [
        { name: "forker", isMut: true, isSigner: true },
        { name: "source_agent", isMut: true, isSigner: false },
        { name: "source_owner", isMut: true, isSigner: false },
        { name: "new_agent", isMut: true, isSigner: true },
        { name: "system_program", isMut: false, isSigner: false },
      ],
      args: [
        { name: "new_agent_id", type: "string" },
        { name: "fork_fee_lamports", type: "i64" },
        { name: "metadata_hash", type: "string" },
      ],
    },
    {
      name: "record_payment",
      accounts: [
        { name: "payer", isMut: true, isSigner: true },
        { name: "agent", isMut: true, isSigner: false },
      ],
      args: [
        { name: "amount_lamports", type: "i64" },
      ],
    },
  ],
  accounts: [
    {
      name: "AgentRecord",
      type: {
        kind: "struct",
        fields: [
          { name: "owner", type: "publicKey" },
          { name: "agent_id", type: "string" },
          { name: "price_lamports", type: "i64" },
          { name: "request_count", type: "u64" },
          { name: "is_active", type: "bool" },
          { name: "metadata_hash", type: "string" },
          { name: "registered_slot", type: "u64" },
          { name: "total_earnings_lamports", type: "i64" },
          { name: "is_workflow", type: "bool" },
          { name: "version", type: "u64" },
        ],
      },
    },
  ],
};

const VALIDATOR_IDL: Idl = {
  version: "0.1.0",
  name: "agent_validator",
  instructions: [
    {
      name: "request_deploy",
      accounts: [
        { name: "deployer", isMut: true, isSigner: true },
        { name: "config", isMut: true, isSigner: false },
        { name: "pending", isMut: true, isSigner: true },
        { name: "system_program", isMut: false, isSigner: false },
      ],
      args: [
        { name: "agent_id", type: "string" },
        { name: "metadata_hash", type: "string" },
        { name: "price_lamports", type: "i64" },
      ],
    },
  ],
};

export function getProgram(connection: Connection, wallet: any) {
  const provider = new AnchorProvider(connection, wallet, {
    preflightCommitment: 'confirmed',
  });
  return new Program(REGISTRY_IDL, REGISTRY_PROGRAM_ID, provider);
}

export function getValidatorProgram(connection: Connection, wallet: any) {
  const provider = new AnchorProvider(connection, wallet, {
    preflightCommitment: 'confirmed',
  });
  return new Program(VALIDATOR_IDL, VALIDATOR_PROGRAM_ID, provider);
}

export { REGISTRY_PROGRAM_ID as PROGRAM_ID, VALIDATOR_PROGRAM_ID, BN };
