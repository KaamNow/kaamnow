# KaamNow v2 — Daily Progress Log

**Sprint:** May 20 – June 15, 2026
**Target:** Launch on June 15, 2026

---

## How to Use This Log

- Updated at the end of every working session
- Each day shows: what was planned, what was done, blockers, and what's next
- Phase sign-offs are noted here when each phase completes

---

## May 20, 2026 — Day 1 (Planning, Architecture & Infrastructure)

**Phase:** Pre-Sprint Setup
**GitHub Issues:** #47–#54 (all closed ✅)

### Done Today

#### Product Planning
- ✅ Full product brainstorm — OLX dual-role model confirmed
- ✅ All 220 features confirmed and locked — schema will not change
- ✅ Schema locked: users, workers, jobs, engagements, messages, reports, payments, wallet_transactions, faqs, legal_docs, worker_waitlist
- ✅ "Local Expert" naming confirmed — replaces "Worker" everywhere in app
- ✅ Language support: EN + Hindi + Bhojpuri + Maithili
- ✅ Wallet: credits only, ₹100 referral reward (+ ₹50 for referred), 90-day expiry
- ✅ Web frontend deferred — mobile + backend + admin dashboard only in sprint
- ✅ Master Codex plan written → `.claude/plans/before-anything-you-first-mellow-candle.md`

#### Documentation
- ✅ `docs/tech-stack.md` — 22 categories, ₹0/month total cost
- ✅ `docs/ARCHITECTURE.md` — 13 Mermaid system + flow diagrams
- ✅ `docs/PROJECT_TRACKER.md` — 202 tasks across 4 phases
- ✅ `docs/kaamnow_v2_checklist.csv` — Google Sheet verification checklist
- ✅ `docs/DAILY_LOG.md` — this file

