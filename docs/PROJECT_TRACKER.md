# KaamNow v2 — Project Tracker
**Launch Date:** June 15, 2026 | **Owner:** Amir Subhani | **Dev DB:** kaamnow-dev

---

## 📊 Sprint Overview

| Phase | Name | Target | Status | Sign-Off |
|---|---|---|---|---|
| Phase 1 | Foundation | May 20–26 | ⬜ Not Started | ⬜ Pending |
| Phase 2 | Backend Features | May 27–Jun 2 | ⬜ Not Started | ⬜ Pending |
| Phase 3 | Mobile App | Jun 2–8 | ⬜ Not Started | ⬜ Pending |
| Phase 4 | Admin + QA + Launch | Jun 8–15 | ⬜ Not Started | ⬜ Pending |

**Status Key:** ⬜ Not Started &nbsp;|&nbsp; 🔵 In Progress &nbsp;|&nbsp; ✅ Done &nbsp;|&nbsp; 🔴 Blocked

---

## Phase 1 — Foundation
**Target:** May 20–26 &nbsp;|&nbsp; **Sign-off proof:** `tests/v2/PHASE1_SIGNOFF.md`

### 1.1 Day 1 — Setup & Cleanup

| # | Task | Status | Notes |
|---|---|---|---|
| 1.1.1 | Create `tests/v2/` folder + sign-off templates | ⬜ | Do this first |
| 1.1.2 | Set up Doppler — migrate all secrets from `.env.dev` | ⬜ | Replaces all .env files |
| 1.1.3 | Delete `backend/routers/bookings.py` | ⬜ | Legacy |
| 1.1.4 | Delete `tests/test_phase_2_progressive_profiling.py` | ⬜ | Stale |
| 1.1.5 | Delete `test_customer_cannot_apply_as_worker()` function | ⬜ | Dual role now |
| 1.1.6 | Delete `test_booking_lifecycle_*` function | ⬜ | Bookings router gone |
| 1.1.7 | Delete `frontend/src/pages/WorkerSetup.jsx` | ⬜ | Legacy |
| 1.1.8 | Delete `frontend/src/pages/Strategy.jsx` | ⬜ | Not needed |
| 1.1.9 | Move `backend/seed.py`, `seed_bulk.py` → `scripts/seed/` | ⬜ | |
| 1.1.10 | Move root planning `.md` docs → `docs/archive/` | ⬜ | Clean root |
| 1.1.11 | Remove `pandas`, `numpy` from `requirements.txt` | ⬜ | Unused |
| 1.1.12 | Remove bookings import from `backend/app.py` | ⬜ | |
| 1.1.13 | Remove routes `/worker/setup`, `/strategy` from `frontend/App.js` | ⬜ | |
| 1.1.14 | Replace hardcoded `http://13.207.54.156` in `app.json` with env | ⬜ | |
| 1.1.15 | Replace hardcoded `9999999999` support phone with config | ⬜ | |
| 1.1.16 | Replace hardcoded Gupshup sandbox `917834811114` with env | ⬜ | |

### 1.2 Day 1-2 — i18n System (Mobile First)

| # | Task | Status | Notes |
|---|---|---|---|
| 1.2.1 | Create `mobile/src/i18n/translations.js` — ALL strings EN + HI + Bhojpuri + Maithili | ⬜ | Every string, zero hardcoded |
| 1.2.2 | Create `mobile/src/i18n/index.js` — `useTranslation()` hook | ⬜ | |
| 1.2.3 | Expand `mobile/src/contexts/LanguageContext.js` — full 4-language system | ⬜ | Remove old stub |
| 1.2.4 | Create `backend/i18n/en.py` — all notification copy in English | ⬜ | |
| 1.2.5 | Create `backend/i18n/hi.py` — all notification copy in Hindi | ⬜ | |
| 1.2.6 | Create `backend/i18n/bho.py` — Bhojpuri notification copy | ⬜ | |
| 1.2.7 | Create `backend/i18n/mai.py` — Maithili notification copy | ⬜ | |
| 1.2.8 | Create `frontend/src/i18n/translations.js` + `index.js` | ⬜ | Admin web strings |

