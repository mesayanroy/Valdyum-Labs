use anchor_lang::prelude::*;

declare_id!("6tpsQxcZaHaj8zJsRv5tHWCpeQ2HT7bBrxC3y4MCaRCi");

#[program]
pub mod agent_registry {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, validator: Pubkey) -> Result<()> {
        let cfg = &mut ctx.accounts.config;
        cfg.admin = ctx.accounts.admin.key();
        cfg.validator = validator;
        Ok(())
    }

    pub fn register_agent(
        ctx: Context<RegisterAgent>,
        owner: Pubkey,
        agent_id: String,
        price_lamports: i64,
        metadata_hash: String,
    ) -> Result<()> {
        require!(
            ctx.accounts.caller.key() == ctx.accounts.config.validator,
            RegistryError::UnauthorizedValidator
        );
        require!(price_lamports >= 0, RegistryError::InvalidPrice);

        let agent = &mut ctx.accounts.agent;
        agent.owner = owner;
        agent.agent_id = agent_id;
        agent.price_lamports = price_lamports;
        agent.request_count = 0;
        agent.is_active = true;
        agent.metadata_hash = metadata_hash;
        agent.registered_slot = Clock::get()?.slot;
        agent.total_earnings_lamports = 0;
        agent.is_workflow = false;
        agent.version = 1;
        Ok(())
    }

    pub fn register_workflow(
        ctx: Context<RegisterWorkflow>,
        owner: Pubkey,
        workflow_id: String,
        price_lamports: i64,
        dag_hash: String,
    ) -> Result<()> {
        require!(price_lamports >= 0, RegistryError::InvalidPrice);

        let agent = &mut ctx.accounts.workflow;
        agent.owner = owner;
        agent.agent_id = workflow_id; // Reuse field
        agent.price_lamports = price_lamports;
        agent.request_count = 0;
        agent.is_active = true;
        agent.metadata_hash = dag_hash; // Reuse field
        agent.registered_slot = Clock::get()?.slot;
        agent.total_earnings_lamports = 0;
        agent.is_workflow = true;
        agent.version = 1;
        Ok(())
    }

    pub fn record_payment(ctx: Context<RecordPayment>, amount_lamports: i64) -> Result<()> {
        require!(amount_lamports > 0, RegistryError::InvalidPayment);
        let agent = &mut ctx.accounts.agent;
        require!(agent.is_active, RegistryError::AgentInactive);
        require!(
            amount_lamports >= agent.price_lamports,
            RegistryError::InsufficientPayment
        );

        agent.request_count = agent.request_count.saturating_add(1);
        agent.total_earnings_lamports = agent
            .total_earnings_lamports
            .saturating_add(amount_lamports);
        Ok(())
    }

    pub fn fork_agent(
        ctx: Context<ForkAgent>,
        new_agent_id: String,
        fork_fee_lamports: i64,
        metadata_hash: String,
    ) -> Result<()> {
        let source_agent = &ctx.accounts.source_agent;
        require!(source_agent.is_active, RegistryError::AgentInactive);
        
        // Transfer fee to source owner
        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.forker.key(),
            &source_agent.owner,
            fork_fee_lamports as u64,
        );
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.forker.to_account_info(),
                ctx.accounts.source_owner.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        let new_agent = &mut ctx.accounts.new_agent;
        new_agent.owner = ctx.accounts.forker.key();
        new_agent.agent_id = new_agent_id;
        new_agent.price_lamports = source_agent.price_lamports;
        new_agent.request_count = 0;
        new_agent.is_active = true;
        new_agent.metadata_hash = metadata_hash;
        new_agent.registered_slot = Clock::get()?.slot;
        new_agent.total_earnings_lamports = 0;
        new_agent.is_workflow = false;
        new_agent.version = 1;
        Ok(())
    }

    pub fn deactivate_agent(ctx: Context<DeactivateAgent>) -> Result<()> {
        require!(
            ctx.accounts.admin.key() == ctx.accounts.config.admin,
            RegistryError::UnauthorizedAdmin
        );
        let agent = &mut ctx.accounts.agent;
        require!(agent.is_active, RegistryError::AgentAlreadyInactive);
        agent.is_active = false;
        Ok(())
    }
}

const LAMPORTS_PER_SOL_I64: i64 = 1_000_000_000;

#[account]
pub struct RegistryConfig {
    pub admin: Pubkey,
    pub validator: Pubkey,
}

#[account]
pub struct AgentRecord {
    pub owner: Pubkey,
    pub agent_id: String,
    pub price_lamports: i64,
    pub request_count: u64,
    pub is_active: bool,
    pub metadata_hash: String,
    pub registered_slot: u64,
    pub total_earnings_lamports: i64,
    pub is_workflow: bool,
    pub version: u64,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(init, payer = admin, space = 8 + 32 + 32)]
    pub config: Account<'info, RegistryConfig>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(owner: Pubkey, agent_id: String, price_lamports: i64, metadata_hash: String)]
pub struct RegisterAgent<'info> {
    #[account(mut)]
    pub caller: Signer<'info>,
    #[account(mut)]
    pub config: Account<'info, RegistryConfig>,
    #[account(
        init,
        payer = caller,
        space = 8 + 32 + 4 + 64 + 8 + 8 + 1 + 4 + 128 + 8 + 8 + 1 + 8
    )]
    pub agent: Account<'info, AgentRecord>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(owner: Pubkey, workflow_id: String, price_lamports: i64, dag_hash: String)]
pub struct RegisterWorkflow<'info> {
    #[account(mut)]
    pub caller: Signer<'info>,
    #[account(
        init,
        payer = caller,
        space = 8 + 32 + 4 + 64 + 8 + 8 + 1 + 4 + 128 + 8 + 8 + 1 + 8
    )]
    pub workflow: Account<'info, AgentRecord>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RecordPayment<'info> {
    pub payer: Signer<'info>,
    #[account(mut)]
    pub agent: Account<'info, AgentRecord>,
}

#[derive(Accounts)]
#[instruction(new_agent_id: String, fork_fee_lamports: i64, metadata_hash: String)]
pub struct ForkAgent<'info> {
    #[account(mut)]
    pub forker: Signer<'info>,
    #[account(mut)]
    pub source_agent: Account<'info, AgentRecord>,
    /// CHECK: This is the owner of the source agent who receives the fork fee
    #[account(mut)]
    pub source_owner: AccountInfo<'info>,
    #[account(
        init,
        payer = forker,
        space = 8 + 32 + 4 + 64 + 8 + 8 + 1 + 4 + 128 + 8 + 8 + 1 + 8
    )]
    pub new_agent: Account<'info, AgentRecord>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DeactivateAgent<'info> {
    pub admin: Signer<'info>,
    pub config: Account<'info, RegistryConfig>,
    #[account(mut)]
    pub agent: Account<'info, AgentRecord>,
}

#[error_code]
pub enum RegistryError {
    #[msg("Only configured validator can register agents")]
    UnauthorizedValidator,
    #[msg("Only admin can perform this action")]
    UnauthorizedAdmin,
    #[msg("Price must be non-negative")]
    InvalidPrice,
    #[msg("Payment amount invalid")]
    InvalidPayment,
    #[msg("Agent is inactive")]
    AgentInactive,
    #[msg("Insufficient payment")]
    InsufficientPayment,
    #[msg("Agent already inactive")]
    AgentAlreadyInactive,
}
