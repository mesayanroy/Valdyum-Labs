import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AgentRegistry } from "../target/types/agent_registry";

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.AgentRegistry as Program<AgentRegistry>;
  
  // Create a new config account
  const configKeypair = anchor.web3.Keypair.generate();
  const validator = provider.wallet.publicKey;

  console.log("Initializing Registry...");
  console.log("Config Account:", configKeypair.publicKey.toString());
  console.log("Validator:", validator.toString());

  try {
    const tx = await program.methods
      .initialize(validator)
      .accounts({
        admin: provider.wallet.publicKey,
        config: configKeypair.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([configKeypair])
      .rpc();

    console.log("Initialization successful! TX:", tx);
    console.log("\nIMPORTANT: Add this to your .env:");
    console.log(`NEXT_PUBLIC_SOLANA_CONFIG_ID=${configKeypair.publicKey.toString()}`);
  } catch (err) {
    console.error("Initialization failed:", err);
  }
}

main();