### 1.3 Day 2-3 — Locked Schema

| # | Task | Status | Notes |
|---|---|---|---|
| 1.3.1 | Update `backend/schemas.py` — full locked schema | ⬜ | All new Pydantic models |
| 1.3.2 | Add `Certification`, `PortfolioItem`, `SkillBadge` nested models | ⬜ | |
| 1.3.3 | Add `SavedAddress`, `EmergencyContact` nested models | ⬜ | |
| 1.3.4 | Add `ProgressUpdate` model to engagements | ⬜ | |
| 1.3.5 | Update `UserOut` — all new fields | ⬜ | is_worker, wallet_balance, etc |
| 1.3.6 | Update `WorkerOut` — all new fields | ⬜ | video_url, certifications, etc |
| 1.3.7 | Update `JobIn` + `JobOut` — all new fields | ⬜ | recurrence, is_anonymous, etc |
| 1.3.8 | Update `SignupCompleteRequest` — remove role, add gender | ⬜ | |
| 1.3.9 | Add all new request/response models (MessageIn/Out, ReportIn, etc.) | ⬜ | |
| 1.3.10 | Add security validators (max_length, job_date ≥ today, etc.) | ⬜ | |
| 1.3.11 | Update `backend/db.py` — new collections + all indexes | ⬜ | |
| 1.3.12 | Update `backend/config.py` — all new env vars + feature flags | ⬜ | |
| 1.3.13 | Update `backend/requirements.txt` — add new + remove unused | ⬜ | |

### 1.4 Day 3-4 — Core Backend Changes

| # | Task | Status | Notes |
|---|---|---|---|
| 1.4.1 | `backend/routers/auth.py` — remove role from signup | ⬜ | |
| 1.4.2 | `backend/routers/auth.py` — add is_worker/is_customer, gender, referral on signup | ⬜ | |
| 1.4.3 | `backend/routers/auth.py` — compute role from is_worker for WhatsApp bot compat | ⬜ | Never store role manually |
| 1.4.4 | `backend/routers/auth.py` — new endpoints: save-worker, saved-workers, address, emergency contact | ⬜ | |
| 1.4.5 | `backend/routers/auth.py` — T&C acceptance endpoint | ⬜ | |
| 1.4.6 | `backend/routers/workers.py` — replace all role guards with is_worker check | ⬜ | 4 places |
| 1.4.7 | `backend/routers/workers.py` — `POST /api/workers/become-worker` | ⬜ | |
| 1.4.8 | `backend/routers/workers.py` — portfolio upload/delete endpoints | ⬜ | |
| 1.4.9 | `backend/routers/workers.py` — certifications upload/delete + AI OCR | ⬜ | |
| 1.4.10 | `backend/routers/workers.py` — video upload, available-now, waitlist | ⬜ | |
| 1.4.11 | `backend/routers/workers.py` — update search filters (gender, certified, etc.) | ⬜ | |
| 1.4.12 | `backend/routers/jobs.py` — remove customer-only gate | ⬜ | Anyone can post |
| 1.4.13 | `backend/routers/jobs.py` — update worker interest gate to is_worker | ⬜ | |
| 1.4.14 | `backend/routers/jobs.py` — add template endpoints | ⬜ | |
| 1.4.15 | `backend/routers/jobs.py` — seasonal templates endpoint | ⬜ | |
| 1.4.16 | `backend/engagements.py` — update all role checks | ⬜ | |
| 1.4.17 | `backend/engagements.py` — add deep_link to push payload | ⬜ | |
| 1.4.18 | `backend/engagements.py` — response time calculation on accept | ⬜ | |
| 1.4.19 | `backend/engagements.py` — Hindi/Bhojpuri/Maithili notifications via i18n | ⬜ | |

### 1.5 Day 5 — Security + Tests

