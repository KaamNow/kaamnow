# KaamNow v2 — Architecture & Flow Diagrams

> Open this file in VS Code with the **Markdown Preview** panel to see all diagrams rendered.
> Install the **"Markdown Preview Mermaid Support"** VS Code extension if diagrams don't render.

---

## 1. System Architecture — High Level

```mermaid
graph TB
    subgraph USERS["👥 Users"]
        U1["📱 Customer\n(Mobile App)"]
        U2["📱 Local Expert\n(Mobile App)"]
        U3["💻 Admin\n(Web Browser)"]
    end

    subgraph MOBILE["📱 Mobile App — Expo React Native"]
        M1["Navigation Layer\n(React Navigation v7)"]
        M2["Auth Context\n(JWT + SecureStore)"]
        M3["Language Context\n(EN / HI / Bhojpuri / Maithili)"]
        M4["Screens & Components\n(13 screens)"]
        M5["Reanimated + Lottie\n(60fps animations)"]
    end

    subgraph ADMIN["💻 Admin Dashboard — React"]
        A1["AdminDashboard.jsx\n(Reports, FAQs, Users, Wallet)"]
    end

    subgraph API["⚙️ Backend API — FastAPI (Python 3.11)"]
        B1["Auth Router"]
        B2["Workers Router"]
        B3["Jobs Router"]
        B4["Engagements Router"]
        B5["Chat Router"]
        B6["Wallet Router"]
        B7["AI Router"]
        B8["Reports Router"]
        B9["Legal + FAQ Router"]
        B10["Payments Router"]
        B11["Notifications Router"]
        B12["Admin Router"]
        B13["Referrals Router"]
    end

    subgraph DATA["🗄️ Data Layer"]
        DB["MongoDB Atlas\n(kaamnow-dev)"]
        CDN["Cloudinary CDN\n(Photos, Videos, Audio, PDFs)"]
    end

    subgraph EXTERNAL["🌐 External Services"]
        E1["Google Gemini Flash\n(AI Text + Vision)"]
        E2["Groq Whisper\n(Voice Transcription)"]
        E3["Expo Push\n(Notifications)"]
        E4["Gupshup\n(WhatsApp OTP + Alerts)"]
        E5["Razorpay\n(Payments - Test Mode)"]
        E6["Google Maps\n(Maps + Geocoding)"]
        E7["DigiLocker API\n(KYC Verification)"]
        E8["PostHog\n(Analytics)"]
        E9["Sentry\n(Error Monitoring)"]
        E10["Doppler\n(Secrets Management)"]
        E11["Chatwoot\n(Support Chat - Self-hosted)"]
    end

    U1 --> MOBILE
    U2 --> MOBILE
    U3 --> ADMIN

    MOBILE -->|HTTPS REST| API
    ADMIN -->|HTTPS REST| API

    API --> DB
    API --> CDN
    API --> E1
    API --> E2
    API --> E3
    API --> E4
    API --> E5
    API --> E7
    API --> E11

    MOBILE --> E6
    MOBILE --> E8
    MOBILE --> E9
    MOBILE --> E11

    E10 -.->|Injects secrets| API
    E10 -.->|Injects secrets| MOBILE
```

---

## 2. Component Interaction Map

