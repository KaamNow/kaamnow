# KaamNow

Blue-collar gig marketplace connecting employers with skilled workers — built with FastAPI, React, and Expo/React Native.

---

## Stack

| Layer | Tech |
|-------|------|
| Backend | Python 3.11+, FastAPI, Motor (async MongoDB) |
| Frontend | React 19, Vite / react-scripts 5, Tailwind CSS, shadcn/ui |
| Mobile | Expo SDK 54, React Native |
| Database | MongoDB Atlas (`kaamnow_dev` for local/dev, `kaamnow_prod` for prod) |
| Secrets | Doppler (prod/CI) — `.env.dev` file (local dev) |
| Deploy | GitHub Actions → SSH → EC2 → kind k8s cluster |

---

## Prerequisites

- Python 3.11 or 3.12
- Node.js 18+ and npm
- [Expo CLI](https://docs.expo.dev/get-started/installation/) — `npm install -g expo-cli`
- (Optional) Expo Go app on your phone for mobile testing
- (Optional) [Doppler CLI](https://docs.doppler.com/docs/install-cli) — only needed for prod deployments

---

## 1 — Backend

```bash
cd backend

# Create and activate a virtual environment
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# The dev env file is already in the repo (not gitignored for dev convenience)
# backend/.env.dev has MongoDB Atlas dev cluster, Gupshup sandbox, Cloudinary, etc.
# No extra setup needed — it just works.

# Start the server from the project ROOT (not inside backend/)
cd ..
python3 -m uvicorn backend.app:app --reload --port 8000
```

API runs at **http://localhost:8000**  
Interactive docs: **http://localhost:8000/docs**

### Key env vars (backend/.env.dev)

| Variable | Purpose |
|----------|---------|
| `MONGO_URL` | MongoDB Atlas dev connection string |
| `DB_NAME` | `kaamnow_dev` |
| `JWT_SECRET` | Token signing key |
| `SHOW_OTP_IN_RESPONSE` | `true` in dev — OTP returned in API response (skip WhatsApp) |
| `GUPSHUP_SANDBOX_MODE` | `true` — WhatsApp sends only to opted-in numbers |
| `FEATURE_*` | Feature flags (OTP auth, AI, chat, payments, etc.) |

---

## 2 — Frontend (Web)

```bash
cd frontend
npm install
npm start
```

Runs at **http://localhost:3000**

The frontend proxies all `/api` calls to `http://localhost:8000` automatically.

### Admin dashboard

| URL | Credentials |
|-----|------------|
| http://localhost:3000/admin/login | Email: `support@kaamnow.com` Password: `2242@KaamNow` |

---

## 3 — Mobile (Expo)

```bash
cd mobile
npm install
npx expo start
```

- Press **i** for iOS simulator, **a** for Android emulator, **w** for web
- Scan the QR code with **Expo Go** on your phone for device testing

### Pointing mobile to local backend

The mobile app reads the API URL from `mobile/src/lib/api.js` (or similar config). For local testing, make sure it points to your machine's local IP (not `localhost` — phones can't reach that):

```js
// Replace with your machine's local IP, e.g.:
const BASE_URL = "http://192.168.1.42:8000/api";
```

Find your IP with `ifconfig | grep "inet "` (Mac/Linux) or `ipconfig` (Windows).

---

## 4 — Running Everything Together

Open three terminal tabs:

```bash
# Tab 1 — Backend
python3 -m uvicorn backend.app:app --reload --port 8000

# Tab 2 — Frontend
cd frontend && npm start

# Tab 3 — Mobile
cd mobile && npx expo start
```

---

## 5 — Seeding Dev Data

```bash
# From project root with venv active
python3 -m backend.seed         # basic seed (categories, test users)
python3 -m backend.seed_bulk    # bulk workers + jobs for a realistic marketplace
```

---

## 6 — Creating an Admin User

An admin user already exists in the dev MongoDB Atlas cluster (`kaamnow_dev`):

- **Email:** `support@kaamnow.com`
- **Password:** `2242@KaamNow`

To create a fresh one (e.g., after a DB reset), use the bootstrap endpoint:

```bash
curl -X POST http://localhost:8000/api/admin/bootstrap \
  -H "Content-Type: application/json" \
  -H "X-Bootstrap-Secret: kaamnow-admin-2026" \
  -d '{"email": "support@kaamnow.com", "password": "2242@KaamNow", "name": "KaamNow Admin"}'
```

---

## 7 — Deployment (CI/CD)

Pushes to `main`, `ui-ux`, or `user_to_user_flow` trigger the deploy pipeline:

```
push → GitHub Actions → SSH into EC2 → deploy/deploy-dev.sh
                                       ↓
                        Doppler pulls secrets (project: kaamnow, config: dev)
                                       ↓
                        Docker build → kind k8s cluster → dev.kaamnow.com
```

**Required GitHub secrets** (Settings → Secrets → Actions):

| Secret | Description |
|--------|-------------|
| `DOPPLER_TOKEN` | Doppler service token for `kaamnow/dev` |
| `DEV_EC2_HOST` | EC2 server IP |
| `DEV_EC2_USER` | SSH user (usually `ubuntu`) |
| `DEV_EC2_SSH_KEY` | SSH private key |
| `DEV_API_URL` | e.g. `https://dev.kaamnow.com` (for health check) |

The deploy script (`deploy/deploy-dev.sh`) handles everything: installs tools on first run, creates the kind cluster if missing, pulls secrets from Doppler, builds Docker images, and rolls out.

---

## 8 — Codebase Map (graphify)

This project maintains a **live knowledge graph** of all code, docs, and config.
Before touching anything unfamiliar, explore the graph first.

```bash
# In Claude Code chat:
/graphify kaamnow --update        # rebuild after changes
/graphify query "how does auth work"
/graphify explain "DummyDb"
```

Outputs:
- `graphify-out/graph.html` — open in browser, no server needed
- `graphify-out/obsidian/` — open as Obsidian vault
- `graphify-out/GRAPH_REPORT.md` — key nodes, connections, questions

---

## Project Structure

```
kaamnow/
├── backend/               # FastAPI app
│   ├── routers/           # Route handlers (auth, jobs, admin, chat, …)
│   ├── schemas.py         # Pydantic models
│   ├── db.py              # MongoDB connection
│   ├── auth.py            # JWT + password utils
│   ├── config.py          # Settings from env
│   ├── .env.dev           # Local dev secrets (safe to commit — dev only)
│   └── requirements.txt
├── frontend/              # React web app (Vite)
│   └── src/
│       ├── pages/         # Landing, Login, PostJob, AdminDashboard, …
│       ├── components/    # Navbar, KaamSaathi, TrustBadge, …
│       └── contexts/      # AuthContext, LanguageContext
├── mobile/                # Expo React Native app
│   └── src/
│       ├── screens/       # All app screens
│       ├── components/    # WorkerCard, TrustBadge, …
│       └── contexts/      # AuthContext
├── deploy/
│   ├── deploy-dev.sh      # Main deploy script
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   └── k8s/dev/           # k8s manifests for dev cluster
└── .github/workflows/
    ├── deploy-dev.yml     # Auto-deploy on push
    └── ci.yml             # Lint (black + isort)
```

See [CLAUDE.md](CLAUDE.md) for AI assistant standards and rules.