| # | Task | Status | Notes |
|---|---|---|---|
| 1.5.1 | Update `DummyDb` — add messages, reports, payments, wallet_transactions, faqs collections | ⬜ | |
| 1.5.2 | Update all test fixtures — use is_worker instead of role | ⬜ | |
| 1.5.3 | Add new tests: anyone_can_post_job, become_worker, dual_role, signup_no_role, tc_acceptance | ⬜ | |
| 1.5.4 | CSRF header check on all state-changing endpoints | ⬜ | |
| 1.5.5 | MIME type verification on all file uploads | ⬜ | |
| 1.5.6 | Admin role re-verified on every admin request | ⬜ | |
| 1.5.7 | Sentry init in `backend/app.py` | ⬜ | From Day 1 |
| 1.5.8 | Run full pytest — all tests pass | ⬜ | |
| 1.5.9 | **Write `tests/v2/PHASE1_SIGNOFF.md` with all proof data** | ⬜ | Required before Phase 2 |

---

## Phase 2 — Backend Features
**Target:** May 27–June 2 &nbsp;|&nbsp; **Sign-off proof:** `tests/v2/PHASE2_SIGNOFF.md`

### 2.1 AI Service

| # | Task | Status | Notes |
|---|---|---|---|
| 2.1.1 | `backend/ai_service.py` — Gemini Flash + Groq clients (singletons) | ⬜ | |
| 2.1.2 | `backend/routers/ai.py` — `POST /api/ai/voice-to-job` | ⬜ | Groq Whisper → Gemini |
| 2.1.3 | `backend/routers/ai.py` — `POST /api/ai/generate-job` (text) | ⬜ | |
| 2.1.4 | `backend/routers/ai.py` — `POST /api/ai/generate-bio` | ⬜ | |
| 2.1.5 | `backend/routers/ai.py` — `POST /api/ai/describe-cert` (Vision OCR) | ⬜ | |
| 2.1.6 | `backend/routers/ai.py` — `POST /api/ai/photo-to-job` (Vision) | ⬜ | |
| 2.1.7 | `backend/routers/ai.py` — `GET /api/ai/suggest-price` (MongoDB aggregation) | ⬜ | No AI needed |

### 2.2 Chat System

| # | Task | Status | Notes |
|---|---|---|---|
| 2.2.1 | `backend/routers/chat.py` — GET messages (last 50, mark read) | ⬜ | |
| 2.2.2 | `backend/routers/chat.py` — POST send (text/image/voice) | ⬜ | Rate limit: 30/min |
| 2.2.3 | `backend/routers/chat.py` — GET unread-count | ⬜ | |
| 2.2.4 | `backend/routers/chat.py` — POST read-all | ⬜ | |
| 2.2.5 | `backend/cloudinary_service.py` — add `upload_voice_clip()` | ⬜ | For voice messages |

### 2.3 Wallet + Referrals

| # | Task | Status | Notes |
|---|---|---|---|
| 2.3.1 | `backend/routers/wallet.py` — GET balance | ⬜ | |
| 2.3.2 | `backend/routers/wallet.py` — GET transactions | ⬜ | |
| 2.3.3 | `backend/routers/wallet.py` — internal `credit_wallet()` function | ⬜ | Atomic $inc |
| 2.3.4 | `backend/routers/wallet.py` — internal `debit_wallet()` function | ⬜ | Check balance first |
| 2.3.5 | `backend/routers/referrals.py` — GET my-code | ⬜ | |
| 2.3.6 | `backend/routers/referrals.py` — GET stats | ⬜ | |
| 2.3.7 | Referral `?ref=CODE` tracking on signup | ⬜ | In auth.py |
| 2.3.8 | Auto-credit ₹100 + ₹50 on first booking completion | ⬜ | In engagements.py |
| 2.3.9 | 90-day expiry background job | ⬜ | In app.py on_startup |

### 2.4 Reports + Legal + FAQ

| # | Task | Status | Notes |
|---|---|---|---|
| 2.4.1 | `backend/routers/reports.py` — POST report, GET mine | ⬜ | |
| 2.4.2 | Auto-flag account on 3+ reports in 30 days | ⬜ | |
| 2.4.3 | `backend/routers/legal.py` — GET terms, GET privacy | ⬜ | Public endpoints |
| 2.4.4 | `backend/routers/faq.py` — GET faqs (public, filterable) | ⬜ | |
| 2.4.5 | Seed initial FAQ content (10 questions, EN + HI) | ⬜ | |
| 2.4.6 | Seed T&C v1.0 + Privacy Policy v1.0 content | ⬜ | Placeholder until lawyer reviews |

