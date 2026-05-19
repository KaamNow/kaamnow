# KaamNow v2 — Complete Tech Stack & Tools

**Last updated:** May 2026 | **Sprint deadline:** June 15, 2026

> All costs are for the **testing/dev phase**. Production costs noted separately where different.

---

## 1. Languages

| Language | Used For | Version | Cost |
|---|---|---|---|
| **Python** | Backend (FastAPI) | 3.11 | Free |
| **JavaScript / JSX** | Mobile (React Native), Admin Dashboard | ES2022 | Free |
| **Dart** | ❌ Not used — Flutter rejected for this sprint | — | — |

---

## 2. Backend Framework & Libraries

| Library | Purpose | Version | Cost |
|---|---|---|---|
| **FastAPI** | REST API framework | 0.110.1 | Free |
| **Uvicorn** | ASGI server (runs FastAPI) | 0.25.0 | Free |
| **Pydantic v2** | Request/response validation, schema enforcement | ≥2.6.4 | Free |
| **Motor** | Async MongoDB driver | 3.3.1 | Free |
| **PyMongo** | Sync MongoDB driver (seeding, scripts) | 4.5.0 | Free |
| **PyJWT** | JWT token creation and verification | ≥2.10.1 | Free |
| **bcrypt** | Password hashing | 4.1.3 | Free |
| **passlib** | Password utility wrappers | ≥1.7.4 | Free |
| **python-jose** | JOSE token utilities | ≥3.3.0 | Free |
| **slowapi** | Rate limiting (per IP, per phone) | ≥0.1.9 | Free |
| **python-multipart** | File upload handling | ≥0.0.9 | Free |
| **python-dotenv** | Env var loading (dev only) | ≥1.0.1 | Free |
| **httpx** | Async HTTP client (AI API calls) | ≥0.27.0 | Free |
| **requests** | Sync HTTP client (Gupshup, pincode API) | ≥2.31.0 | Free |
| **tzdata** | Timezone data (IST scheduling) | ≥2024.2 | Free |
| **cryptography** | Cryptographic utilities | ≥42.0.8 | Free |
| **email-validator** | Email format validation | ≥2.2.0 | Free |
| **typer** | CLI for seed scripts | ≥0.9.0 | Free |
| **ReportLab** | PDF generation (completion certificates) | ≥4.0.0 | Free |
| **qrcode[pil]** | QR code image generation | ≥7.4.2 | Free |
| **Pillow** | Image processing (for QR + PDF) | ≥10.0.0 | Free |

---

## 3. Mobile App

### Core Framework

| Tool | Purpose | Version | Cost |
|---|---|---|---|
| **Expo SDK** | React Native managed workflow | ~54.0.0 | Free |
| **React Native** | Cross-platform mobile framework | 0.81.5 | Free |
| **React** | UI library | 19.1.0 | Free |
| **EAS (Expo Application Services)** | Build APK / IPA for app stores | — | Free tier: 30 builds/month |

### Navigation

| Library | Purpose | Version | Cost |
|---|---|---|---|
| **React Navigation v7** | Screen navigation, tab bars, stacks | ^7.0.0 | Free |
| **React Navigation Bottom Tabs** | Bottom tab bar | ^7.0.0 | Free |
| **React Navigation Stack** | Stack (push/pop) navigation | ^7.0.0 | Free |

### Premium UI/UX Libraries

| Library | Purpose | Version | Cost | Why |
|---|---|---|---|---|
| **React Native Reanimated v3** | 60fps animations on UI thread — no JS bridge jank | ~3.10.0 | Free | Makes the app feel truly native |
| **React Native Gesture Handler** | Native swipe, drag, pinch, long-press | ~2.16.0 | Free | Makes gestures feel native |
| **Lottie React Native** | JSON-based animations for empty states, success, loading | 7.1.0 | Free | Premium visual quality |
| **React Native Maps** | Google Maps display (already installed) | 1.20.1 | Free* | Worker locations, job pins |
| **React Native WebView** | Chatwoot support chat embed | 13.8.6 | Free | In-app support |

