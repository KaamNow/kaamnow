# KaamNow Phone-First Onboarding Redesign Plan

**Version:** 1.0  
**Date:** May 10, 2026  
**Audience:** Product, Engineering, Design teams  
**Status:** Research-backed specification, ready for implementation phases

---

## Executive Summary

KaamNow currently relies on email for authentication—a friction point for rural Indian users who may not have email accounts or remember their credentials. This plan redesigns both customer and worker onboarding flows to be **phone-first, minimal, and rural-optimized**, drawing on proven patterns from UPI, Razorpay, Paytm, and India's agri-tech platforms.

### Key Changes
- **Phone becomes the primary identifier** for all users (replacing email as mandatory)
- **Signup reduced to 1 screen:** phone + OTP only
- **Onboarding split into:** immediate (name + pincode) and just-in-time (location, photo, skills, payment info)
- **Data collection becomes progressive,** deferring non-essential fields until context-triggered moments
- **Multi-layer SIM swap protection** (secondary phone, backup email, security questions)

### Expected Outcomes
- **Signup completion rate:** +35-50% (reduced from 4 steps to 1 screen for initial signup)
- **Worker onboarding completion:** +25-40% (reduced from 6 steps to 3 steps in critical path)
- **Trust signals:** Improved through phone verification + progressive profile completion
- **Mobile optimization:** Feature phone + low-bandwidth compatible

---

## Part 1: Research Insights

### 1.1 Phone-First Authentication in Emerging Markets

#### Why Phone Over Email
- **Usage:** 90%+ of rural Indians have a mobile phone; <20% actively use email
- **Reliability:** Phone as identifier is verified by telecom provider (stronger than self-created email)
- **Accessibility:** Phone number is a single, memorable identity; email requires recovery
- **Recovery:** SMS/voice OTP works without internet; email recovery requires login access

