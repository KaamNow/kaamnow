#!/bin/bash
# Run this once after logging into Doppler with your personal account:
#   doppler login
#   bash scripts/upload-to-doppler.sh

set -e
PROJECT="kaamnow"
CONFIG="dev"

echo "Uploading all secrets to Doppler ($PROJECT/$CONFIG)..."

doppler secrets set \
  MONGO_URL="mongodb+srv://kaamnow-dev:KaamNowDev123@kaamnow-dev.p0wka3b.mongodb.net/?appName=KaamNow-Dev" \
  DB_NAME="kaamnow_dev" \
  JWT_SECRET="da4f8632f22bc9d2684d4e073b3dcfec4c269aa9ea717fa9c7a9fe045b30d508" \
  JWT_EXPIRY_DAYS="30" \
  CORS_ORIGINS="*" \
  SHOW_OTP_IN_RESPONSE="true" \
  FEATURE_AI="false" \
  FEATURE_CHAT="false" \
  FEATURE_PAYMENTS="false" \
  FEATURE_VOICE="false" \
  FEATURE_OTP_AUTH="true" \
  FEATURE_ENGAGEMENT_FLOW="true" \
  FEATURE_WHATSAPP_NOTIFICATIONS="false" \
  ADMIN_PHONE="+919999999999" \
  ADMIN_PASSWORD="kaamnow-admin-2026" \
  ADMIN_BOOTSTRAP_SECRET="kaamnow-admin-2026" \
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
echo "✅ Core secrets uploaded!"
echo ""
echo "Now add these manually (get from each service):"
echo "  doppler secrets set GEMINI_API_KEY='...' --project $PROJECT --config $CONFIG"
echo "  doppler secrets set GROQ_API_KEY='...' --project $PROJECT --config $CONFIG"
echo "  doppler secrets set CLOUDINARY_CLOUD_NAME='...' --project $PROJECT --config $CONFIG"
echo "  doppler secrets set CLOUDINARY_API_KEY='...' --project $PROJECT --config $CONFIG"
echo "  doppler secrets set CLOUDINARY_API_SECRET='...' --project $PROJECT --config $CONFIG"
echo "  doppler secrets set GUPSHUP_API_KEY='...' --project $PROJECT --config $CONFIG"
echo "  doppler secrets set SENTRY_DSN='...' --project $PROJECT --config $CONFIG"
echo "  doppler secrets set POSTHOG_API_KEY='...' --project $PROJECT --config $CONFIG"
echo ""
echo "Get free keys from:"
echo "  Gemini:     aistudio.google.com"
echo "  Groq:       console.groq.com"
echo "  Sentry:     sentry.io (free tier)"
echo "  PostHog:    posthog.com (free tier)"
