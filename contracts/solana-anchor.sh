#!/bin/bash

# Valdyum Solana/Anchor Deployment Script

set -euo pipefail

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }

log_step() {
  echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${YELLOW}▶${NC} $1"
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

# Prerequisites
check_anchor() {
  if ! command -v anchor &> /dev/null; then
    log_error "Anchor CLI not found! Install from https://www.anchor-lang.com/docs/installation"
    exit 1
  fi
  log_success "Anchor CLI found: $(anchor --version)"
}

# Build and Deploy
deploy_contracts() {
  log_step "Building and Deploying Anchor Programs"
  
  anchor build
  
  # Get Program ID from Target/deploy
  log_info "Deploying to Solana Testnet/Devnet..."
  anchor deploy
  
  # Extract IDs
  PROGRAM_ID=$(anchor keys list | grep "agent_registry" | awk '{print $2}')
  log_success "Deployment Complete!"
  log_info "Program ID: $PROGRAM_ID"
  
  # Initialize the program (create the config account)
  log_step "Initializing Program"
  # We use the current wallet as the validator for the registry
  WALLET_PUBKEY=$(solana address)
  log_info "Using $WALLET_PUBKEY as initial validator"
  
  # Note: This requires a script in Anchor.toml or a ts script
  # For now, we'll suggest the user runs the init command if we can't automate it here
  log_info "Run: anchor run initialize -- $WALLET_PUBKEY"
  
  update_env "$PROGRAM_ID"
}

update_env() {
  local program_id=$1
  local env_file=".env.local"
  
  log_step "Updating $env_file"
  
  if [ ! -f "$env_file" ]; then
    cp .env.example "$env_file"
  fi
  
  # Update Program ID
  sed -i "s/^NEXT_PUBLIC_SOLANA_CONTRACT_ID=.*/NEXT_PUBLIC_SOLANA_CONTRACT_ID=$program_id/" "$env_file"
  
  log_success "Updated $env_file with $program_id"
}

main() {
  check_anchor
  deploy_contracts
}

main "$@"