### 2.5 Payments + PDF + QR

| # | Task | Status | Notes |
|---|---|---|---|
| 2.5.1 | `backend/payment_service.py` — Razorpay client singleton | ⬜ | |
| 2.5.2 | `backend/routers/payments.py` — create-order, verify (HMAC), history | ⬜ | Test mode |
| 2.5.3 | `backend/pdf_service.py` — completion certificate (ReportLab) | ⬜ | |
| 2.5.4 | `backend/qr_service.py` — Local Expert QR code PNG | ⬜ | |
| 2.5.5 | `GET /api/engagements/{id}/certificate` — StreamingResponse PDF | ⬜ | |
| 2.5.6 | `GET /api/workers/me/qr-code` — StreamingResponse PNG | ⬜ | |

### 2.6 Engagement — New Endpoints

| # | Task | Status | Notes |
|---|---|---|---|
| 2.6.1 | `POST /api/engagements/{id}/generate-start-otp` | ⬜ | 4-digit, never returned in response |
| 2.6.2 | `POST /api/engagements/{id}/verify-start-otp` | ⬜ | Local Expert enters it |
| 2.6.3 | `POST /api/engagements/{id}/checkin` — GPS verified (1km tolerance) | ⬜ | |
| 2.6.4 | `POST /api/engagements/{id}/progress` — 4 states + photo | ⬜ | |
| 2.6.5 | `POST /api/engagements/{id}/before-photo` | ⬜ | Up to 3 |
| 2.6.6 | `POST /api/engagements/{id}/after-photo` | ⬜ | Up to 3 |
| 2.6.7 | `POST /api/engagements/{id}/re-hire` — quick re-hire | ⬜ | |

### 2.7 Workers — New Endpoints

| # | Task | Status | Notes |
|---|---|---|---|
| 2.7.1 | `POST /api/workers/me/portfolio` — upload (max 6) | ⬜ | |
| 2.7.2 | `DELETE /api/workers/me/portfolio/{id}` | ⬜ | |
| 2.7.3 | `POST /api/workers/me/certifications` — upload + AI OCR auto-fill | ⬜ | |
| 2.7.4 | `DELETE /api/workers/me/certifications/{id}` | ⬜ | |
| 2.7.5 | `POST /api/workers/me/video` — 30s intro video | ⬜ | Max 50MB |
| 2.7.6 | `POST /api/workers/me/available-now` — 4hr broadcast to saved customers | ⬜ | |
| 2.7.7 | `DELETE /api/workers/me/available-now` — cancel broadcast | ⬜ | |
| 2.7.8 | `POST /api/workers/{id}/waitlist` — join waitlist | ⬜ | |
| 2.7.9 | Waitlist auto-notify on availability change | ⬜ | |

### 2.8 Admin Enhancements

| # | Task | Status | Notes |
|---|---|---|---|
| 2.8.1 | Admin login with email OR phone | ⬜ | |
| 2.8.2 | `GET/POST/PATCH/DELETE /api/admin/faq` | ⬜ | |
| 2.8.3 | `GET/POST /api/admin/reports` — view + resolve/dismiss | ⬜ | |
| 2.8.4 | `POST/GET /api/admin/legal` — publish new T&C / Privacy versions | ⬜ | |
| 2.8.5 | `POST /api/admin/broadcast` — push to pincode or all | ⬜ | |
| 2.8.6 | `GET /api/admin/wallet` — platform wallet audit | ⬜ | |
| 2.8.7 | `POST /api/admin/workers/{id}/verify-cert/{cert_id}` | ⬜ | |

### 2.9 Background Jobs + App Wiring