*Google Maps SDK for Android requires an API key but is **free** up to 28,000 map loads/month.

### Expo Native Modules

| Module | Purpose | Cost |
|---|---|---|
| **expo-location** | GPS coordinates capture | Free |
| **expo-av** | Audio recording (voice-to-job, voice messages) | Free |
| **expo-image-picker** | Camera + gallery photo/video selection | Free |
| **expo-notifications** | Push notification registration + handling | Free |
| **expo-secure-store** | Encrypted token storage on device | Free |
| **expo-constants** | Access to `app.json` config at runtime | Free |
| **expo-linking** | Deep link handling (`kaamnow://`) | Free |

### Networking & State

| Library | Purpose | Version | Cost |
|---|---|---|---|
| **Axios** | HTTP API calls | ^1.7.7 | Free |

### Animations Asset Source

| Resource | Purpose | Cost |
|---|---|---|
| **LottieFiles.com** | Free Lottie JSON animations (empty states, success, loading) | Free |

---

## 4. Admin Dashboard (Web)

| Tool | Purpose | Version | Cost |
|---|---|---|---|
| **React 19** | Admin UI framework (existing) | 19.x | Free |
| **React Router v7** | Admin page routing | ^7.5 | Free |
| **Radix UI** | Accessible UI primitives | latest | Free |
| **Tailwind CSS** | Utility-first styling | ^3.x | Free |
| **shadcn/ui** | Pre-built Radix components | latest | Free |
| **Recharts** | Charts for earnings, analytics | ^2.x | Free |
| **Sonner** | Toast notifications | latest | Free |

---

## 5. Database

| Service | Purpose | Plan | Cost |
|---|---|---|---|
| **MongoDB Atlas** (kaamnow-dev cluster) | Dev database — all collections | M0 Free Tier | **Free** — 512MB storage, shared cluster |
| **MongoDB Atlas** (prod cluster) | Production database | M10+ | ~$57/month (post-launch) |
| **PostgreSQL** | Chatwoot internal database (self-hosted) | — | **Free** — runs on own k8s |
| **Redis** | Chatwoot session cache (self-hosted) | — | **Free** — runs on own k8s |

---

## 6. AI & Machine Learning

| Service | Purpose | Model | Free Tier | Cost Beyond Free |
|---|---|---|---|---|
| **Google Gemini Flash** | Text generation (job form fill, bio, smart notifications), Vision (cert OCR, photo-to-job) | gemini-1.5-flash | 1,500 req/day, 1M tokens/day | $0.075/1M input tokens |
| **Groq** | Voice transcription (Hindi, Bhojpuri, Maithili, English) | whisper-large-v3 | 28,800 seconds audio/day (~8hrs) | $0.111/audio hour |
| **ML Kit (Google)** | On-device selfie liveness detection — profile verification | Built into Android | **Free — runs on-device, no API** | Free |

**All three are free for the testing phase. Zero AI cost to launch.**

---

## 7. Authentication & OTP

| Service | Purpose | Cost |
|---|---|---|
| **JWT (PyJWT)** | Access token generation + verification | Free |
| **bcrypt** | Password hashing | Free |
| **Gupshup** | WhatsApp OTP delivery + outbound notifications | Existing contract — already paying |

---

## 8. Media Storage

| Service | Purpose | Free Tier | Cost Beyond Free |
|---|---|---|---|
| **Cloudinary** | Profile photos, portfolio (up to 6), certifications, job photos, intro videos, voice clips, review photos | 25GB storage, 25GB bandwidth/month | $89/month for next tier |

**Folder structure:**
```
kaamnow/profiles/        ← profile photos
kaamnow/portfolio/       ← Local Expert portfolio (up to 6)
kaamnow/certifications/  ← cert images (admin verifies)
kaamnow/job-photos/      ← before/after + progress photos
kaamnow/videos/          ← 30s intro videos
kaamnow/audio/           ← voice messages in chat
kaamnow/reviews/         ← rating photos
```

---