```mermaid
graph LR
    subgraph MOBILE_LAYER["Mobile App"]
        AUTH["AuthContext\n(user state)"]
        LANG["LanguageContext\n(t() translation)"]
        API_CLIENT["api.js\n(Axios + token)"]
        SCREENS["Screens"]
    end

    subgraph BACKEND_LAYER["Backend (FastAPI)"]
        ROUTER["Routers"]
        SERVICES["Services\n(AI, PDF, QR, Payment)"]
        I18N["i18n\n(en / hi / bho / mai)"]
        NOTIFY["_notify()\n(push + WhatsApp)"]
    end

    subgraph DB_LAYER["Database"]
        USERS_COL["users"]
        WORKERS_COL["workers"]
        JOBS_COL["jobs"]
        ENG_COL["engagements"]
        MSG_COL["messages"]
        WALLET_COL["wallet_transactions"]
        NOTIF_COL["notifications"]
        FAQ_COL["faqs"]
        REPORTS_COL["reports"]
    end

    SCREENS --> AUTH
    SCREENS --> LANG
    SCREENS --> API_CLIENT
    API_CLIENT -->|Bearer JWT| ROUTER
    ROUTER --> SERVICES
    ROUTER --> DB_LAYER
    SERVICES --> I18N
    SERVICES --> NOTIFY
    NOTIFY -->|push_token| E_PUSH["Expo Push"]
    NOTIFY -->|phone_primary| E_WA["Gupshup WhatsApp"]
    I18N -->|preferred_language| NOTIFY
```

---

## 3. User Signup & Onboarding Flow

```mermaid
flowchart TD
    START(["User opens app"]) --> GUEST["Guest Landing Screen"]
    GUEST --> TAP["Taps 'Join Free'"]
    TAP --> PHONE["Enter phone number\n(+91XXXXXXXXXX)"]
    PHONE --> OTP_SEND["POST /api/auth/send-otp\n→ Gupshup WhatsApp OTP"]
    OTP_SEND --> OTP_ENTER["Enter 6-digit OTP"]
    OTP_ENTER --> OTP_VERIFY["POST /api/auth/verify-otp\n→ returns temp token"]
    OTP_VERIFY --> TERMS["Show T&C screen\n(must scroll + accept)"]
    TERMS --> ACCEPT["POST /api/auth/accept-terms\n→ stores tc_accepted_at"]
    ACCEPT --> NAME["Enter name + gender (optional)"]
    NAME --> SIGNUP["POST /api/auth/signup-complete\n→ is_worker=False, is_customer=True\n→ referral_code generated\n→ wallet_balance=0"]
    SIGNUP --> HOME["Home Screen\n(unified tab bar)"]

    HOME --> WANT_WORK{"Want to\nfind work?"}
    WANT_WORK -->|Yes| BECOME["Tap 'Become a Local Expert'\n(ProfileScreen)"]
    BECOME --> SHEET["BecomeExpertSheet\n3-step bottom sheet"]
    SHEET --> S1["Step 1: Select Skills"]
    S1 --> S2["Step 2: Daily rate + GPS location"]
    S2 --> S3["Step 3: Bio (optional, AI generate)"]
    S3 --> BECOME_API["POST /api/workers/become-worker\n→ users.is_worker = True"]
    BECOME_API --> EXPERT["Now a Local Expert\n(Profile shows worker section)"]
```

---

## 4. Post a Job Flow (with AI)

```mermaid
flowchart TD
    START(["Customer taps 'Post a Job'"]) --> CHOOSE{"How to\ndescribe job?"}

    CHOOSE -->|Type manually| STEP1["Step 1: Category + Skill"]
    CHOOSE -->|🎤 Voice| VOICE["Hold mic → Record audio\n(expo-av)"]
    CHOOSE -->|📷 Photo| PHOTO["Camera/picker → job site photo"]

    VOICE --> TRANSCRIBE["POST /api/ai/voice-to-job\n→ Groq Whisper transcribes\n→ Gemini extracts fields"]
    PHOTO --> DESCRIBE["POST /api/ai/photo-to-job\n→ Gemini Vision identifies job"]

    TRANSCRIBE --> PREFILL["Form auto-filled\n(title, category, skill, rate, date)"]
    DESCRIBE --> PREFILL
    STEP1 --> STEP2

    PREFILL --> CONFIRM["User confirms / edits"]
    CONFIRM --> STEP2["Step 2: Job details\n(title, description, workers needed)"]
    STEP2 --> STEP3["Step 3: Location\n(GPS auto-fill or manual pincode)"]
    STEP3 --> GPS{"Use GPS?"}
    GPS -->|Yes| CAPTURE["expo-location.getCurrentPositionAsync()\n→ lat/lng captured\n→ reverse geocode → pincode + village"]
    GPS -->|No| MANUAL["Type pincode manually\n→ api.postalpincode.in lookup"]
    CAPTURE --> STEP4
    MANUAL --> STEP4

    STEP4["Step 4: Review + Options\n(urgency, recurrence, anonymous toggle)"]
    STEP4 --> POST["POST /api/jobs\n→ ai_generated=true if AI used\n→ alerts matching Local Experts"]
    POST --> ALERTS["Background: find Local Experts\nin same pincode with matching skills\n→ push notification to each"]
    POST --> SUCCESS["✅ Job posted!\n(Lottie success animation)"]
```

