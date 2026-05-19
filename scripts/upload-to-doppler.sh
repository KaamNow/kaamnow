#!/bin/bash
# Run after: doppler login
# Usage: cd /path/to/kaamnow && bash scripts/upload-to-doppler.sh

set -e
PROJECT="kaamnow"
CONFIG="dev"

echo ""
echo "═══════════════════════════════════════════"
echo "  Uploading secrets to Doppler ($PROJECT/$CONFIG)"
echo "═══════════════════════════════════════════"

# Setup project + config (idempotent)
doppler setup --project $PROJECT --config $CONFIG --no-interactive 2>/dev/null || true

echo ""
echo "→ Core infrastructure..."
doppler secrets set \
  MONGO_URL="mongodb+srv://kaamnow-dev:KaamNowDev123@kaamnow-dev.p0wka3b.mongodb.net/?appName=KaamNow-Dev" \
  DB_NAME="kaamnow_dev" \
  JWT_SECRET="da4f8632f22bc9d2684d4e073b3dcfec4c269aa9ea717fa9c7a9fe045b30d508" \
  JWT_EXPIRY_DAYS="30" \
  CORS_ORIGINS="*" \
  --project $PROJECT --config $CONFIG

echo "→ Feature flags..."
doppler secrets set \
  SHOW_OTP_IN_RESPONSE="true" \
  FEATURE_AI="false" \
  FEATURE_CHAT="false" \
  FEATURE_PAYMENTS="false" \
  FEATURE_VOICE="false" \
  FEATURE_OTP_AUTH="true" \
  FEATURE_ENGAGEMENT_FLOW="true" \
  FEATURE_WHATSAPP_NOTIFICATIONS="false" \
  --project $PROJECT --config $CONFIG

echo "→ Admin credentials..."
doppler secrets set \
  ADMIN_EMAIL="admin@kaamnow.com" \
  ADMIN_PHONE="+919999999999" \
  ADMIN_PASSWORD="kaamnow-admin-2026" \
  ADMIN_BOOTSTRAP_SECRET="kaamnow-admin-2026" \
  --project $PROJECT --config $CONFIG

echo "→ Cloudinary (media storage)..."
doppler secrets set \
  CLOUDINARY_CLOUD_NAME="dztrzwvee" \
  CLOUDINARY_API_KEY="455385769148981" \
  CLOUDINARY_API_SECRET="KdYmM68W8Z3TlsGauG_iQTtdwfE" \
  --project $PROJECT --config $CONFIG

echo "→ Gupshup (WhatsApp OTP + notifications)..."
doppler secrets set \
  GUPSHUP_API_KEY="sk_376ba99b7f584e659b35f7cbf92d4286" \
  GUPSHUP_SOURCE="917834811114" \
  GUPSHUP_VERIFY_TOKEN="my_secure_token_123" \
  GUPSHUP_SANDBOX_MODE="true" \
  --project $PROJECT --config $CONFIG

echo "→ App config values..."
doppler secrets set \
  REFERRAL_REWARD_AMOUNT="100" \
  REFERRAL_BONUS_AMOUNT="50" \
  WALLET_CREDIT_EXPIRY_DAYS="90" \
  CHECKIN_RADIUS_KM="1.0" \
  AVAILABLE_NOW_HOURS="4" \
  MAX_PORTFOLIO_ITEMS="6" \
  MAX_CERTIFICATIONS="5" \
  MAX_UPLOAD_BYTES="5000000" \
  --project $PROJECT --config $CONFIG

echo ""
echo "═══════════════════════════════════════════"
echo "  ✅ All known secrets uploaded to Doppler!"
echo "═══════════════════════════════════════════"
echo ""
echo "Still needed (get free keys and add):"
echo ""
echo "  # AI (aistudio.google.com)"
echo "  doppler secrets set GEMINI_API_KEY='...' --project $PROJECT --config $CONFIG"
echo ""
echo "  # Voice transcription (console.groq.com)"
echo "  doppler secrets set GROQ_API_KEY='...' --project $PROJECT --config $CONFIG"
echo ""
echo "  # Error monitoring (sentry.io)"
echo "  doppler secrets set SENTRY_DSN='...' --project $PROJECT --config $CONFIG"
echo ""
echo "  # Analytics (posthog.com)"
echo "  doppler secrets set POSTHOG_API_KEY='...' --project $PROJECT --config $CONFIG"
echo ""
echo "Verify all secrets:"
echo "  doppler secrets --project $PROJECT --config $CONFIG"