## 9. Push Notifications

| Service | Purpose | Cost |
|---|---|---|
| **Expo Push Notification Service** | Push notifications to iOS + Android | **Free forever** — no limits |
| **Gupshup WhatsApp** | WhatsApp notification fallback | Existing contract |

---

## 10. Payments

| Service | Purpose | Mode | Cost |
|---|---|---|---|
| **Razorpay** | UPI / card payment processing | **Test mode** | **Free** — unlimited test transactions |
| Razorpay | Production payments | Live mode | 2% per transaction (post-launch) |

---

## 11. Maps & Location

| Service | Purpose | Free Tier | Cost Beyond Free |
|---|---|---|---|
| **Google Maps SDK (Android)** | Map display in react-native-maps | 28,000 map loads/month | $7 per 1,000 extra loads |
| **Google Maps Geocoding API** | Reverse geocode GPS coords → pincode + village | $200/month credit (~40,000 req) | $5 per 1,000 extra |
| **api.postalpincode.in** | Pincode → district/state lookup (existing) | **Completely free** — no auth needed | Free |

**For testing phase: well within free tier. Google gives $200/month free Maps credit.**

---

## 12. Analytics

| Service | Purpose | Free Tier | Cost Beyond Free |
|---|---|---|---|
| **PostHog** | Product analytics — screen views, funnel tracking, feature usage | 1 million events/month | $0.000225/event after |
| **PostHog** | Feature flags | Free | Free |

---

## 13. Error Monitoring

| Service | Purpose | Free Tier | Cost Beyond Free |
|---|---|---|---|
| **Sentry** | Error tracking — backend (FastAPI) + mobile (Expo) | 5,000 errors/month, 10,000 performance events | $26/month for next tier |

---

## 14. Support Chat

| Service | Purpose | Hosting | Cost |
|---|---|---|---|
| **Chatwoot** | In-app "Chat with Us" support | **Self-hosted on own k8s cluster** | **Free forever** — open source |
| Chatwoot Cloud | Alternative (hosted by them) | — | $19/month for 2 agents |

**We self-host — so completely free. Needs: 1 Postgres pod + 1 Redis pod + 1 Chatwoot pod on k8s.**

---

## 15. KYC / Identity Verification

| Service | Purpose | Cost |
|---|---|---|
| **DigiLocker API** | Aadhaar / driving licence / voter ID verification | **Free** — Indian Government API |
| **ML Kit** | Selfie liveness detection (prevents fake profile photos) | **Free** — on-device, no API call |

---

## 16. PDF & QR Generation

| Library | Purpose | Cost |
|---|---|---|
| **ReportLab** | Completion certificate PDF generation | **Free** — Python library |
| **qrcode[pil]** | Local Expert profile QR code | **Free** — Python library |

---

## 17. Credential Store

| Service | Purpose | Free Tier | Cost Beyond Free |
|---|---|---|---|
| **Doppler** | Secret/env var management — all environments | 3 projects, unlimited secrets | $10/month per additional project |

**Replaces:** All `.env` files, manual k8s secret management, hardcoded values.
**Integrates with:** Local dev (CLI), Kubernetes (operator), EAS mobile builds (CLI inject).

---

## 18. Deployment & Infrastructure

| Tool / Service | Purpose | Cost |
|---|---|---|
| **Docker** | Container build for backend + frontend | Free |
| **kind (Kubernetes in Docker)** | Single-node k8s cluster on server | Free |
| **kubectl** | k8s CLI | Free |
| **NGINX Ingress Controller** | Route `/api/*` → backend, `/*` → frontend | Free |
| **cert-manager** | Auto-issue Let's Encrypt SSL certificates | Free |
| **Let's Encrypt** | Free HTTPS certificates | **Free** |
| **Oracle Cloud Free Tier** | Server hosting (ARM VM, 4 OCPU, 24GB RAM) | **Free forever** |
| **OR: AWS EC2 t3.small** | Alternative server | ~$15/month |

---

## 19. CI/CD & Build