---

## 5. Engagement Lifecycle (Full Flow)

```mermaid
stateDiagram-v2
    [*] --> requested: Local Expert applies\nOR Customer books

    requested --> accepted: Responding party accepts
    requested --> rejected: Responding party declines
    requested --> cancelled: Either party cancels

    accepted --> otp_verified: Customer shares OTP\nLocal Expert enters it
    otp_verified --> checked_in: Local Expert GPS check-in\n(within 1km of job site)
    checked_in --> in_progress: Work started
    in_progress --> progress_updates: Local Expert sends\nprogress photos/status
    progress_updates --> completed: Local Expert marks done\n+ uploads after photos

    accepted --> cancelled: Either party cancels\n(local expert tracked)

    completed --> rated_by_customer: Customer leaves review\n(1-5 stars + comment + photos)
    completed --> rated_by_expert: Local Expert rates customer

    rated_by_customer --> [*]: Badge check → tier check → done
    rated_by_expert --> [*]: Done

    rejected --> [*]
    cancelled --> [*]
```

---

## 6. Notification Flow

```mermaid
flowchart LR
    ACTION["Any key action\n(accept, reject, complete,\nchat, payment, badge)"]

    ACTION --> NOTIFY["_notify() function\n(backend/engagements.py)"]

    NOTIFY --> LANG_CHECK["Check recipient's\npreferred_language"]
    LANG_CHECK --> I18N_SELECT["Select copy from\nbackend/i18n/\n(en / hi / bho / mai)"]
    I18N_SELECT --> BUILD["Build notification:\n{ title, body, kind, ref_id, deep_link }"]

    BUILD --> IN_APP["Insert into\ndb.notifications\n(in-app bell)"]
    BUILD --> PUSH{"push_token\nexists?"}
    BUILD --> WA{"phone_primary\nexists?"}

    PUSH -->|Yes| EXPO["Expo Push Service\n→ iOS + Android push"]
    WA -->|Yes| GUPSHUP["Gupshup WhatsApp\n→ text message"]

    EXPO --> DEVICE["📱 Device receives push"]
    DEVICE --> TAP{"User taps\nnotification"}
    TAP --> DEEPLINK["Deep link handler\nkaamnow://engagement/:id"]
    DEEPLINK --> SCREEN["Opens EngagementDetailScreen\ndirectly"]
```

---

## 7. Wallet & Referral Flow

