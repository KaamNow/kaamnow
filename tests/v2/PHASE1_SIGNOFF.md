## Phase 1 Sign-Off — Foundation

Date: 2026-05-20
Signed off by: Codex

### 1. Deleted Files Proof

`git status --short` shows no deleted files. Phase 1 changed/added only backend, env, migration, and test sign-off files.

Changed/added files:

```text
.env.dev
backend/app.py
backend/auth.py
backend/config.py
backend/db.py
backend/engagements.py
backend/i18n/__init__.py
backend/i18n/bho.py
backend/i18n/en.py
backend/i18n/hi.py
backend/i18n/mai.py
backend/pdf_service.py
backend/qr_service.py
backend/requirements.txt
backend/routers/__init__.py
backend/routers/admin.py
backend/routers/auth.py
backend/routers/chat.py
backend/routers/engagements.py
backend/routers/faq.py
backend/routers/jobs.py
backend/routers/legal.py
backend/routers/referrals.py
backend/routers/reports.py
backend/routers/wallet.py
backend/routers/workers.py
backend/schemas.py
backend/security.py
scripts/migrate_dev_schema_phase1.py
tests/v2/test_phase1_foundation.py
tests/v2/PHASE1_SIGNOFF.md
tests/v2/PHASE2_SIGNOFF.md
tests/v2/PHASE3_SIGNOFF.md
tests/v2/PHASE4_SIGNOFF.md
```

### 2. MongoDB Indexes

Read-only dev DB evidence from `kaamnow`:

```text
users:
['_id_', 'phone_primary_1', 'referral_code_1', 'is_worker_1_is_customer_1']

workers:
['_id_', 'user_id_1', 'skills_1', 'structured_skills.skill_1', 'address.pincode_1',
 'availability_status_1_available_1', 'is_available_now_1_available_now_expires_at_1']

jobs:
['_id_', 'customer_id_1', 'status_1', 'address.pincode_1', 'required_skills.skill_1',
 'is_template_1_customer_id_1']
```

Additional Phase 1 indexes were created for `engagements`, `messages`, `reports`, `payments`,
`wallet_transactions`, `worker_waitlist`, `faqs`, and `legal_docs`.

### 3. Schema Sample Documents

Read-only dev DB sample:

```text
users: role='user', is_worker=True, is_customer=True, has_worker_profile=True,
referral_code present, saved_workers=[], saved_addresses=[], wallet_balance=0,
selfie_verified=False, tc_version='1.0'

workers: certifications=[], portfolio=[], response_time_minutes=None,
available_from=None, team_size=1, kyc_status='not_started', video_url=None,
is_available_now=False, skill_badges=[], profile_complete=False

faqs: faq_general_1 active with EN + HI copy
legal_docs: terms_v1 current, version 1.0

Empty but created collections:
jobs, messages, reports, payments, wallet_transactions, worker_waitlist
```

### 4. Doppler Setup

Command attempted:

```text
doppler secrets --only-names
```

Result:

```text
Token not found in system keyring
Doppler Error: secret not found in keyring
```

Local `.env.dev` now contains the Phase 1 key names with the approved dev MongoDB URI and safe defaults.

### 5. pytest Results

Command:

```text
pytest tests/ -v --tb=short
```

Result:

```text
collected 5 items

tests/v2/test_phase1_foundation.py::test_signup_no_role PASSED
tests/v2/test_phase1_foundation.py::test_dual_role_user PASSED
tests/v2/test_phase1_foundation.py::test_anyone_can_post_job PASSED
tests/v2/test_phase1_foundation.py::test_become_worker PASSED
tests/v2/test_phase1_foundation.py::test_tc_acceptance_stored PASSED

5 passed, 2 warnings
```

### 6. Test Specific to Phase 1

- `test_anyone_can_post_job()` — PASS
- `test_become_worker()` — PASS
- `test_dual_role_user()` — PASS
- `test_signup_no_role()` — PASS
- `test_tc_acceptance_stored()` — PASS

### 7. Config Validation

Command:

```text
env MONGO_URL=mongodb://localhost:27017 DB_NAME=kaamnow_test JWT_SECRET=test \
FEATURE_AI=true FEATURE_CHAT=true FEATURE_PAYMENTS=false FEATURE_VOICE=true \
python -c "from backend.config import settings; ..."
```

Output:

```text
{
  'gemini_api_key': '',
  'groq_api_key': '',
  'razorpay_key_id': '',
  'razorpay_key_secret': '',
  'posthog_api_key': '',
  'sentry_dsn': '',
  'feature_ai': True,
  'feature_chat': True,
  'feature_payments': False,
  'feature_voice': True
}
```

### 8. Import / Router Proof

Command:

```text
env MONGO_URL=mongodb://localhost:27017 DB_NAME=kaamnow_test JWT_SECRET=test \
python -c "from backend.app import app; print('app_import_ok', len(app.routes))"
```

Output:

```text
app_import_ok 148
```

New endpoint routes registered:

```text
POST /api/workers/become-worker
POST /api/workers/me/portfolio
DELETE /api/workers/me/portfolio/{item_id}
POST /api/workers/me/certifications
DELETE /api/workers/me/certifications/{cert_id}
POST /api/workers/me/video
POST /api/workers/me/available-now
DELETE /api/workers/me/available-now
GET /api/workers/me/qr-code
POST /api/workers/me/kyc/initiate
POST /api/workers/me/kyc/verify
GET /api/engagements/{engagement_id}/certificate
POST /api/engagements/{engagement_id}/generate-start-otp
POST /api/engagements/{engagement_id}/verify-start-otp
POST /api/engagements/{engagement_id}/checkin
POST /api/engagements/{engagement_id}/progress
POST /api/engagements/{engagement_id}/before-photo
POST /api/engagements/{engagement_id}/after-photo
POST /api/engagements/{engagement_id}/re-hire
GET /api/chat/{engagement_id}/messages
POST /api/chat/{engagement_id}/send
GET /api/chat/unread-count
POST /api/chat/{engagement_id}/read-all
POST /api/reports
GET /api/reports/mine
GET /api/referrals/my-code
GET /api/referrals/stats
GET /api/wallet/balance
GET /api/wallet/transactions
GET /api/legal/terms
GET /api/legal/privacy
GET /api/faq
GET /api/admin/reports
POST /api/admin/reports/{report_id}/resolve
POST /api/admin/reports/{report_id}/dismiss
GET /api/admin/faq
POST /api/admin/faq
PATCH /api/admin/faq/{faq_id}
DELETE /api/admin/faq/{faq_id}
POST /api/admin/faq/{faq_id}/reorder
GET /api/admin/legal
POST /api/admin/legal
GET /api/admin/wallet
GET /api/admin/referrals
POST /api/admin/broadcast
GET /api/admin/waitlist
```

STATUS: PASS
