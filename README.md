# KaamNow — Local Setup Guide

Blue-collar gig marketplace. This guide gets you running the full app locally from scratch.

---

## What you'll be running

- **Backend** — Python API (FastAPI) on `http://localhost:8000`
- **Frontend** — React web app on `http://localhost:3000`
- **Mobile** — Expo app (scan QR with your phone or use simulator)

---

## Step 1 — Clone the repo

```bash
git clone git@github.com:KaamNow/kaamnow.git
cd kaamnow
```

---

## Step 2 — Backend setup

### 2.1 Install Python

You need **Python 3.11 or 3.12**. Check what you have:

```bash
python3 --version
```

If you don't have it, download from [python.org](https://www.python.org/downloads/).

### 2.2 Create a virtual environment

```bash
# Run this from the project root (kaamnow/)
python3 -m venv .venv
```

### 2.3 Activate the virtual environment

```bash
# Mac / Linux
source .venv/bin/activate

# Windows
.venv\Scripts\activate
```

You'll see `(.venv)` at the start of your terminal prompt. You need this active every time you work on the backend.

### 2.4 Install backend dependencies

```bash
pip install -r backend/requirements.txt
```

This takes 1–2 minutes the first time.

### 2.5 Set up environment variables

The dev environment file is already in the repo at `backend/.env.dev`. It has everything pre-configured — MongoDB, API keys, feature flags. You don't need to create or edit anything.

### 2.6 Start the backend

> **Important:** Run this from the project root (`kaamnow/`), not from inside the `backend/` folder.

```bash
python3 -m uvicorn backend.app:app --reload --port 8000
```

You should see:

```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

**Test it:** Open [http://localhost:8000/docs](http://localhost:8000/docs) in your browser — you'll see the full API documentation.

---

## Step 3 — Frontend setup

Open a **new terminal tab** (keep the backend running in the first one).

### 3.1 Install Node.js

You need **Node.js 18 or higher**. Check:

```bash
node --version
```

If you don't have it, download from [nodejs.org](https://nodejs.org/).

### 3.2 Install and start

```bash
cd frontend
npm install       # takes a few minutes first time
npm start
```

The browser will open automatically at [http://localhost:3000](http://localhost:3000).

---

## Step 4 — Mobile setup

Open a **third terminal tab**.

### 4.1 Install Expo Go on your phone

Download **Expo Go** from the App Store or Google Play. You'll use this to run the app on your phone.

### 4.2 Install and start

```bash
cd mobile
npm install
npx expo start
```

You'll see a QR code in the terminal. Scan it with:
- **iPhone** — use the Camera app
- **Android** — use the Expo Go app

### 4.3 Running on a simulator instead of a phone

Press `i` for iOS simulator (Mac only, needs Xcode) or `a` for Android emulator (needs Android Studio).

### 4.4 Pointing the mobile app to your local backend

Phones can't connect to `localhost` — they need your computer's actual local IP address.

Find your IP:
```bash
# Mac / Linux
ifconfig | grep "inet " | grep -v 127.0.0.1

# Windows
ipconfig
```

Look for something like `192.168.1.42`. Then update the API URL in `mobile/src/lib/api.js` to use that IP:

```js
const BASE_URL = "http://192.168.1.42:8000/api";
```

---

## Step 5 — Verify everything is working

With all three running, open the app and try:

1. Go to [http://localhost:3000](http://localhost:3000) — landing page should load
2. Sign up with a phone number — OTP will appear directly in the backend terminal (no real SMS needed, `SHOW_OTP_IN_RESPONSE=true` is set in dev)
3. Post a job
4. Open the mobile app and browse workers

---

## Step 6 — Load sample data (optional but recommended)

With the backend running and your venv active:

```bash
python3 -m backend.seed          # creates test categories and a few users
python3 -m backend.seed_bulk     # creates ~50 workers and jobs for a realistic marketplace
```

---

## Common issues

**Backend crashes on startup**
- Make sure you're running from the project root (`kaamnow/`), not from inside `backend/`
- Make sure your venv is activated — you should see `(.venv)` in your prompt

**`npm install` fails**
- Make sure your Node version is 18+: `node --version`
- Try deleting `node_modules/` and running `npm install` again

**Mobile app can't connect to backend**
- You're probably using `localhost` — replace it with your machine's local IP (see Step 4.4)
- Make sure your phone and computer are on the same Wi-Fi network

**OTP not working**
- In dev, the OTP appears in the backend terminal output — look for `OTP: 123456`
- You don't need a real phone number for dev

---

## Admin access

Ask your team lead for admin credentials. Do not commit credentials to this repo.

---

## Project structure (quick map)

```
kaamnow/
├── backend/           # Python FastAPI — all business logic and DB
│   ├── routers/       # One file per feature: auth, jobs, admin, chat…
│   ├── schemas.py     # Data shapes (Pydantic models)
│   ├── db.py          # MongoDB connection
│   └── .env.dev       # Dev environment variables
├── frontend/          # React web app (Vite)
│   └── src/
│       ├── pages/     # Full pages: Landing, Login, PostJob, AdminDashboard…
│       └── components/# Reusable UI pieces
├── mobile/            # Expo React Native app
│   └── src/
│       └── screens/   # All mobile screens
└── deploy/            # Docker + Kubernetes config for production
```

---

## Deployment

Pushing to the `user_to_user_flow`, `ui-ux`, or `main` branch automatically deploys to [dev.kaamnow.com](https://dev.kaamnow.com) via GitHub Actions. You don't need to do anything manually.

---

## Questions?

Ping the team on Slack or check [CLAUDE.md](CLAUDE.md) for AI assistant standards and codebase conventions.