```mermaid
flowchart TD
    USER_A["User A signs up"] --> CODE["Gets referral_code: ABC123"]
    CODE --> SHARE["Shares link:\nkaamnow.com/join?ref=ABC123"]
    SHARE --> USER_B["User B opens link\nand signs up"]
    USER_B --> STORED["users.referred_by = User A's id"]

    STORED --> B_FIRST_JOB["User B completes\ntheir first booking"]
    B_FIRST_JOB --> CHECK["Backend checks:\nis this B's first completed engagement?"]

    CHECK -->|Yes| CREDIT_A["credit_wallet(User A, ₹100,\n'referral_reward')"]
    CHECK -->|Yes| CREDIT_B["credit_wallet(User B, ₹50,\n'referral_bonus')"]

    CREDIT_A --> NOTIFY_A["Notify User A:\n'₹100 added to your wallet!'"]
    CREDIT_B --> NOTIFY_B["Notify User B:\n'₹50 welcome bonus added!'"]

    CREDIT_A --> EXPIRY["Credit expires in 90 days\n(expires_at = now + 90d)"]
    CREDIT_B --> EXPIRY

    EXPIRY --> DAILY_JOB["Daily background job:\nexpire_wallet_credits()\nFinds expired credits → debits balance"]

    CREDIT_A --> SPEND{"Spend credits?"}
    SPEND -->|Job boost| DEBIT["debit_wallet(user, amount,\n'job_boost')"]
    SPEND -->|Priority listing| DEBIT
```

---

## 8. AI Features Flow

```mermaid
flowchart TD
    subgraph VOICE["🎤 Voice-to-Job"]
        V1["User holds mic button\n(expo-av records)"] --> V2["Audio uploaded to\nPOST /api/ai/voice-to-job"]
        V2 --> V3["Groq Whisper\ntranscribes audio → text\n(supports Hindi, Bhojpuri, Maithili)"]
        V3 --> V4["Gemini Flash\nextracts structured fields:\ntitle, category, skill, rate, date"]
        V4 --> V5["Form auto-filled\nUser confirms + posts"]
    end

    subgraph PHOTO["📷 Photo-to-Job"]
        P1["User takes photo of\njob site / broken item"] --> P2["Image uploaded to\nPOST /api/ai/photo-to-job"]
        P2 --> P3["Gemini Flash Vision\nidentifies: what needs doing,\ncategory, suggested skill"]
        P3 --> P4["Form auto-filled\nUser confirms + posts"]
    end

    subgraph CERT["📜 Cert OCR"]
        C1["Local Expert uploads\ncertification image"] --> C2["POST /api/ai/describe-cert"]
        C2 --> C3["Gemini Flash Vision\nreads: cert name, issued by, year, skill"]
        C3 --> C4["Fields auto-filled\nUser confirms + saves"]
    end

    subgraph BIO["✍️ Bio Generator"]
        B1["Local Expert taps\n'Generate my bio'"] --> B2["POST /api/ai/generate-bio\n(skills, rate, jobs, rating, language)"]
        B2 --> B3["Gemini Flash\nwrites 2-sentence bio\nin user's language"]
        B3 --> B4["Bio pre-filled\nUser edits + saves"]
    end
```

---

## 9. Chat Flow

```mermaid
sequenceDiagram
    participant C as Customer
    participant API as FastAPI Backend
    participant DB as MongoDB
    participant LE as Local Expert

    Note over C,LE: Engagement must be "accepted" for chat to be enabled

    C->>API: POST /api/chat/{engagement_id}/send\n{ text: "Are you coming tomorrow?" }
    API->>DB: Insert message doc\n{ sender_id, receiver_id, text, read: false }
    API->>API: _notify(LE, "new_message", engagement_id)
    API-->>C: { id, text, created_at }
    API->>LE: Push notification:\n"Message from Customer"

    LE->>API: GET /api/chat/{engagement_id}/messages
    API->>DB: Find messages, mark unread → read
    API-->>LE: [ ...messages ]

    LE->>API: POST /api/chat/{engagement_id}/send\n{ text: "Yes, I'll be there at 9am" }
    API->>DB: Insert message doc
    API->>API: _notify(C, "new_message", engagement_id)
    API-->>LE: { id, text, created_at }
    API->>C: Push notification:\n"Message from Local Expert"

    Note over C,LE: Polling every 4 seconds keeps both sides in sync
```

---

## 10. OTP Job Start Flow (Swiggy-style)