#### GitHub & CI/CD
- ✅ 37 Phase 1 GitHub issues created (#10–#46) on project board
- ✅ 18 labels created (phase-1/2/3/4, P0/P1/P2, setup, backend, mobile, security, etc.)
- ✅ 8 Day 1 infra issues created + closed (#47–#54)
- ✅ 10 GitHub Actions workflows: ci, deploy-dev, release, security, codeql, docker-publish, dependabot-auto-merge, uptime, project-board, deploy-fly
- ✅ `Makefile` — `make dev-backend`, `make test`, `make deploy-dev`, etc.
- ✅ `.github/dependabot.yml` — weekly dep updates for backend/mobile/frontend/actions
- ✅ PR template + bug/feature issue templates
- ✅ 14 GitHub Actions secrets set programmatically via API

#### Dev Infrastructure
- ✅ Kind cluster `kaamnow-dev` created on EC2 — completely isolated from prod `kaamnow`
- ✅ Dev: ports 9000/9443 | Prod: ports 80/443 — zero conflict
- ✅ `deploy/deploy-dev.sh` — Docker layer cache → ~2-3 min deploys
- ✅ Doppler secrets auto-synced to k8s Secret on every deploy
- ✅ Backend + Frontend pods running healthy in `kaamnow-dev` namespace
- ✅ kubectl aliases on EC2: `kdev`, `kprod`, `pods-dev`, `pods-prod`
- ✅ Both kubeconfigs merged into `~/.kube/config` on EC2
- ✅ `deploy/k8s/dev/` — 00-namespace, 20-backend, 30-frontend, 50-ingress manifests

#### dev.kaamnow.com — HTTPS Live
- ✅ GoDaddy A record: `dev` → `13.207.54.156`
- ✅ Let's Encrypt SSL cert issued (valid until Aug 17, 2026) — no GoDaddy API key needed
- ✅ Architecture: browser → prod NGINX (port 443) → dev-cluster-proxy → 172.18.0.1:9000 → dev cluster
- ✅ `mobile/app.json` updated: `apiUrl: "https://dev.kaamnow.com"`
- ✅ `DEV_API_URL` GitHub secret updated to `https://dev.kaamnow.com`

#### MCP Servers
- ✅ GitHub MCP (user-scoped) — PRs, issues, project board
- ✅ Filesystem MCP (project-scoped) — project file access
- ✅ MongoDB MCP (project-scoped) — dev DB queries
- ✅ `flyctl` + `doppler` CLIs installed locally

### Key Decisions Made
- OLX dual-role: anyone can hire AND work — no role selection at signup
- Schema is locked — no changes after implementation begins
- Phase sign-off with proof data required before each phase starts (`tests/v2/`)
- Premium Expo libraries: Reanimated v3 + Gesture Handler + Lottie
- Doppler = only credential store — no `.env` files in repo
- Free stack = ₹0/month for entire testing phase

### Blockers
- None

### Live Endpoints (Day 1 end state)
| | URL | Status |
|---|---|---|
| Dev Frontend | `https://dev.kaamnow.com` | ✅ |
| Dev API | `https://dev.kaamnow.com/api/stats` | ✅ `{"workers":18,"jobs":5,...}` |
| Prod Frontend | `https://kaamnow.com` | ✅ |
| Prod API | `https://kaamnow.com/api/stats` | ✅ |

### Tomorrow (Day 2) — Phase 1 Begins
1. Create `tests/v2/` folder structure + sign-off templates (issue #10)
2. Set up Doppler — migrate secrets via `bash scripts/upload-to-doppler.sh` (issue #11)
3. Delete stale code — bookings.py, 5 mobile screens, WorkerSetup.jsx (issues #12–#14)
4. Create `mobile/src/i18n/translations.js` — all 4 languages (issue #15)
5. Start schema update in `backend/schemas.py` (issue #20)

---

## May 21, 2026 — Day 2 (Phases 1–4 Implementation + Deploy Fix)

**Phase:** All 4 phases completed
**Commits:** 7 commits pushed to `ui-ux` branch

### Done Today

#### Phase 1 — Backend Foundation ✅
- ✅ Dual-role schema: `is_worker` / `is_customer` replaces hard `role` field
- ✅ 7 new MongoDB collections: messages, reports, payments, wallet_transactions, worker_waitlist, faqs, legal_docs
- ✅ All new routers: chat, wallet, reports, legal, faq, referrals, ai, payments
- ✅ `backend/i18n/` — notification copy in EN + HI + BHO + MAI
- ✅ Full security hardening: max_length validators, rate limits, CSRF header checks
- ✅ `backend/routers/auth.py` — gender, referral_code, saved_workers, addresses, emergency contact, accept-terms
- ✅ `backend/routers/workers.py` — become-worker, portfolio, certifications, available-now, KYC, QR code
- ✅ `backend/routers/jobs.py` — anyone can post (no role gate), templates, urgency/recurrence/anonymous
- ✅ `backend/routers/engagements.py` — OTP job start, GPS checkin, progress updates, before/after photos, re-hire, certificate PDF
- ✅ Phase 1 sign-off: `tests/v2/PHASE1_SIGNOFF.md` (5/5 tests pass, 148 routes)

#### Phase 2 — AI + Payments + Background Jobs ✅
- ✅ `backend/ai_service.py` — Gemini 1.5 Flash + Groq Whisper clients (dev fallbacks when keys absent)
- ✅ `backend/routers/ai.py` — 6 endpoints: voice-to-job, generate-job, generate-bio, describe-cert, photo-to-job, suggest-price
- ✅ `backend/payment_service.py` + `backend/routers/payments.py` — Razorpay create-order + HMAC verify
- ✅ `backend/pdf_service.py` — ReportLab completion certificate
- ✅ `backend/qr_service.py` — QR code PNG generation
- ✅ `backend/cloudinary_service.py` — portfolio, cert, video, audio, job-photo uploads → `kaamnow-dev/*` folders
- ✅ Background jobs: expire wallet credits (midnight IST), expire available-now (hourly), nudge notifications (10am IST), seasonal suggestions (1st of month)
- ✅ Cloudinary keys wired: cloud=dztrzwvee, folder=kaamnow-dev
- ✅ Gemini API key wired: AIzaSyAy...
- ✅ Phase 2 sign-off: `tests/v2/PHASE2_SIGNOFF.md` (157 routes, wallet flow proven, PDF + QR generated)

#### Phase 3 — Mobile App ✅
- ✅ `mobile/src/i18n/translations.js` — 1650+ lines, 4 languages (EN/HI/BHO/MAI), 200+ keys
- ✅ `mobile/App.js` — unified single tab bar (Home/FindWork/PostJob/Activity/Profile), deep links `kaamnow://`, Sentry init
- ✅ `mobile/src/contexts/AuthContext.js` — `isWorker`/`isCustomer` helpers, analytics identify/reset
- ✅ `LoginScreen.js` — role step removed, optional gender selector, navigates to Tabs
- ✅ 5 stale screens deleted: RoleSelection, CustomerOnboarding, WorkerOnboarding, CustomerProfile, WorkerMyProfile
- ✅ 21 new screens: Profile, EngagementDetail, Chat, Notifications, Earnings, Wallet, FAQ, Terms, Privacy, SupportChat, Map, QRCode, Activity, SavedExperts, SavedAddresses, EmergencyContact, EditPhoto, BecomeExpert, Portfolio, Certifications, VideoProfile, KYC
- ✅ `DashboardScreen` — role checks → `is_worker`, loads both jobs + engagements for everyone
- ✅ `PostJobScreen` — role guard removed, urgency/recurrence/anonymous/GPS/AI voice+photo added
- ✅ `WorkerJobFeedScreen` — "Become a Local Expert" banner + CTA for non-workers
- ✅ `MarketplaceScreen` — GPS near-me button, Map button
- ✅ `AppHeader` — 4-language toggle pill (EN → हिं → भोज → मैथ cycles on tap)
- ✅ `OnboardingWalkthrough` — 3-slide Lottie-style walkthrough shown once on first open
- ✅ Offline cache — `expo-file-system` cache for job feed + worker list (30-min TTL)
- ✅ PostHog analytics wrapper — tracks: signup, become_local_expert, post_job, apply_for_job, accept_booking, chat_message_sent, referral_shared, certificate_downloaded
- ✅ Skill badges display in ProfileScreen worker section
- ✅ Zero `user.role` references across all 35 screen files
- ✅ Phase 3 sign-off: `tests/v2/PHASE3_SIGNOFF.md`

#### Phase 4 — Admin Dashboard + Cleanup ✅
- ✅ `AdminDashboard.jsx` — 6 new tabs: Reports (resolve/dismiss), Users (flag/ban), FAQ CRUD, Legal publish, Wallet Audit, Referrals
- ✅ Deleted `WorkerSetup.jsx`, `Strategy.jsx` + removed routes
- ✅ 11 frontend files: `user.role === "worker"` → `user.is_worker` everywhere
- ✅ Phase 4 sign-off: `tests/v2/PHASE4_SIGNOFF.md`

#### Deploy Fixes (3 crash bugs squashed)
- ✅ **Bug 1:** Double `@router.get()` decorators on same function → FastAPI schema crash → split into separate functions
- ✅ **Bug 2:** `@router.get("")` empty string path → invalid FastAPI route → replaced with `@router.get("/")`
- ✅ **Bug 3 (root cause):** `ValueError: invalid literal for int() for '"30"'` — Doppler `--format env` wraps ALL values in double quotes (`JWT_EXPIRY_DAYS="30"`), `kubectl --from-env-file` keeps quotes as literal value, `int('"30"')` crashes at startup → Fixed with `_clean()` + `_to_int()` helpers in `config.py` that strip surrounding quotes
- ✅ Added `kubectl logs` + `describe pod` printing on rollout failure in `deploy-dev.sh`
- ✅ `SKIP_SEED=1` in Doppler dev — seed skipped on pod restarts
- ✅ Readiness probe: `initialDelaySeconds` 15→30s, `failureThreshold` 1→6, memory 512→768Mi

### Blockers Resolved
- Fly.io required credit card → switched to EC2 SSH deploy ✅
- Dev HTTPS without GoDaddy API → cert-manager on prod cluster + dev-cluster-proxy ✅
- Doppler quote wrapping `JWT_EXPIRY_DAYS="30"` crashing pod → `_clean()` in config.py ✅

### Current Live State
| | URL | Status |
|---|---|---|
| Dev API | `https://dev.kaamnow.com/api/stats` | ✅ Running |
| Dev Frontend | `https://dev.kaamnow.com` | ✅ Running |
| Mobile (Expo) | LAN QR scan | ✅ Running locally |

### Open Items (Not Blocking Launch)
- ❌ Groq API key not yet created (voice transcription uses fallback)
- ❌ Razorpay keys not yet created (`FEATURE_PAYMENTS=false`)
- ❌ PostHog + Sentry keys not yet created (analytics/monitoring optional)
- ❌ EAS Android APK build not yet run
- ❌ Mobile UI/UX needs polish to match `design_guidelines.json` (Archetype 4 — Swiss + Saffron/Indigo)
- ❌ Chatwoot self-hosted not yet deployed (SupportChatScreen shows fallback URL)
- ❌ End-to-end QA flow (signup → job → hire → complete → certificate)

### Tomorrow (Day 3) — UI/UX Polish
1. Rebuild mobile screens to match design_guidelines.json (Cabinet Grotesk / Outfit headings, Manrope body, #FF6B35 saffron, #3F37C9 indigo, flat cards with 1px borders)
2. LandingScreen — asymmetric hero, strong typography, real Pexels images from design_guidelines
3. ProfileScreen, MarketplaceScreen — Swiss/high-contrast layout
4. WorkerCard + JobCard components — flat border, trust badge, no generic shadows
5. Groq + Sentry + PostHog keys setup

---

<!-- TEMPLATE FOR NEW DAYS — copy this block and fill in -->
<!--
## [Date] — Day [N] ([Day of Week])

**Phase:** [Phase 1/2/3/4 — Name]
**Hours worked:** [X hours]

### Planned Today
-

### Done Today
- ✅
- ✅
- 🔵 (in progress, carries to tomorrow)

### Blockers
-

### Tomorrow
-

### Phase Sign-Off
[ ] Phase [N] complete — proof written to tests/v2/PHASE[N]_SIGNOFF.md
-->

---

## Summary Stats

| Metric | Value |
|---|---|
| Days elapsed | 2 of 26 |
| Days remaining | 24 |
| Phase 1 | ✅ Complete (147 routes, 5/5 tests) |
| Phase 2 | ✅ Complete (157 routes, PDF + QR + wallet) |
| Phase 3 | ✅ Complete (35 screens, 4 languages, GPS + AI + offline) |
| Phase 4 | ✅ Complete (admin 13 tabs, role cleanup) |
| Backend routes | 162 registered |
| Mobile screens | 35 total (21 new) |
| Languages | EN + HI + BHO + MAI |
| API keys done | Cloudinary ✅, Gemini ✅, Groq ❌, Razorpay ❌, Sentry ❌, PostHog ❌ |
| Deploy crashes fixed | 3 (double decorator, empty path, Doppler quote wrapping) |
| Dev cluster | ✅ https://dev.kaamnow.com |
| Prod cluster | ✅ https://kaamnow.com |
| Mobile Expo | ✅ Running on LAN |
| Launch date | June 15, 2026 |
| **Remaining blockers** | UI polish, Groq/Sentry/PostHog keys, EAS build, E2E QA |