| Tool | Purpose | Cost |
|---|---|---|
| **EAS (Expo Application Services)** | Build Android APK + iOS IPA | Free: 30 builds/month |
| **GitHub Actions** | Optional CI (run tests on push) | Free: 2,000 min/month |
| **deploy-dev.sh** | One-command dev deployment (custom script) | Free |

---

## 20. Testing

| Tool | Purpose | Cost |
|---|---|---|
| **pytest** | Backend unit + integration tests | Free |
| **pytest-asyncio** | Async test support | Free |
| **FastAPI TestClient** | HTTP endpoint testing | Free |
| **DummyDb (custom)** | In-memory MongoDB mock for tests | Free (our own code) |

---

## 21. Code Quality

| Tool | Purpose | Cost |
|---|---|---|
| **black** | Python code formatter | Free |
| **isort** | Python import sorter | Free |
| **flake8** | Python linter | Free |
| **mypy** | Python type checker | Free |

---

## 22. Development Tools

| Tool | Purpose | Cost |
|---|---|---|
| **Doppler CLI** | `doppler run -- uvicorn...` for local dev | Free |
| **mongosh** | MongoDB shell for DB inspection | Free |
| **Expo Go** | Test mobile app on physical device without building | Free |

---

## Cost Summary — Testing Phase

| Category | Service | Monthly Cost |
|---|---|---|
| Database | MongoDB Atlas (dev M0) | **₹0** |
| AI Text + Vision | Google Gemini Flash | **₹0** |
| AI Voice | Groq Whisper | **₹0** |
| Mobile Build | EAS | **₹0** |
| Push Notifications | Expo Push | **₹0** |
| Analytics | PostHog | **₹0** |
| Error Monitoring | Sentry | **₹0** |
| Support Chat | Chatwoot (self-hosted) | **₹0** |
| Media Storage | Cloudinary (25GB free) | **₹0** |
| Credentials | Doppler (3 projects free) | **₹0** |
| KYC | DigiLocker API | **₹0** |
| Payments | Razorpay (test mode) | **₹0** |
| Maps | Google Maps ($200 credit) | **₹0** |
| SSL | Let's Encrypt | **₹0** |
| Server | Oracle Cloud Free Tier | **₹0** |
| WhatsApp OTP | Gupshup | Existing contract |
| **TOTAL** | | **₹0 / month** |

---

## Cost Summary — Post-Launch (Production Estimates)

| Category | Service | Estimated Monthly |
|---|---|---|
| Database | MongoDB Atlas M10 | ~₹4,700 ($57) |
| Server | AWS EC2 t3.small (if not Oracle) | ~₹1,250 ($15) |
| Media | Cloudinary (if > 25GB) | ~₹7,400 ($89) |
| Payments | Razorpay | 2% per transaction |
| AI | Gemini Flash (if > free tier) | ~₹0.006/1K tokens |
| WhatsApp | Gupshup | Existing |
| **TOTAL (early stage)** | | **~₹13,000–15,000/month** |

---

## Tech Stack at a Glance

```
BACKEND          Python 3.11 + FastAPI + MongoDB Atlas + Motor
MOBILE           React Native (Expo SDK 54) + Reanimated v3
ADMIN WEB        React 19 + Tailwind + Radix UI
AI               Gemini 1.5 Flash (text/vision) + Groq Whisper (voice)
DATABASE         MongoDB Atlas (dev: free M0)
MEDIA            Cloudinary CDN
PAYMENTS         Razorpay (test mode)
AUTH             JWT + bcrypt + Gupshup WhatsApp OTP
PUSH             Expo Push Notifications
MAPS             Google Maps SDK + react-native-maps
ANALYTICS        PostHog
MONITORING       Sentry
SUPPORT          Chatwoot (self-hosted k8s)
KYC              DigiLocker API + ML Kit (liveness)
SECRETS          Doppler
INFRA            Docker + kind (k8s) + NGINX + cert-manager
BUILD            EAS (Expo Application Services)
LANGUAGES        EN + HI + Bhojpuri + Maithili
```