```mermaid
sequenceDiagram
    participant C as Customer App
    participant API as FastAPI Backend
    participant LE as Local Expert App

    Note over C,LE: Engagement status = "accepted"

    C->>API: POST /api/engagements/{id}/generate-start-otp
    API->>API: Generate 4-digit OTP\nStore in engagements.start_otp
    API-->>C: { message: "Code sent to you" }
    Note over C: Customer sees: 4-digit code\n"Share this with your Local Expert\nwhen they arrive"

    Note over C,LE: Customer verbally tells Local Expert the code

    LE->>API: POST /api/engagements/{id}/verify-start-otp\n{ otp: "7391" }
    API->>API: Validate OTP matches\nClear start_otp (security)\nSet otp_verified_at = now
    API->>API: _notify(C, "job_progress", "Local Expert has arrived and started work")
    API-->>LE: { verified: true }
    Note over LE: "Job has started" confirmation\n(Lottie success animation)
```

---

## 11. Data Flow — Complete Picture

```mermaid
flowchart TB
    subgraph INPUT["User Inputs"]
        TEXT["Text input"]
        VOICE_IN["Voice recording"]
        PHOTO_IN["Photo / Video"]
        GPS_IN["GPS location"]
        OTP_IN["OTP code"]
    end

    subgraph PROCESSING["Backend Processing"]
        VALIDATE["Pydantic validation\n+ security checks"]
        AI_PROC["AI Processing\n(Gemini + Groq)"]
        BIZ["Business logic\n(engagements, wallet, referrals)"]
        NOTIFY_PROC["Notification dispatch\n(_notify() → language-aware)"]
    end

    subgraph STORAGE["Storage"]
        MONGO["MongoDB Atlas\n(all structured data)"]
        CLOUD["Cloudinary CDN\n(all media files)"]
        SECURE["Doppler\n(all secrets)"]
    end

    subgraph OUTPUT["User Output"]
        SCREEN_OUT["Screen renders\n(translated via t() hook)"]
        PUSH_OUT["Push notification\n(Expo)"]
        WA_OUT["WhatsApp message\n(Gupshup)"]
        PDF_OUT["PDF Certificate\n(ReportLab)"]
        QR_OUT["QR Code\n(qrcode)"]
    end

    INPUT --> VALIDATE
    VALIDATE --> AI_PROC
    VALIDATE --> BIZ
    AI_PROC --> BIZ
    BIZ --> MONGO
    BIZ --> CLOUD
    BIZ --> NOTIFY_PROC
    NOTIFY_PROC --> PUSH_OUT
    NOTIFY_PROC --> WA_OUT
    BIZ --> PDF_OUT
    BIZ --> QR_OUT
    MONGO --> SCREEN_OUT
    CLOUD --> SCREEN_OUT
    SECURE -.->|env vars| PROCESSING
```

---

## 12. Infrastructure Architecture

```mermaid
graph TB
    subgraph INTERNET["Internet"]
        USERS_NET["Users\n(Mobile + Browser)"]
    end

    subgraph SERVER["Oracle Cloud Free Tier / AWS EC2"]
        subgraph K8S["Kubernetes Cluster (kind)"]
            subgraph NS_DEV["Namespace: kaamnow-dev"]
                NGINX["NGINX Ingress\n(routes /api/* and /*)"]
                BACKEND_POD["Backend Pod\n(FastAPI + Uvicorn\nPort 8001)"]
                FRONTEND_POD["Frontend Pod\n(React + NGINX\nPort 80)"]
                CHATWOOT_POD["Chatwoot Pod\n(Support Chat\nPort 3000)"]
                POSTGRES_POD["PostgreSQL Pod\n(Chatwoot DB)"]
                REDIS_POD["Redis Pod\n(Chatwoot Cache)"]
            end
        end
        CERT["cert-manager\n(Let's Encrypt SSL)"]
        DOPPLER_OP["Doppler Operator\n(syncs secrets → k8s Secrets)"]
    end

    subgraph CLOUD_SERVICES["External Cloud Services"]
        ATLAS["MongoDB Atlas\n(kaamnow-dev cluster)"]
        CDN_SVC["Cloudinary CDN"]
        DOPPLER_SVC["Doppler\n(secret store)"]
    end

    USERS_NET -->|HTTPS 443| NGINX
    NGINX -->|/api/*| BACKEND_POD
    NGINX -->|/*| FRONTEND_POD
    NGINX -->|/support/*| CHATWOOT_POD
    CHATWOOT_POD --> POSTGRES_POD
    CHATWOOT_POD --> REDIS_POD
    BACKEND_POD --> ATLAS
    BACKEND_POD --> CDN_SVC
    CERT -.->|SSL certs| NGINX
    DOPPLER_SVC -.->|syncs via operator| DOPPLER_OP
    DOPPLER_OP -.->|k8s Secrets| BACKEND_POD
```