| # | Task | Status | Notes |
|---|---|---|---|
| 2.9.1 | `expire_wallet_credits()` — daily midnight IST | ⬜ | |
| 2.9.2 | `expire_available_now()` — hourly | ⬜ | |
| 2.9.3 | `send_nudge_notifications()` — daily 10am IST | ⬜ | |
| 2.9.4 | `send_seasonal_suggestions()` — 1st of each month | ⬜ | |
| 2.9.5 | Register all 8 new routers in `backend/app.py` | ⬜ | |
| 2.9.6 | Create all DB indexes in `on_startup()` | ⬜ | |
| 2.9.7 | `deploy/deploy-dev.sh` — complete dev deployment script | ⬜ | |
| 2.9.8 | `deploy/k8s/dev/` — all dev namespace manifests | ⬜ | |
| 2.9.9 | Chatwoot k8s deployment + Postgres + Redis pods | ⬜ | |
| 2.9.10 | Test all endpoints with real dev DB | ⬜ | |
| 2.9.11 | **Write `tests/v2/PHASE2_SIGNOFF.md` with all proof data** | ⬜ | Required before Phase 3 |

---

## Phase 3 — Mobile App
**Target:** June 2–8 &nbsp;|&nbsp; **Sign-off proof:** `tests/v2/PHASE3_SIGNOFF.md`

### 3.1 Foundation (Do First)

| # | Task | Status | Notes |
|---|---|---|---|
| 3.1.1 | Install new packages: expo-location, reanimated, gesture-handler, lottie, webview | ⬜ | |
| 3.1.2 | Source Lottie animations from lottiefiles.com — 7 states | ⬜ | Empty, loading, success, error, upload, OTP, payment |
| 3.1.3 | `mobile/App.js` — unified tab bar, deep link config, Sentry init | ⬜ | |
| 3.1.4 | `mobile/src/contexts/AuthContext.js` — remove role, add is_worker/is_customer | ⬜ | |
| 3.1.5 | Delete 5 stale screens | ⬜ | RoleSelection, CustomerOnboarding, WorkerOnboarding, CustomerProfile, WorkerMyProfile |
| 3.1.6 | Sweep all existing screens — replace every hardcoded string with `t('key')` | ⬜ | Zero hardcoded strings |

### 3.2 New Screens

| # | Task | Status | Notes |
|---|---|---|---|
| 3.2.1 | `ProfileScreen.js` — unified: customer + Become Expert sheet + worker profile | ⬜ | |
| 3.2.2 | `BecomeExpertSheet.js` — bottom sheet: 3 steps (skills → rate + GPS → bio) | ⬜ | Reanimated bottom sheet |
| 3.2.3 | `EngagementDetailScreen.js` — all states + OTP + progress + before/after | ⬜ | Deep link target |
| 3.2.4 | `ChatScreen.js` — polling, voice messages, image, read receipts | ⬜ | |
| 3.2.5 | `NotificationsScreen.js` — full list, group by date, deep links | ⬜ | |
| 3.2.6 | `EarningsScreen.js` — goal, calendar, history, certificate download | ⬜ | |
| 3.2.7 | `WalletScreen.js` — balance, transactions, refer & earn CTA | ⬜ | |
| 3.2.8 | `FAQScreen.js` — searchable accordion, category chips, Chat with Us link | ⬜ | |
| 3.2.9 | `TermsScreen.js` — fetch from API, scroll, Accept button (signup only) | ⬜ | |
| 3.2.10 | `PrivacyScreen.js` — fetch from API, full scroll | ⬜ | |
| 3.2.11 | `SupportChatScreen.js` — Chatwoot WebView, pre-fills user identity | ⬜ | |
| 3.2.12 | `MapScreen.js` — react-native-maps, Local Expert pins, tap to view profile | ⬜ | |
| 3.2.13 | `QRCodeScreen.js` — QR display, save to photos, share | ⬜ | Local Expert only |

### 3.3 Modified Screens

| # | Task | Status | Notes |
|---|---|---|---|
| 3.3.1 | `LandingScreen.js` — split into GuestHome + UserHome components | ⬜ | |
| 3.3.2 | `LoginScreen.js` — remove role step, add gender, add T&C acceptance | ⬜ | |
| 3.3.3 | `PostJobScreen.js` — voice input, photo-to-job, GPS, urgency, recurrence, anonymous | ⬜ | |
| 3.3.4 | `WorkerJobFeedScreen.js` — Become Expert CTA, urgency/recurrence filters | ⬜ | |
| 3.3.5 | `MarketplaceScreen.js` — gender/certified/KYC filters, GPS near-me, map tab | ⬜ | |
| 3.3.6 | `DashboardScreen.js` — unify for both roles, progress updates feed | ⬜ | |