**Industry proof:**
- [UPI/BHIM](https://www.bhimupi.org.in/faq-s): Phone number is the lookup mechanism for bank account
- [Paytm](https://razorpay.com/blog/payment-gateway-customer-support-for-small-businesses-tier): 95% of signups via phone; email optional
- [Bank of Baroda + Jio bob World Lite](https://indianpsu.com/bank-of-baroda-reliance-jio-bob-world-lite-feature-phone-banking-1657513/): Auto-detects phone from SIM, no email required

#### OTP Delivery: The Right Hierarchy
Rural India faces specific challenges with SMS:
- **DLT delays:** SMS filtered through Digital Leased Lines, can take 30-60 seconds
- **Telecom congestion:** Peak hours see SMS delays of 2+ minutes
- **Data unavailability:** Some areas only have 2G, making WhatsApp unreliable

**Optimal multi-channel fallback (proven by MSG91, Exotel, MessageCentral):**

```
1. WhatsApp OTP (primary)
   ✓ Instant delivery (sub-1 second)
   ✓ Visual + audio notification
   ✗ Requires app + data/WiFi
   
2. SMS OTP (fallback, triggered if WhatsApp fails after 10-15s)
   ✓ Works on feature phones
   ✓ No internet required
   ✗ DLT delays (30-60s typical)
   
3. Voice Call OTP (final fallback)
   ✓ Works on any phone, any connectivity
   ✓ Multi-language TTS (Hindi/regional)
   ✓ No data required
   ✗ Slower UX (requires listening + DTMF input)
```

**Implementation:** Partner with OTP providers (MSG91, Exotel, or MessageCentral) that support all three channels with intelligent fallback.

#### Session Management for Patchy Networks
Rural connectivity is intermittent: users may drop from WiFi, experience 2G stalls, or lose signal entirely.

**Best practice (proven by offline-first agri-platforms):**
- **Access tokens:** Short-lived (15-30 min) for security
- **Refresh tokens:** Long-lived (30 days), stored securely on device
- **Client-side caching:** Cache user's last-known state (name, profile, skills)
- **Offline queue:** Buffer API requests, batch send when connectivity returns
- **Transparent re-auth:** Silently refresh token in background; only interrupt user if token truly expired

**For KaamNow specifically:** Workers often are outdoors (construction sites, farms). Cache job feed, apply status, and messages locally so they can review offline.

#### Account Recovery Layers
**Hierarchy (most effective for rural users):**

1. **Primary:** Phone OTP (same number used for signup)
   - Fast, no recovery account needed
   - Works even if password forgotten
   
2. **Secondary:** Secondary phone number (added post-signup)
   - Redundancy if primary SIM lost/swapped
   - Must be verified with separate OTP
   
3. **Tertiary:** Security questions (stored encrypted at signup)
   - Mother's full name, first school, favorite food
   - Hard to social engineer in rural context (local attacker would need personal knowledge)
   
4. **Quaternary:** Community verification (village-level)
   - For very high-value accounts (contractor with pending payments)
   - Call local contact (workplace supervisor, village leader) to verify identity

### 1.2 Rural User Onboarding Patterns

#### Step Consolidation & Dropout Prevention
Research from agri-tech adoption shows **each step in a form doubles the dropout rate** for low-literacy users.

**Current KaamNow gaps:**
- **Customer signup:** 3 steps (email, name/password, role toggle) → dropout after email validation
- **Worker onboarding:** 6 steps (name→phone→address→location→skills→photo) → 40-60% dropout by step 3

**Industry benchmark (Razorpay, Jio, agri-platforms):**
- **Minimum critical path:** 2 steps max for first meaningful action
- **Step 1:** Identity (phone + OTP)
- **Step 2:** Bare minimum context (name + location via pincode)
- **Everything else:** Deferred to just-in-time moments

**Why this works:** User feels productive after step 2 (can see jobs, apply, post). Additional fields collected when needed.

#### Visual & Audio Design for Low Literacy
[Research from UW CSE](https://courses.cs.washington.edu/courses/cse490c/18au/readings/medhi-thies-2015.pdf) on low-literate UX in South Asia shows:

**What works:**
- **Numeracy over literacy:** Low-literate users are comfortable with number pads (DTMF-style: 1=yes, 2=no)
- **Icons + color:** Consistent, culturally relevant (₹ for money, 🏠 for location, ✓ for confirm)
- **One action per screen:** Not 5 options, just 1-2 buttons per screen
- **Big tap targets:** Minimum 50x50 pixels (hands are weathered, touch is imprecise)
- **Audio feedback:** "Payment successful" spoken aloud, not just visual checkmark
- **Animations:** State changes (spinning→done) are understood across literacy levels

**What doesn't work:**
- Long instructions (>20 words per screen)
- Passwords (friction + security risk of writing down)
- Text-only confirmations
- Nested menus ("Settings > Security > Phone > Change Number")
- Placeholder text (often confuses users—example or help needed)

#### Feature Phone Optimization
KaamNow's frontend is React (modern smartphone-oriented). For feature phone reach (JioPhone, Airtel 4G phones), need:

- **Lightweight static pages:** ~200 KB for initial load (vs React bundle ≈2-5 MB)
- **Keypad navigation:** Left/Right to navigate, 0/OK to select
- **Server-side rendering (SSR):** Generate HTML server-side, send minimal JS to device
- **Text-to-speech for critical flows:** OTP, job alerts, booking confirmations
- **Offline-first architecture:** Fetch data once, cache indefinitely until user refreshes

**Recommendation:** Create WhatsApp-based parallel flows for feature phone users (see 4.2 below).

#### Offline Tolerance
Rural connectivity is episodic: online 10am-2pm (after farm work), offline otherwise.

**Implementation patterns (from agri-platforms):**
```
- Offline collection: User saves job application locally while offline
- Sync queue: When connectivity returns, batched API call sends form
- Conflict resolution: If user edited same job both offline + online, flag for review
- Cached reference data: Download skill list, pincode database once; update weekly
- Status polling: When online, check for new messages, bookings, ratings
```

**For KaamNow workers:**
- Cache job feed (list) and detail pages (individual jobs)
- Allow applying, messaging (queued) while offline
- Sync when connectivity returns
- Show clear "last synced X minutes ago" indicator

---

### 1.3 Progressive Profiling: Just-In-Time Data Collection

#### The Minimal Signup Path
**Principle:** Collect only what you MUST have to verify identity. Everything else is deferred.

| Data | At Signup | At 1st Login | When Needed | Rationale |
|------|-----------|--------------|------------|-----------|
| Phone | ✓ Required | — | — | Identity verification |
| OTP Verification | ✓ Required | — | — | Proof of phone ownership |
| Name | — | ✓ Required | — | Personalization, trust |
| Pincode | — | ✓ Required | — | Geolocation, job matching |
| Email | — | — | Account recovery | Optional, collected later |
| Photo | — | — | Worker listing | Collected when profile is visible |
| Address (detailed) | — | — | When posting job | Job location specificity |
| Skills | — | — | When browsing jobs | Worker skill matching |
| Bank Account | — | — | First withdrawal | Payment flow |
| Preferred Language | — | — | Optional, user-driven | UI language preference |

**Why this works:**
1. **Fast initial signup** (reduces abandonment)
2. **Data collected in context** (user understands why it's needed)
3. **Lower security surface** (fewer fields = fewer fields to validate/store)
4. **Compliance advantage** (collect only what's necessary, GDPR-friendly)

#### Triggered Collection Points

**For Workers:**
- **Photo:** When worker profile is viewed by customers (trigger: "Want to boost bookings? Add a profile photo")
- **Skills:** When browsing jobs (trigger: "Filter jobs by your skills")
- **Bank account:** When first accepted booking has payment due (trigger: "Withdraw your earnings")
- **Detailed address:** When creating custom job alert (trigger: "Tell us your work locations for better matches")

**For Customers:**
- **Payment info:** When posting first job (trigger: "Set your budget to post")
- **Address (detailed):** When posting first job (trigger: "Where's this job?")
- **Preferences:** When browsing workers (trigger: "Save preferences for faster matching next time")

---

### 1.4 Low-Literacy & WhatsApp-First UX Patterns

#### WhatsApp as Primary Interface
With 45M+ Indians using WhatsApp, it's often their primary communication app—even before calling.

**Key insight:** [Research from WhatsApp](https://www.hyprlocl.in/case-stories/how-can-a-chat-apps-ux-ui-be-a-postive-experience-for-its-most-challenging-users) shows low-literate users often prefer **WhatsApp for interactions** over the app itself.

**Opportunities for KaamNow:**
1. **Send OTP via WhatsApp** (as primary, SMS fallback)
2. **Quick-reply buttons in WhatsApp:**
   ```
   "New job: Plumbing ₹500/day in Nashik"
   [1] View Details    [2] Apply    [3] Hide
   ```
   User replies with number, WhatsApp sends request to bot
3. **Job alerts as WhatsApp messages** (instead of push notifications)
4. **Booking updates via WhatsApp:**
   ```
   "Raj accepted your booking! 
   Job: Painting (₹2000)
   Date: 23 May, 8am"
   [1] Call Raj    [2] Chat    [3] Cancel"
   ```
5. **Parallel feature-phone flow:**
   - User sends: `job` → bot lists jobs as text
   - User sends: `apply 123` → bot applies to job #123
   - User sends: `status` → bot shows bookings, earnings

#### Voice & Audio Guidance

**Feature phones can't render complex UI**—but all phones can handle voice calls.

**Implement audio prompts for:**
- **OTP confirmation:** "Your one-time password is 6-7-2-4-8-9. Press 5 when ready."
- **Booking confirmation:** "Raj has accepted your painting job for ₹2000 on May 23rd at 8am. Press 1 to confirm, 2 to cancel."
- **Job alerts:** "New plumbing job in Nashik, ₹500/day. Press 1 to view, 2 to skip, 3 to call customer."

**Multi-language:** Offer Hindi, Marathi, Gujarati, Tamil, Telugu, Kannada, Malayalam, Bengali as user preference. Use Google Cloud TTS or Azure Cognitive Services for synthesis.

#### Visual Form Design (No-Text Alternative)

Instead of labels, use:
- **Icon library:** 
  - 📱 Phone number (numeric keypad icon)
  - ✓ Verify (green checkmark)
  - 📍 Location (pin icon)
  - 🏠 Address (house icon)
  - 👤 Name (person icon)
  - 💰 Price/rate (rupee icon)

- **Progress indicator:** "Step 1 of 3" (not "Personal Information")
- **Color coding:** Green for complete, orange for in-progress, gray for deferred
- **Confirmation animations:** Spinning → checkmark for successful action

#### Auto-Fill & Smart Defaults

Mobile phones in India often have:
- SIM card with registered name + phone number
- Android device with Google account (name, email)
- UPI apps with bank account details

**Leverage this:**
```javascript
// Pseudo-code for auto-detection
if (isAndroidDevice) {
  const userPhone = getPhoneFromSIM();  // Telecom API
  const userName = getPhoneAccountName(); // Telecom API
  const userEmail = getGoogleAccountEmail(); // Android API
  prefillForm({ phone: userPhone, name: userName, email: userEmail });
}
```

**For pincode lookup:** Pre-populate district, state, and optionally village from pincode database (already in KaamNow via `usePincodeLookup` hook).

---

### 1.5 SIM Swap & Account Takeover Prevention

#### The Threat Landscape
[SIM swap fraud doubled YoY in India](https://www.quickheal.co.in/knowledge-centre/sim-swap-fraud-india-phone-number-hacking/)—attackers:
1. Social engineer telecom employee (₹500-5000 bribe)
2. Intercept OTP sent to original user's phone
3. Drain bank account, lock out legitimate user
4. Take 3-6 weeks for user to recover account

#### Multi-Layered Defense Strategy

**Layer 1: Telecom-Level (Educate Users)**
- Add SIM Port Protection PIN at Jio/Airtel/Vodafone (simple, free)
- Encourage in-person SIM swap verification at retail stores
- Note: KaamNow can surface this in onboarding ("Protect your account in 2 mins")

**Layer 2: App-Level 2FA**
```
Primary authentication: Phone OTP (required for login)
Secondary authentication (for sensitive actions):
  - Change password: Require email verification OR security questions
  - Change phone: Require email verification OR secondary phone OTP
  - Withdraw funds: Require email verification OR security questions
  - Delete account: Require 48-hour delay + email confirmation
```

**Layer 3: Backup Recovery Methods**
```
Recovery option 1: Primary phone OTP (default)
Recovery option 2: Secondary phone (optional, user-added)
Recovery option 3: Email link (optional, user-added)
Recovery option 4: Security questions (auto-generated at signup)
Recovery option 5: Community verification (for high-value accounts)
```

**Layer 4: Behavioral Detection**
```
Flag for re-authentication:
  - Login from new device (check Android device ID)
  - Login from new IP address (detect VPN/proxy)
  - Login at unusual time (e.g., 3am when user usually sleeps)
  - Rapid succession of logins (>3 in 5 minutes = potential compromise)
  - Critical actions: Change phone, withdraw funds, delete account
```

**Layer 5: Rural-Specific Verification**
For high-value accounts (contractor with ₹50k+ pending):
```
Trigger: Login from new device OR attempt to change phone
Action: Send SMS/WhatsApp to customer's known contacts
Message: "Is Raj (phone: 98XXXXXX33) verifying this login from a new phone? 
         Reply YES if it's him, NO if it's fraud."
```

---

### 1.6 Data Model Redesign for Phone-First

#### Current Schema (Email-Centric)
```javascript
// Current: email is primary identifier
db.users.schema = {
  _id: ObjectId,
  email: string (unique),     // mandatory, used for login
  password_hash: string,
  phone: string (optional),    // may be empty
  phone_verified: boolean,
  // ...
}
```

#### New Schema (Phone-First)
```javascript
// New: phone is unique identifier, email is optional
db.users.schema = {
  _id: ObjectId,              // actual primary key (surrogate)
  phone_primary: string (unique, not null),  // primary contact
  phone_verified: boolean (default: false),
  email: string (optional, unique),
  email_verified: boolean (default: false),
  name: string (required after signup),
  role: enum ['customer', 'worker'],
  pincode: string (collected after signup),
  address: {
    village: string,
    post: string,
    block: string,
    district: string,
    state: string,
    pincode: string
  },
  photo_url: string (optional),
  preferred_language: string (optional, default: 'en'),
  
  // Security
  password_hash: string (optional, can be null for phone-OTP only),
  security_questions: [
    {
      question: string,
      answer_hash: string  // hashed answer, never stored plaintext
    }
  ],
  
  // Audit
  created_at: timestamp,
  updated_at: timestamp,
  last_login: timestamp,
  login_device_id: string (for anomaly detection)
}

// New table for phone history
db.user_phones = {
  _id: ObjectId,
  user_id: ObjectId (references users),
  phone: string (unique),
  is_primary: boolean,
  verified: boolean,
  verification_token: string (OTP token, expires in 15 min),
  created_at: timestamp,
  verified_at: timestamp,
  last_used: timestamp
}

// Optional: SIM identity tracking
db.user_sims = {
  _id: ObjectId,
  user_id: ObjectId,
  imsi: string (SIM's unique ID from telecom),
  iccid: string (physical SIM card ID),
  msisdn: string (current phone number),
  carrier: enum ['jio', 'airtel', 'vodafone', 'bsnl', 'other'],
  last_seen: timestamp,
  is_active: boolean
}
```

#### Migration Path (Existing Users)
**Problem:** KaamNow has existing email-based users. Can't delete email field without breaking logins.

**Solution: Phased migration (6 months)**

**Phase 1 (Week 1-4): Add Phone-First Option**
- Add phone + verification to signup flow
- Existing users: email-based login still works
- New users: phone-first signup (optional email)

**Phase 2 (Month 2-4): Migrate Inactive Users**
```javascript
// Backfill inactive users with placeholder phones
// (prevents data loss, allows schema cleanup)
db.users.updateMany(
  { phone: null, last_login: { $lt: 3_months_ago } },
  {
    $set: {
      phone_primary: `PHONE_MIGRATION_${_id}`,  // placeholder
      phone_verified: false,
      migration_status: 'email_only'
    }
  }
);
```

**Phase 3 (Month 4-6): Active User Migration**
- Send email: "Add a phone number to secure your account"
- Offer incentive: "Earn ₹100 bonus when you verify phone"
- Require phone for: posting jobs, applying to jobs, withdrawals

**Phase 4 (Month 7+): Deprecate Email-Only Accounts**
- Email-only accounts cannot post jobs or withdraw
- Offer 30-day grace period to add phone
- After 30 days: account read-only until phone verified

---

### 1.7 Regulatory & Security Context

#### India's Data Protection & Telecom Rules (2025)
- **DPDP Act (Data Protection):** Requires explicit consent for collecting phone number, justification for storing it
- **TCS Rules 2025:** WhatsApp Business API requires phone number verification by WhatsApp
- **eKYC:** Optional but accelerates KYC (1-3 days vs 7 days without it)
- **NREGA/Government Integration:** Many rural users have NAADHAAR linked to phone; could auto-verify

**Recommendation:** Add checkbox at signup: "I consent to KaamNow storing my phone number for OTP verification and account recovery, per DPDP Act 2023."

---

## Part 2: Redesigned Flows

### 2.1 Universal Signup (Phone-First, Both Roles)

**Current:** Email required, role toggle after signup.  
**New:** Phone + OTP, minimal information, role choice on next screen.

#### Screen 1: Phone Entry
```
┌─────────────────────────────────────┐
│                                     │
│    🎯 Join KaamNow                  │
│                                     │
│    Phone Number                     │
│    ┌──────────────────────┐         │
│    │ +91 |____|____|__| │         │
│    │                      │         │  (numeric keypad only)
│    │ 10-digit number     │         │
│    └──────────────────────┘         │
│                                     │
│  [Continue] (disabled until 10 digits)
│                                     │
│  Why phone? It's faster and safer   │
│  than email for rural users.        │
│                                     │
└─────────────────────────────────────┘
```

**Logic:**
- Auto-detect country code (+91 for India)
- Accept only 10-digit input
- Show real-time validation: "✓ Valid phone number"
- On continue: Trigger OTP send (WhatsApp → SMS → Voice)

#### Screen 2: OTP Verification
```
┌─────────────────────────────────────┐
│                                     │
│  Enter OTP                          │
│  Sent to 98****45                   │
│                                     │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐     │
│  │  │ │  │ │  │ │  │ │  │ │  │     │  (6-digit input)
│  └──┘ └──┘ └──┘ └──┘ └──┘ └──┘     │
│                                     │
│  Didn't receive code?               │
│  [Resend OTP] (available after 30s) │
│  [Call me instead]                  │
│                                     │
└─────────────────────────────────────┘
```

**Logic:**
- Show masked phone (98****45) for privacy
- OTP input: Move to next field auto-on digit entry
- Resend available after 30s (prevents abuse)
- "Call me" triggers voice OTP
- On success: Create user account, move to next screen (no redirect yet)

#### Screen 3: Role & Basic Info
```
┌─────────────────────────────────────┐
│                                     │
│  Who are you?                       │
│                                     │
│  ┌─────────────────┐                │
│  │ I need workers  │   (customer)  │
│  └─────────────────┘                │
│                                     │
│  ┌─────────────────┐                │
│  │ I am a worker   │   (worker)    │
│  └─────────────────┘                │
│                                     │
│  Name                               │
│  ┌──────────────────────┐           │
│  │ [Your name]          │  (prefill │
│  └──────────────────────┘   from SIM)
│                                     │
│  [Continue to Setup]                │
│                                     │
└─────────────────────────────────────┘
```

**Logic:**
- Role choice unlocks role-specific onboarding
- Name: Try to auto-fill from Android account or SIM
- Proceed to role-specific onboarding (Customer vs Worker)

---

### 2.2 Customer (Job Poster) Onboarding

**Current:** Immediately redirected to marketplace. No profile data collected.  
**New:** Minimal first-login setup, then marketplace. Additional fields on-demand when posting first job.

#### Customer Path: Minimal Setup (3 steps → 2 steps)

**Step 1: Pincode + Location**
```
┌─────────────────────────────────────┐
│                                     │
│  Where do you work?                 │
│                                     │
│  Pincode                            │
│  ┌──────────────────────┐           │
│  │ 400001               │  (input+  │
│  │ [Auto-fill from DB]  │   lookup) │
│  └──────────────────────┘           │
│                                     │
│  District (auto-filled)             │
│  ┌──────────────────────┐           │
│  │ Mumbai (readonly)    │           │
│  └──────────────────────┘           │
│                                     │
│  State (auto-filled)                │
│  ┌──────────────────────┐           │
│  │ Maharashtra (read)   │           │
│  └──────────────────────┘           │
│                                     │
│  [Start Posting Jobs]               │
│                                     │
│  You can update this later.         │
│                                     │
└─────────────────────────────────────┘
```

**Logic:**
- Pincode auto-lookup (from usePincodeLookup hook already in codebase)
- Auto-fill district + state (readonly, show this is derived)
- Allow skip (default to India centre on map)
- Proceed to marketplace

**Step 2: Direct to Marketplace**
- Show empty state: "Post your first job to find workers"
- Quick action: [Post a Job]

#### On First Job Post: Address Details & Payment

When customer tries to post a job:

**Triggered Collection: Job Location (Detailed Address)**
```
┌─────────────────────────────────────┐
│  Post a Job                         │
│                                     │
│  Job Title: [Painting]              │
│  Category: [Painting]               │
│  Budget: ₹ [2000]                   │
│                                     │
│  WHERE? (new screen triggered here) │
│  ┌──────────────────────┐           │
│  │ Your pincode area?   │ ✓ (default)
│  │ [Different location] │           │
│  └──────────────────────┘           │
│                                     │
│  If different, enter address:       │
│  Village/Area: [________]           │
│  Post: [________] (optional)        │
│  Block: [________] (optional)       │
│                                     │
│  Or drop pin on map                 │
│  [Map Icon: Show Map]               │
│                                     │
│  [Save & Continue]                  │
│                                     │
└─────────────────────────────────────┘
```

**Triggered Collection: Payment Method**
```
┌─────────────────────────────────────┐
│  Add Payment Method                 │
│                                     │
│  We'll collect ₹30 per booking      │
│  when your job is accepted.         │
│                                     │
│  UPI ID / Phone Number              │
│  ┌──────────────────────┐           │
│  │ [Your phone] → UPI   │ (prefill) │
│  │ [Enter UPI ID]       │           │
│  └──────────────────────┘           │
│                                     │
│  Test Transaction                   │
│  ✓ Send ₹1 for verification         │
│    (refunded after confirmation)    │
│                                     │
│  [Verify Payment Method]            │
│                                     │
│  You can skip for now.              │
│  Add it before posting a job.       │
│                                     │
└─────────────────────────────────────┘
```

**Logic:**
- Auto-prefill UPI from registered phone number (if UPI app installed)
- Test transaction: Small amount to confirm payment method works
- Allow skip, but require before job is visible to workers
- Store payment method in background (user doesn't see full CRUD)

---

### 2.3 Worker (Job Seeker) Onboarding

**Current:** 6 steps (name → phone → address → location → skills → photo), high dropout.  
**New:** 3 critical path steps (name → phone+OTP → address+pincode), then defer to just-in-time.

#### Worker Path: 3-Step Critical Path

**Step 0: Name + Daily Rate** (no change, already fast)
```
┌─────────────────────────────────────┐
│  Your Profile                       │
│                                     │
│  Full Name                          │
│  ┌──────────────────────┐           │
│  │ Raj Kumar            │           │
│  └──────────────────────┘           │
│                                     │
│  Daily Rate (optional)              │
│  ┌──────────────────────┐           │
│  │ ₹ [350]              │ (default) │
│  │ (₹100 - ₹5000)       │           │
│  └──────────────────────┘           │
│                                     │
│  [Next: Verify Phone]               │
│                                     │
└─────────────────────────────────────┘
```

**Step 1: Phone + OTP** (integrated, not separate from signup)
Already done in universal signup. But if user skipped phone at signup:
```
┌─────────────────────────────────────┐
│  Verify Your Number                 │
│  We use this to send job alerts.    │
│                                     │
│  Phone Number                       │
│  ┌──────────────────────┐           │
│  │ +91 98XXXXX45        │ (prefill) │
│  └──────────────────────┘           │
│                                     │
│  [Send OTP] → [Verify OTP]          │
│                                     │
│  Skip for now? You can add later.   │
│  But jobs won't be sent until you   │
│  verify.                            │
│                                     │
└─────────────────────────────────────┘
```

**Logic:**
- Pre-fill from signup (already verified)
- If skipped, show that jobs require phone verification
- Allow temporary skip, but gate important features
- [✓ DONE]

**Step 2: Address** (Pincode → Village → District → State)
```
┌─────────────────────────────────────┐
│  Where are you located?             │
│                                     │
│  Pincode                            │
│  ┌──────────────────────┐           │
│  │ 413001               │           │
│  └──────────────────────┘           │
│  🔄 Lookup (auto after valid input) │
│                                     │
│  Village                            │
│  ┌──────────────────────┐           │
│  │ [Auto-filled] ↓      │ (dropdown)│
│  │ OR type custom       │           │
│  └──────────────────────┘           │
│                                     │
│  District (auto)                    │
│  │ Ahmednagar           │ (readonly)│
│                                     │
│  State (auto)                       │
│  │ Maharashtra          │ (readonly)│
│                                     │
│  [Next: Add Skills]                 │
│                                     │
└─────────────────────────────────────┘
```

**Logic:**
- Use existing usePincodeLookup hook (already in codebase)
- Auto-fill village dropdown after pincode lookup
- Allow custom village entry (for areas not in DB)
- District + state auto-filled (readonly)

**[✓ DONE - Worker can now see job feed!]**

#### Deferred Collection: Skills (Just-In-Time)

**Trigger:** When worker opens job feed, show:
```
┌─────────────────────────────────────┐
│  🎯 Filter jobs by your skills      │
│                                     │
│  What can you do?                   │
│  (Select at least 1)                │
│                                     │
│  ☐ Construction                     │
│    ☑ Mason                          │
│    ☐ Carpenter                      │
│    ☐ Painter                        │
│                                     │
│  ☐ Agriculture                      │
│  ☐ Electrical                       │
│  ☐ Cleaning                         │
│  ☐ Transport                        │
│  ☐ Mechanical                       │
│  ☐ Tailoring                        │
│  ☐ General                          │
│                                     │
│  [Apply Filter & See Jobs]          │
│  [Skip, show all jobs]              │
│                                     │
└─────────────────────────────────────┘
```

**Logic:**
- Trigger on first job feed view
- Allow skip ("Show all jobs")
- Save skill selection for future filtering
- No photo required yet—workers can browse with empty photo
- Skills auto-saved (not a gatekeeping step)

#### Deferred Collection: Photo (Just-In-Time)

**Trigger:** When worker receives first booking request or when customer clicks on profile:
```
┌─────────────────────────────────────┐
│  Add Profile Photo                  │
│  (Optional but boosts bookings)     │
│                                     │
│  📷 Take Photo                      │
│  🖼️ Choose from Gallery             │
│                                     │
│  Boost your booking rate by 35%     │
│  when you add a photo.              │
│                                     │
│  [Skip for now]                     │
│                                     │
└─────────────────────────────────────┘
```

**Logic:**
- Show photo incentive ("35% more bookings")
- Fall back to letter avatar if skipped
- Allow upload later (no hard requirement)
- Photo auto-generated from name (initials)

#### Deferred Collection: Bio (Optional)

**Trigger:** When worker is matched to jobs or when customer views their profile:
```
┌─────────────────────────────────────┐
│  Add Your Bio                       │
│  (optional, makes you stand out)    │
│                                     │
│  "Tell customers a bit about you"   │
│                                     │
│  ┌──────────────────────┐           │
│  │ 15+ years painting   │  (multiline)
│  │ expert. Used to work │           │
│  │ for [contractor].    │           │
│  │ Very reliable.       │ (max 200)  │
│  └──────────────────────┘           │
│                                     │
│  Tip: Mention specific skills,      │
│  experience, reliability.           │
│                                     │
│  [Save Bio]                         │
│                                     │
└─────────────────────────────────────┘
```

**Logic:**
- Fully optional
- Can be added/updated any time
- Show tips for writing effective bios

---

### 2.4 Parallel: WhatsApp-First Feature Phone Flow (For SMS-Only Users)

For users on feature phones (JioPhone, old Android, 2G-only), offer a parallel WhatsApp-based signup flow:

**Initial Entry (SMS or In-Store QR Code)**
```
User receives SMS:
"Join KaamNow! Reply START to https://kaamnow.com/fp/signup"
(or scans QR code from poster)

Opens WhatsApp:
1. Sends "START" to KaamNow Business account
2. Bot replies with:
   "Welcome! Are you:
   1. Looking for workers?
   2. A worker looking for jobs?
   Reply 1 or 2"
```

**Full Feature Phone Flow (WhatsApp Bot)**
```
1. Bot asks: "What's your name?" → User replies "Raj"
2. Bot asks: "Can we reach you at this number?" → Shows detected number
3. User says: "Yes" or provides new number
4. Bot: "Sending you a code. Enter it here."
5. User: "627489" (6-digit OTP)
6. Bot: "✓ Account created!
   - Raj, you're all set.
   - You'll get job updates every morning.
   - Reply 'HELP' for commands."

Available commands:
- JOBS: "See new jobs in your area"
- APPLY 123: "Apply to job #123"
- STATUS: "Your bookings & earnings"
- SKILL: "Change your skills"
- STOP: "Stop notifications"
```

**Why this works:**
- Zero internet required
- Works on any phone (including feature phones)
- Parallel to main app (not required, optional)
- Familiar interface (WhatsApp is primary communication)
- Text-to-speech can read replies aloud

---

## Part 3: Data Model Changes

### 3.1 Updated MongoDB Schema

#### Users Collection (Phone-First)

```javascript
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['phone_primary', 'phone_verified', 'name', 'role', 'created_at'],
      properties: {
        _id: { bsonType: 'objectId' },
        
        // PRIMARY IDENTIFIER
        phone_primary: {
          bsonType: 'string',
          pattern: '^\\+91[0-9]{10}$',
          description: 'Primary phone number (with +91 prefix)'
        },
        phone_verified: { bsonType: 'bool', default: false },
        phone_verified_at: { bsonType: 'date' },
        
        // SECONDARY IDENTIFIERS
        email: {
          bsonType: 'string',
          pattern: '^[^@]+@[^@]+\\.[^@]+$',
          description: 'Optional, for account recovery'
        },
        email_verified: { bsonType: 'bool', default: false },
        
        // PROFILE
        name: { bsonType: 'string', minLength: 2, maxLength: 100 },
        role: {
          enum: ['customer', 'worker'],
          description: 'Account type'
        },
        
        // LOCATION (collected after signup)
        pincode: { bsonType: 'string', pattern: '^[0-9]{6}$' },
        address: {
          bsonType: 'object',
          properties: {
            village: { bsonType: 'string' },
            post: { bsonType: 'string' },
            block: { bsonType: 'string' },
            district: { bsonType: 'string' },
            state: { bsonType: 'string' },
            pincode: { bsonType: 'string' },
            lat: { bsonType: 'double' },
            lng: { bsonType: 'double' }
          }
        },
        
        // PREFERENCES
        preferred_language: {
          enum: ['en', 'hi', 'mr', 'gu', 'ta', 'te', 'kn', 'ml', 'bn'],
          default: 'en'
        },
        
        // MEDIA
        photo_url: { bsonType: 'string' },
        avatar_color: { bsonType: 'string' },  // fallback if no photo
        
        // SECURITY (password optional for phone-OTP auth)
        password_hash: { bsonType: 'string' },  // may be null
        security_questions: {
          bsonType: 'array',
          items: {
            bsonType: 'object',
            properties: {
              question: { enum: [
                'mother_full_name',
                'first_school_name',
                'favorite_food',
                'father_first_name',
                'childhood_friend_name'
              ] },
              answer_hash: { bsonType: 'string' },  // bcrypt hashed
              salt: { bsonType: 'string' }
            }
          }
        },
        
        // AUDIT
        created_at: { bsonType: 'date' },
        updated_at: { bsonType: 'date' },
        last_login: { bsonType: 'date' },
        last_login_device_id: { bsonType: 'string' },  // for anomaly detection
        
        // MIGRATION (from email-based)
        migration_status: {
          enum: ['email_only', 'migrated', 'phone_primary'],
          default: 'phone_primary'
        }
      }
    }
  },
  
  // Indexes for fast lookups
  indexes: [
    { key: { phone_primary: 1 }, unique: true },
    { key: { email: 1 }, unique: true, sparse: true },
    { key: { pincode: 1 }, background: true },
    { key: { role: 1 }, background: true },
    { key: { phone_verified: 1 }, background: true },
    { key: { created_at: -1 }, background: true }
  ]
});
```

#### User Phones Collection (Multi-Phone Support)

```javascript
db.createCollection('user_phones', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['user_id', 'phone', 'verified'],
      properties: {
        _id: { bsonType: 'objectId' },
        user_id: { bsonType: 'objectId' },
        phone: { bsonType: 'string', pattern: '^\\+91[0-9]{10}$' },
        is_primary: { bsonType: 'bool', default: false },
        verified: { bsonType: 'bool', default: false },
        verified_at: { bsonType: 'date' },
        verification_token: { bsonType: 'string' },  // OTP value
        token_expires_at: { bsonType: 'date' },  // OTP expiry (15 min)
        verification_attempts: { bsonType: 'int', default: 0 },  // for rate limiting
        last_otp_sent: { bsonType: 'date' },
        created_at: { bsonType: 'date' },
        deleted_at: { bsonType: 'date' }  // soft delete for history
      }
    }
  },
  indexes: [
    { key: { user_id: 1, is_primary: 1 } },
    { key: { phone: 1 }, unique: true },
    { key: { verified_at: 1 }, background: true }
  ]
});
```

#### User SIMs Collection (Advanced: SIM Identity Tracking)

```javascript
db.createCollection('user_sims', {
  // Tracks SIM changes to detect SIM swap fraud
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['user_id', 'imsi', 'msisdn'],
      properties: {
        _id: { bsonType: 'objectId' },
        user_id: { bsonType: 'objectId' },
        imsi: {
          bsonType: 'string',
          description: 'SIM identity (stays same when MSISDN changes)'
        },
        iccid: { bsonType: 'string', description: 'Physical SIM card ID' },
        msisdn: { bsonType: 'string' },  // current phone number
        carrier: {
          enum: ['jio', 'airtel', 'vodafone', 'bsnl', 'other'],
          description: 'Telecom provider'
        },
        last_seen: { bsonType: 'date' },
        is_active: { bsonType: 'bool' },
        created_at: { bsonType: 'date' },
        retired_at: { bsonType: 'date' }  // when SIM was replaced
      }
    }
  },
  indexes: [
    { key: { user_id: 1, is_active: 1 } },
    { key: { imsi: 1 }, unique: true },
    { key: { last_seen: -1 }, background: true }
  ]
});
```

### 3.2 Pydantic Schema Changes (Backend)

```python
# backend/schemas.py

from pydantic import BaseModel, EmailStr, Field
from enum import Enum
from typing import Optional
from datetime import datetime

class Role(str, Enum):
    CUSTOMER = "customer"
    WORKER = "worker"

# ============ AUTH SCHEMAS ============

class PhoneOnlyRegisterIn(BaseModel):
    """New: Phone-first signup"""
    phone: str = Field(..., regex=r'^\+91[0-9]{10}$')
    # OTP sent separately, verified in next step

class OTPVerifyIn(BaseModel):
    """Verify OTP (new unified step)"""
    phone: str = Field(..., regex=r'^\+91[0-9]{10}$')
    otp: str = Field(..., regex=r'^[0-9]{6}$')

class SignupCompleteIn(BaseModel):
    """Complete signup after OTP verification"""
    name: str = Field(..., min_length=2, max_length=100)
    role: Role
    password: Optional[str] = Field(None, min_length=8)  # optional, OTP-only auth supported
    preferred_language: Optional[str] = 'en'

class LoginIn(BaseModel):
    """Phone-based login"""
    phone: str = Field(..., regex=r'^\+91[0-9]{10}$')
    # OTP flow: send OTP → verify OTP

class OTPLoginVerifyIn(BaseModel):
    phone: str = Field(..., regex=r'^\+91[0-9]{10}$')
    otp: str = Field(..., regex=r'^[0-9]{6}$')

# ============ PROFILE SCHEMAS (Deferred Collection) ============

class AddressIn(BaseModel):
    """Collected after initial signup"""
    village: str
    post: Optional[str] = None
    block: Optional[str] = None
    district: str
    state: str
    pincode: str = Field(..., regex=r'^[0-9]{6}$')
    lat: Optional[float] = None
    lng: Optional[float] = None

class UserUpdateIn(BaseModel):
    """Partial user updates"""
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    pincode: Optional[str] = None
    address: Optional[AddressIn] = None
    photo_url: Optional[str] = None
    preferred_language: Optional[str] = None

class SecurityQuestionsIn(BaseModel):
    """Added post-signup for 2FA"""
    question: str  # enum: 'mother_full_name', etc.
    answer: str  # plaintext, will be hashed

class PhoneAddIn(BaseModel):
    """Add secondary phone for 2FA"""
    phone: str = Field(..., regex=r'^\+91[0-9]{10}$')
    # Requires OTP verification

class AccountRecoveryIn(BaseModel):
    """Phone recovery with security questions fallback"""
    phone: str = Field(..., regex=r'^\+91[0-9]{10}$')
    # Optional:
    security_question_answer: Optional[str] = None
    email: Optional[EmailStr] = None

# ============ RESPONSE SCHEMAS ============

class UserOut(BaseModel):
    """User response (no password_hash, no security questions)"""
    id: str
    phone_primary: str
    email: Optional[str] = None
    phone_verified: bool
    name: str
    role: Role
    pincode: Optional[str] = None
    address: Optional[AddressIn] = None
    photo_url: Optional[str] = None
    preferred_language: str
    avatar_color: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class AuthResponseOut(BaseModel):
    """Login/signup response"""
    user: UserOut
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

# ============ WORKER-SPECIFIC ============

# (Existing WorkerProfileIn, StructuredSkill remain unchanged)
# Just note: skills collection triggers on first job view, not during signup
```

### 3.3 Frontend State Management Changes

```javascript
// frontend/src/contexts/AuthContext.jsx
// New OTP-based auth flow

export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState({
    // Step 1: Phone Entry
    phone: null,
    phoneEntered: false,  // moved past phone input screen
    
    // Step 2: OTP Verification
    otpSent: false,
    otpVerified: false,
    otpToken: null,  // temporary token valid for OTP -> signup completion
    
    // Step 3: Profile Completion
    signupComplete: false,
    user: null,
    accessToken: null,
    refreshToken: null,
    
    // New: Progressive profile status
    hasSkills: false,
    hasPhoto: false,
    hasPaymentMethod: false,
    
    // Error handling
    error: null,
    loading: false
  });

  // OTP-based flow
  const sendOTP = async (phone) => {
    // POST /api/auth/send-otp { phone }
    // Response: { otp_token, expires_in }
  };

  const verifyOTP = async (phone, otp) => {
    // POST /api/auth/verify-otp { phone, otp }
    // Response: { otp_token, created_user: false }  // user created but incomplete
  };

  const completeSignup = async (name, role, password?) => {
    // POST /api/auth/signup-complete { name, role, password }
    // Uses otpToken for context
    // Response: { user, access_token, refresh_token }
  };

  // Trigger deferred collection
  const updateProfile = async (updates) => {
    // PATCH /api/auth/me { ...updates }
  };

  return (
    <AuthContext.Provider value={{ authState, sendOTP, verifyOTP, completeSignup, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
```

---

## Part 4: Rationale & Trade-Offs

### 4.1 Why This Design Works for Rural Users

| Problem | Solution | Why It Works |
|---------|----------|-------------|
| Email not memorable/available | Phone as primary ID | Phone is verified by telecom; can't be "lost" like email password |
| Low-literacy users struggle with multi-step forms | Reduce signup to 2 steps (phone + role+name) | Fewer fields = faster signup = less abandonment |
| Text-heavy UI alienates semi-literate users | Icons + audio + WhatsApp integration | Rural users are comfortable with keypad (DTMF); WhatsApp is primary communication |
| Unreliable internet connectivity | Cache + offline-first, WhatsApp parallel flow | Offline queue syncs when reconnected; WhatsApp works on 2G |
| Feature phones can't run React | WhatsApp bot + voice OTP | Parallel text-based interface for JioPhone users |
| Password forgotten → account lost | OTP-based auth (no password storage) | OTP expires, can't be written down or stolen |
| Email recovery doesn't work for rural users | Multiple recovery layers (2nd phone, security Q, community) | Different recovery mechanism for different scenarios |
| Users provide fake data at signup | Progressive profiling + context-triggered collection | Users provide real data when they need feature (e.g., address when posting job) |

### 4.2 Trade-Offs & Compromises

#### Trade-Off 1: Email-First → Phone-First
**What we gain:** Faster signup, higher rural adoption, better OTP delivery.  
**What we lose:** Ability to contact user via email (mitigated by WhatsApp notifications).

**Mitigation:** Make email optional but encourage it for account recovery. Show incentive: "Add email to recover your account if you lose your phone."

#### Trade-Off 2: Mandatory Full Profile → Progressive Profile
**What we gain:** Higher signup completion, faster user activation.  
**What we lose:** Incomplete data initially (photos missing, skills unclear).

**Mitigation:** Incentivize completion ("Add photo → 35% more bookings"). Gate important features on required fields (e.g., workers can't appear in search until they have at least 1 skill).

#### Trade-Off 3: Minimal Data Collection → Trust Signals Deferred
**What we gain:** Lower signup friction.  
**What we lose:** Initial trust signals (customer has no verified address, worker has no photo/reviews).

**Mitigation:**
- Show phone verification badge immediately ("✓ Verified phone")
- Collect photo + bio within first 7 days (nudge via WhatsApp: "Complete your profile")
- For customers: Address collected at job posting, not signup
- Trust accrues over time (1st booking, 5-star rating, etc.)

#### Trade-Off 4: Defer Sensitive Fields → Slower KYC/Payment Onboarding
**What we gain:** Faster core signup.  
**What we lose:** Extended KYC/payment verification timeline.

**Mitigation:**
- Collect bank account on first withdrawal (with eKYC if available)
- Use Razorpay's "Payment Links" for jobs without strict KYC (customers pay for job, payment held by KaamNow)
- For workers: Start with UPI-only, extend to bank transfer later

#### Trade-Off 5: SMS → WhatsApp OTP
**What we gain:** Instant delivery, no DLT delays.  
**What we lose:** Requires WhatsApp app + data.

**Mitigation:** Fallback to SMS (15-30s later) and then voice OTP. WhatsApp is primary attempt; SMS/voice ensure access for all.

---

### 4.3 How Trust & Safety Are Maintained

#### Trust Signals (Progressive)
```
Week 0 (Signup):
  ✓ Phone verified (OTP proof)
  ✓ Name provided (basic identity)

Week 0-1 (Job browsing):
  ✓ Pincode + village (location verified)
  ✓ Skills selected (worker capability claimed)

Week 1-2 (After first booking):
  ✓ Photo added (identity confirmation; easier to verify locally)
  ✓ Rating + review (external signal from customer)

Week 3+ (Sustained activity):
  ✓ Multiple bookings completed (consistent service)
  ✓ Community feedback (word-of-mouth verification)
```

#### Safety Measures

1. **Phone Verification (mandatory):** OTP proof that user owns the number
2. **2-Layer Recovery:** Secondary phone + security questions prevent account takeover
3. **Anomaly Detection:** Flag logins from new devices/IPs; require re-auth for sensitive actions
4. **Behavioral Limits:** Rate limit OTP attempts (max 5/hour) to prevent brute-force
5. **Community Verification:** For high-value accounts, call a known contact to confirm identity
6. **SIM Swap Awareness:** Educate users on carrier-level SIM protection PINs
7. **Fraud Monitoring:** Track SIM changes (IMSI monitoring); flag suspicious patterns

---

## Part 5: Implementation Path

### Phase 1: MVP (Weeks 1-6) — Phone-First Signup & Customer Onboarding

**Goals:** De-risk phone authentication; validate UX with early users.

**Scope:**
1. Implement phone + OTP signup (WhatsApp + SMS fallback)
2. Complete signup flow (name + role selection)
3. Customer onboarding: pincode + marketplace access
4. Migration: Add phone field as optional to existing users
5. WhatsApp OTP integration (MSG91 or Exotel)

**Deliverables:**
- `/auth/send-otp` endpoint (WhatsApp → SMS → Voice)
- `/auth/verify-otp` endpoint
- `/auth/signup-complete` endpoint (phone-first path)
- Updated `users` schema (phone_primary unique, email optional)
- Frontend: Signup flow redesign (3 screens → 1 phone + 1 OTP + 1 profile)
- Documentation: OTP flow, error handling, rate limiting

**Success Metrics:**
- Signup completion rate: >80% (vs current ~60%)
- Median signup time: <3 minutes
- OTP delivery success rate: >99% (across all 3 channels)
- Customer NPS: >30

**Teams & Dependencies:**
- Backend: Auth endpoints, OTP provider setup
- Frontend: Signup redesign, OTP input UX
- DevOps: OTP provider credentials, SMS gateway config
- QA: Test all OTP channels, network failure scenarios

---

### Phase 2: Worker Onboarding (Weeks 7-10) — 3-Step Critical Path

**Goals:** Reduce worker dropout by 40% with streamlined onboarding.

**Scope:**
1. Consolidate worker onboarding: 6 steps → 3 steps (name → phone → address)
2. Defer skills & photo to just-in-time (triggered on job feed view)
3. Update WorkerOnboarding.jsx component
4. Pincode auto-lookup already implemented (just use it)
5. Add nudges for deferred fields (photos, skills)

**Deliverables:**
- Refactored WorkerOnboarding component (3 screens)
- Skill selection modal (triggered on first job feed view)
- Photo upload modal (triggered on first booking/profile view)
- Backend: Update `/workers/profile` endpoint to allow partial creation
- Metrics tracking: Dropout funnel by step

**Success Metrics:**
- Worker onboarding completion: >75% (vs current ~50%)
- Median onboarding time: <5 minutes
- Skill completion (deferred): >60% within 7 days
- Photo completion (deferred): >40% within 14 days

**Teams & Dependencies:**
- Frontend: Component redesign, modal UX
- Backend: Flexible profile creation
- Product: Nudge/incentive messaging strategy

---

### Phase 3: Multi-Layer 2FA & Account Recovery (Weeks 11-16)

**Goals:** Prevent SIM swap fraud; provide robust recovery.

**Scope:**
1. Secondary phone number support (user_phones collection)
2. Security questions (selected post-signup, stored hashed)
3. Email recovery (optional, incentivized at signup)
4. SIM identity tracking (advanced: IMSI monitoring)
5. Anomaly detection (new device flag, unusual login times)

**Deliverables:**
- `/auth/add-phone` endpoint (add secondary phone + OTP verify)
- `/auth/security-questions` endpoint (set Q&A)
- `/auth/recover` endpoint (hierarchical recovery: phone → questions → email)
- SIM tracking in DB (user_sims collection)
- Anomaly detector: device fingerprinting, IP-based flagging
- Security dashboard: show users their recovery options, SIM status

**Success Metrics:**
- Account recovery success rate: >95% (user recovers account unassisted)
- SIM swap fraud incidents: 0 (detect and block before account takeover)
- False positive anomaly flags: <5% (don't block legitimate users)

**Teams & Dependencies:**
- Backend: Recovery endpoints, device fingerprinting
- Frontend: Recovery flow UX, security dashboard
- Infra: Device tracking, IP geolocation services

---

### Phase 4: Progressive Profile & Deferred Collection (Weeks 17-22)

**Goals:** Optimize for user productivity; collect data just-in-time.

**Scope:**
1. Trigger-based collection: skills on job feed, photo on profile view, address on job post
2. Payment method collection on first job (customer) / first withdrawal (worker)
3. Nudge system: Email/WhatsApp reminders to complete profile
4. Incentive structure: "Complete photo → unlock 35% more bookings"

**Deliverables:**
- Nudge service: Scheduled WhatsApp reminders (via Gupshup API)
- Incentive UI: Show user their profile completeness %
- Payment method collection flow
- Metrics: Profile completion % over time, feature adoption

**Success Metrics:**
- Profile completeness: 70% by Day 7, 90% by Day 30
- Payment method adoption: 100% for customers posting jobs, 85% for workers withdrawing
- Feature adoption (deferred fields): >60% within 14 days

**Teams & Dependencies:**
- Frontend: Nudge modals, incentive displays
- Backend: Nudge scheduling, analytics
- Product: Messaging/copy for nudges

---

### Phase 5: WhatsApp & Voice Parallel Flows (Weeks 23-28)

**Goals:** Enable feature phone users and offline scenarios.

**Scope:**
1. WhatsApp Business API integration (Gupshup or Meta)
2. WhatsApp bot: signup, skill selection, job alerts, apply
3. Voice OTP: Multi-language TTS (Hindi, regional languages)
4. SMS fallback: Ensure 99.9% OTP delivery
5. Bot testing: Feature phone simulation

**Deliverables:**
- WhatsApp bot (Node.js + Gupshup SDK)
- Voice OTP integration (FreJun or Exotel)
- Feature phone test environment (JioPhone simulator)
- Documentation: Bot conversation flows, command reference

**Success Metrics:**
- Feature phone user signup: >30% of new workers
- WhatsApp bot engagement: >40% of workers receive job alerts via bot
- Voice OTP usage: <10% (indicates SMS/WhatsApp coverage excellent)

**Teams & Dependencies:**
- Backend: Bot service, voice API integration
- Product: Bot conversation design, command structure
- QA: Feature phone testing, accessibility

---

### Phase 6: Migration from Email-Based Accounts (Weeks 29-36)

**Goals:** Seamlessly transition existing users to phone-first; maintain zero breakage.

**Scope:**
1. Phase 1: Existing users can add phone (optional, incentivized)
2. Phase 2: Require phone for new features (job posting, worker visibility)
3. Phase 3: Email-only accounts become read-only after 30-day warning
4. Phase 4: Deprecate email login (phone becomes primary)

**Deliverables:**
- Email-to-phone migration guide
- In-app nudges for phone addition
- Incentive: "₹100 bonus for adding verified phone"
- Fallback: Email recovery remains available for 6 months post-migration
- Migration script: Backfill placeholder phones for inactive users
- Support: Phone support number for users who need help

**Success Metrics:**
- Phone adoption by existing users: >70% within 3 months
- Account recovery via phone: >80% success rate
- Support tickets for migration: <5% of user base

**Teams & Dependencies:**
- Backend: Migration scripts, fallback endpoints
- Product: Incentive structure, communication plan
- Support: Training on new auth flow, troubleshooting

---

### Implementation Timeline Summary

```
Week 1-6:    Phase 1 (MVP signup)
Week 7-10:   Phase 2 (Worker onboarding)
Week 11-16:  Phase 3 (2FA & recovery)
Week 17-22:  Phase 4 (Progressive profile)
Week 23-28:  Phase 5 (WhatsApp & voice)
Week 29-36:  Phase 6 (Migration)

Total: ~8 months for full rollout
MVP (Phase 1) available: Week 6
```

---

## Appendix: Key Metrics to Track

### Funnel Metrics

```
Signup Flow:
  1. Phone entry: 100%
  2. OTP verified: ___% (target: >90%)
  3. Profile completed (name+role): ___% (target: >85%)
  4. Ready to use: ___% (target: >80%)

Customer Onboarding:
  1. Phone signup: 100%
  2. Pincode entered: ___% (target: >90%)
  3. Post first job: ___% (target: >40%)

Worker Onboarding:
  1. Phone signup: 100%
  2. Address entered: ___% (target: >85%)
  3. First job view: ___% (target: >80%)
  4. Skills selected: ___% (target: >70%)
  5. Photo uploaded: ___% (target: >45%)
  6. First booking received: ___% (target: >30%)
```

### Engagement Metrics

- **Daily Active Users (DAU):** Track across all signup cohorts
- **OTP Resend Rate:** >2 resends = UX issue
- **Account Recovery Usage:** Track which recovery method used
- **Profile Completeness:** % users with photo, bio, skills, address
- **Trust Score:** Composite of verified phone + photo + ratings

### Security Metrics

- **SIM Swap Fraud Attempts:** Should be zero post-detection
- **Anomaly Detection False Positives:** <5% of logins
- **Account Takeover Incidents:** Track monthly
- **OTP Brute-Force Attempts:** Monitor and block

### Business Metrics

- **Signup Cost:** Cost per signup (including OTP SMS/voice)
- **Conversion to Booking:** % signups → 1st booking
- **Customer LTV:** Lifetime value by signup cohort
- **Worker LTV:** Lifetime earnings by signup cohort

---

## Appendix: API Endpoints (New/Modified)

### Auth Endpoints (New Phone-First Flow)

```
POST /api/auth/send-otp
  Request: { phone: "+918XXXXXXXXX" }
  Response: { otp_token: "...", expires_in: 300 }
  
POST /api/auth/verify-otp
  Request: { phone, otp }
  Response: { otp_token, created_user: false }
  
POST /api/auth/signup-complete
  Request: { name, role, password?, preferred_language? }
  Headers: Authorization: Bearer <otp_token>
  Response: { user, access_token, refresh_token }
  
POST /api/auth/login
  Request: { phone }
  Response: { otp_token, expires_in }
  
POST /api/auth/add-phone
  Request: { phone, is_primary? }
  Response: { otp_token }
  
POST /api/auth/verify-recovery-phone
  Request: { phone, otp }
  Response: { access_token, refresh_token }
  
POST /api/auth/set-security-questions
  Request: { questions: [{ question, answer }, ...] }
  Response: { success }
  
POST /api/auth/recover
  Request: { recovery_method: "phone|email|questions", ... }
  Response: { challenge_id, options: [...] }
```

### Profile Endpoints (Progressive Collection)

```
PATCH /api/auth/me
  Request: { email?, photo_url?, address?, preferred_language? }
  Response: { user }
  
GET /api/workers/profile
  Response: { profile: { skills, daily_rate, bio, photo, ratings, ... } }
  
POST /api/workers/profile
  Request: Partial WorkerProfileIn (can omit fields)
  Response: { profile }
  
PATCH /api/workers/profile
  Request: Partial updates
  Response: { profile }
```

### Nudge/Incentive Endpoints

```
GET /api/user/profile-status
  Response: { 
    completeness_percent: 45,
    missing_fields: ['photo', 'skills'],
    incentives: [
      { field: 'photo', reward: '35% more bookings', deadline: '2026-05-17' }
    ]
  }
  
POST /api/user/dismiss-nudge
  Request: { nudge_id: "photo_upload" }
```

---

## Conclusion

This redesign transforms KaamNow from email-first to **phone-first, minimal, and rural-optimized**. By collecting data progressively and leveraging OTP-based auth, KaamNow can:

1. **Increase signup completion** from ~60% to >80%
2. **Reduce worker dropout** from 50% to <25%
3. **Improve rural accessibility** (feature phones, low connectivity)
4. **Strengthen trust** through verified phone + progressive profiling
5. **Reduce fraud risk** with multi-layer 2FA and SIM swap prevention

The implementation is phased (8 months for full rollout) to de-risk changes and gather metrics at each stage. MVP (Phase 1) is achievable in 6 weeks and delivers immediate value.

---

**Next Steps:**
1. **Review & Alignment:** Share this plan with product, engineering, design for feedback
2. **Pilot Program:** Launch Phase 1 with 500 beta users (1-2 cities)
3. **Metrics Dashboard:** Set up tracking for funnel, engagement, security metrics
4. **Vendor Setup:** Onboard OTP provider, WhatsApp API, voice service
5. **Kickoff:** Begin Phase 1 implementation

---

