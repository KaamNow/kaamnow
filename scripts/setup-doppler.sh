#!/bin/bash
# KaamNow — Doppler Setup Script
# Run once on a new machine: bash scripts/setup-doppler.sh

set -e

echo ""
echo "═══════════════════════════════════════════"
echo "  KaamNow — Doppler Setup"
echo "═══════════════════════════════════════════"
echo ""

# 1. Install Doppler CLI
if ! command -v doppler &> /dev/null; then
  echo "Installing Doppler CLI..."
  if [[ "$OSTYPE" == "darwin"* ]]; then
    brew install dopplerhq/cli/doppler
  else
    curl -sLf --retry 3 --tlsv1.2 --proto "=https" \
      'https://packages.doppler.com/public/cli/gpg.DE2A7741A397C129.key' \
      | sudo gpg --dearmor -o /usr/share/keyrings/doppler-archive-keyring.gpg
    echo "deb [signed-by=/usr/share/keyrings/doppler-archive-keyring.gpg] \
      https://packages.doppler.com/public/cli/deb/debian any-version main" \
      | sudo tee /etc/apt/sources.list.d/doppler-cli.list
    sudo apt-get update && sudo apt-get install doppler
  fi
  echo "✅ Doppler CLI installed"
else
  echo "✅ Doppler CLI already installed ($(doppler --version))"
fi

# 2. Login
echo ""
echo "Logging into Doppler..."
doppler login

# 3. Setup project
echo ""
echo "Setting up kaamnow project (dev config)..."
doppler setup --project kaamnow --config dev

# 4. Verify
echo ""
echo "Verifying secrets..."
doppler secrets --only-names

echo ""
echo "═══════════════════════════════════════════"
echo "  ✅ Doppler ready!"
echo ""
echo "  Run backend: make dev-backend"
echo "  (uses: doppler run -- uvicorn backend.app:app --reload)"
echo "═══════════════════════════════════════════"
echo ""