### 3.4 Features & Integrations

| # | Task | Status | Notes |
|---|---|---|---|
| 3.4.1 | GPS integration (expo-location) — BecomeExpertSheet + PostJobScreen + MarketplaceScreen | ⬜ | |
| 3.4.2 | Voice recording (expo-av) — PostJobScreen mic + ChatScreen voice message | ⬜ | |
| 3.4.3 | Voice-to-job flow — record → upload → AI form fill → confirm | ⬜ | |
| 3.4.4 | Photo-to-job flow — camera/picker → AI description → confirm | ⬜ | |
| 3.4.5 | Language toggle in AppHeader — EN / हिं / भोज / मैथ | ⬜ | |
| 3.4.6 | On-my-way tracking — GPS snapshot → Google Maps link to customer | ⬜ | |
| 3.4.7 | Job progress buttons — 4 states with optional photo | ⬜ | |
| 3.4.8 | OTP job start — customer sees code, Local Expert enters it | ⬜ | |
| 3.4.9 | GPS check-in — verify within 1km of job site | ⬜ | |
| 3.4.10 | Before/after photo upload in engagement | ⬜ | |
| 3.4.11 | Completion certificate download (PDF) | ⬜ | |
| 3.4.12 | Quick re-hire from history | ⬜ | |
| 3.4.13 | Available Now button — Local Expert profile | ⬜ | |
| 3.4.14 | Saved addresses — add/edit/delete/select | ⬜ | |
| 3.4.15 | Waitlist join button on Local Expert profile | ⬜ | |
| 3.4.16 | Earnings goal setup + progress ring | ⬜ | |
| 3.4.17 | Referral share — WhatsApp share + copy link + QR | ⬜ | |
| 3.4.18 | Post job anonymously toggle | ⬜ | |
| 3.4.19 | Seasonal template suggestions on PostJobScreen | ⬜ | |
| 3.4.20 | T&C acceptance checkbox — mandatory at signup | ⬜ | |
| 3.4.21 | First-time walkthrough — 3 slides, never shown again | ⬜ | Lottie animations |
| 3.4.22 | Profile verification selfie — camera + liveness + upload | ⬜ | ML Kit |
| 3.4.23 | Video profile upload for Local Expert | ⬜ | |
| 3.4.24 | Portfolio photo grid — upload/delete (max 6) | ⬜ | |
| 3.4.25 | Certification upload + AI auto-fill + pending badge | ⬜ | |
| 3.4.26 | Skill badges display on profile | ⬜ | Auto-awarded |
| 3.4.27 | Notification deep link handling (kaamnow:// scheme) | ⬜ | |
| 3.4.28 | PostHog event tracking — 10 key events | ⬜ | |
| 3.4.29 | Sentry error boundary — wraps entire app | ⬜ | |
| 3.4.30 | Offline caching — AsyncStorage for job feed + worker list | ⬜ | |
| 3.4.31 | **Write `tests/v2/PHASE3_SIGNOFF.md` with all proof data** | ⬜ | Required before Phase 4 |

---

## Phase 4 — Admin Dashboard + QA + Launch
**Target:** June 8–15 &nbsp;|&nbsp; **Sign-off proof:** `tests/v2/PHASE4_SIGNOFF.md`

### 4.1 Admin Dashboard (`frontend/src/pages/AdminDashboard.jsx`)

| # | Task | Status | Notes |
|---|---|---|---|
| 4.1.1 | Reports queue tab — view/resolve/dismiss with note | ⬜ | |
| 4.1.2 | FAQ management tab — add/edit/delete/reorder | ⬜ | |
| 4.1.3 | User management tab — search, view wallet, ban/flag/verify | ⬜ | |
| 4.1.4 | Wallet audit tab — all transactions platform-wide | ⬜ | |
| 4.1.5 | Referral audit tab — who referred whom, credits issued | ⬜ | |
| 4.1.6 | Broadcast tab — push notification to all or by pincode | ⬜ | |
| 4.1.7 | Certification verification tab — approve/reject pending certs | ⬜ | |
| 4.1.8 | Admin login with email OR phone | ⬜ | |
| 4.1.9 | Update all `user.role` checks → `user.is_worker` in admin pages | ⬜ | |
| 4.1.10 | Language toggle in Navbar — EN / हिं | ⬜ | |
| 4.1.11 | T&C + Privacy Policy pages (web) | ⬜ | |
| 4.1.12 | FAQ page (web) | ⬜ | |

### 4.2 End-to-End QA

| # | Task | Status | Notes |
|---|---|---|---|
| 4.2.1 | Full signup flow — both users | ⬜ | |
| 4.2.2 | Become Local Expert flow | ⬜ | |
| 4.2.3 | Post job with voice input | ⬜ | |
| 4.2.4 | Post job with photo (photo-to-job) | ⬜ | |
| 4.2.5 | Apply for job → engagement created | ⬜ | |
| 4.2.6 | Accept engagement → chat opens | ⬜ | |
| 4.2.7 | Chat — text, image, voice message | ⬜ | |
| 4.2.8 | Generate + verify start OTP | ⬜ | |
| 4.2.9 | GPS check-in | ⬜ | |
| 4.2.10 | Progress updates — all 4 states | ⬜ | |
| 4.2.11 | Before/after photos | ⬜ | |
| 4.2.12 | Mark complete → certificate downloaded | ⬜ | |
| 4.2.13 | Rate + review → badge awarded | ⬜ | |
| 4.2.14 | Referral flow — ₹100 + ₹50 credited to wallet | ⬜ | |
| 4.2.15 | All 4 languages working — EN, HI, Bhojpuri, Maithili | ⬜ | |
| 4.2.16 | Deep link from push notification → correct screen | ⬜ | |
| 4.2.17 | Offline mode — cached data loads, queue on reconnect | ⬜ | |

### 4.3 Performance & Build

| # | Task | Status | Notes |
|---|---|---|---|
| 4.3.1 | Test on physical Android device (< 3GB RAM) | ⬜ | Low-end device check |
| 4.3.2 | App startup time < 3 seconds | ⬜ | |
| 4.3.3 | Animations at 60fps — no jank | ⬜ | |
| 4.3.4 | No crashes on language toggle, GPS, voice, chat polling | ⬜ | |
| 4.3.5 | EAS build — Android APK | ⬜ | |
| 4.3.6 | APK installs + runs on physical device | ⬜ | |

### 4.4 Final Checks

| # | Task | Status | Notes |
|---|---|---|---|
| 4.4.1 | Zero hardcoded strings — grep check passes | ⬜ | |
| 4.4.2 | Zero role === "worker" in mobile — grep check passes | ⬜ | |
| 4.4.3 | Zero secrets in codebase — Doppler only | ⬜ | |
| 4.4.4 | All stale files deleted | ⬜ | |
| 4.4.5 | Run full pytest — all tests pass | ⬜ | |
| 4.4.6 | Deploy to dev via `deploy-dev.sh` | ⬜ | |
| 4.4.7 | graphify update — rebuild knowledge graph | ⬜ | |
| 4.4.8 | **Write `tests/v2/PHASE4_SIGNOFF.md` with all proof data** | ⬜ | |
| 4.4.9 | 🚀 **LAUNCH READY** | ⬜ | June 15, 2026 |

---

## 🔜 Parked — Post-Launch

| Feature | Why Parked |
|---|---|
| Web frontend (full rebuild) | Focus on mobile first |
| Safety Incident formal flow | Complex, post-launch |
| Live GPS tracking (real-time) | Upgrade from snapshot version |
| Surge Alert | Nice-to-have |
| App Lock / PIN | Not critical |
| Dark Mode | Post-launch |
| Missed-call job posting | Complex IVR |
| Flutter rewrite | Evaluate for v3 |

---

*Last updated: May 2026*