---

## 13. Mobile App Screen Map

```mermaid
flowchart TD
    subgraph GUEST_TABS["Guest Tabs (logged out)"]
        G_HOME["Home\n(GuestLanding)"]
        G_BROWSE["Browse Workers\n(Marketplace)"]
        G_JOBS["Find Work\n(FindWork)"]
        G_LOGIN["Login"]
    end

    subgraph AUTH_FLOW["Auth Flow"]
        LOGIN_S["LoginScreen\n(Phone → OTP → Name + Gender)"]
        TERMS_S["TermsScreen\n(must accept)"]
    end

    subgraph USER_TABS["Logged-In Tabs (all users)"]
        HOME_T["🏠 Home"]
        WORK_T["💼 Find Work"]
        POST_T["📋 Post a Job"]
        ACTIVITY_T["📊 My Activity"]
        PROFILE_T["👤 Profile"]
    end

    subgraph SCREENS["All Screens"]
        LANDING["LandingScreen\n(GuestHome or UserHome)"]
        PROFILE["ProfileScreen\n(customer + expert sections)"]
        WORK_FEED["WorkerJobFeedScreen"]
        POST["PostJobScreen\n(voice / photo / GPS / AI)"]
        DASHBOARD["DashboardScreen\n(jobs + engagements)"]
        MARKETPLACE["MarketplaceScreen\n(map + filters)"]
        MAP["MapScreen\n(react-native-maps)"]
        ENGAGEMENT["EngagementDetailScreen\n(deep link target)"]
        CHAT["ChatScreen"]
        NOTIFS["NotificationsScreen"]
        EARNINGS["EarningsScreen\n(goal + calendar)"]
        WALLET["WalletScreen\n(balance + transactions)"]
        FAQ["FAQScreen"]
        TERMS["TermsScreen"]
        PRIVACY["PrivacyScreen"]
        SUPPORT["SupportChatScreen\n(Chatwoot)"]
        QR["QRCodeScreen\n(Local Expert only)"]
        WORKER_PROFILE["WorkerProfileScreen\n(public view)"]
    end

    G_LOGIN --> AUTH_FLOW
    AUTH_FLOW --> USER_TABS

    HOME_T --> LANDING
    WORK_T --> WORK_FEED
    POST_T --> POST
    ACTIVITY_T --> DASHBOARD
    PROFILE_T --> PROFILE

    LANDING --> MARKETPLACE
    LANDING --> WORK_FEED
    MARKETPLACE --> MAP
    MARKETPLACE --> WORKER_PROFILE
    WORKER_PROFILE --> ENGAGEMENT
    DASHBOARD --> ENGAGEMENT
    ENGAGEMENT --> CHAT
    PROFILE --> WALLET
    PROFILE --> EARNINGS
    PROFILE --> QR
    PROFILE --> SUPPORT
    PROFILE --> FAQ
    PROFILE --> TERMS
    PROFILE --> PRIVACY
```

---

*All diagrams render in VS Code with the Markdown Preview Mermaid Support extension.*
*Install: Extensions → search "Markdown Preview Mermaid Support" → Install*
