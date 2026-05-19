#!/bin/bash
# KaamNow — Fly.io First-Time Setup
# Run once: bash scripts/setup-flyio.sh

set -e

echo ""
echo "═══════════════════════════════════════════"
echo "  KaamNow — Fly.io Setup (Free Dev Server)"
echo "═══════════════════════════════════════════"
echo ""

# 1. Install flyctl
if ! command -v flyctl &> /dev/null; then
  echo "Installing flyctl..."
  if [[ "$OSTYPE" == "darwin"* ]]; then
    brew install flyctl
  else
    curl -L https://fly.io/install.sh | sh
    export FLYCTL_INSTALL="/home/$USER/.fly"
    export PATH="$FLYCTL_INSTALL/bin:$PATH"
  fi
fi
echo "✅ flyctl $(flyctl version --client | head -1)"

# 2. Login
echo ""
echo "Logging into Fly.io..."
echo "→ Go to fly.io → Sign up (GitHub login, no credit card for dev)"
flyctl auth login

# 3. Create app (first time only)
echo ""
echo "Creating Fly.io app..."
flyctl apps create kaamnow-dev --machines 2>/dev/null || echo "  App already exists"

# 4. Push secrets from Doppler
echo ""
echo "Syncing secrets from Doppler → Fly.io..."
if command -v doppler &> /dev/null; then
  doppler secrets download \
    --project kaamnow \
    --config dev \
    --no-file \
    --format env | flyctl secrets import --app kaamnow-dev
  echo "✅ Secrets synced from Doppler"
else
  echo "⚠️  Doppler not set up. Run scripts/setup-doppler.sh first"
  echo "   Or manually: flyctl secrets set KEY=value --app kaamnow-dev"
fi

# 5. First deploy
echo ""
echo "Deploying to Fly.io (Mumbai region)..."
flyctl deploy --app kaamnow-dev

# 6. Get URL
echo ""
APP_URL=$(flyctl status --app kaamnow-dev --json | python3 -c "import sys,json; d=json.load(sys.stdin); print('https://' + d.get('Hostname','kaamnow-dev.fly.dev'))")
echo "═══════════════════════════════════════════"
echo "  ✅ Deployed!"
echo ""
echo "  API URL: $APP_URL"
echo "  Health:  $APP_URL/api/stats"
echo ""
echo "  Add this to GitHub Secrets:"
echo "  DEV_API_URL=$APP_URL"
echo "  FLY_API_TOKEN=$(flyctl auth token)"
echo "═══════════════════════════════════════════"
echo ""
