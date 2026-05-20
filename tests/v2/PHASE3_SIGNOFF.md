## Phase 3 Sign-Off — Mobile App

Date: 2026-05-21
Signed off by: Claude

---

### 1. Navigation Overhaul

`mobile/App.js` replaced role-based tab bars with a single unified navigation:

**Logged-in users (all):**
```
Home | Find Work | Post Job | Activity | Profile
```

**Guests:**
```
Home | Browse | Find Work | Login
```

Deep link config added:
- `kaamnow://engagement/:id` → EngagementDetailScreen
- `kaamnow://chat/:engagementId` → ChatScreen

Sentry init via `Sentry.wrap(App)`.

---

### 2. i18n — 4-Language String Table

File: `mobile/src/i18n/translations.js`
Languages: EN / HI (Hindi) / BHO (Bhojpuri) / MAI (Maithili)
Total lines: ~1650 (200+ keys per language)

Key sections:
- Navigation tabs (nav_home, nav_find_work, nav_post_job, nav_activity, nav_profile)
- All screen titles, buttons, labels, placeholders, error messages
- Trust tiers: New (1) / Trusted (2) / Pro (3) / Star (4)
- "Local Expert" replaces "Worker" everywhere in display strings

---

### 3. AuthContext Updates

`mobile/src/contexts/AuthContext.js`:
- `completeSignup(name, gender)` — role removed, gender added
- `isWorker: user?.is_worker === true` — computed helper exposed
- `isCustomer: user?.is_customer !== false` — computed helper exposed

---

### 4. LoginScreen — Role Step Removed

Step 3: Name + optional Gender (replaces Name + Role).
Navigates to `Tabs` after signup. No more `WorkerOnboarding`/`CustomerOnboarding`.

---

### 5. Deleted Screens (5)

RoleSelectionScreen, CustomerOnboardingScreen, WorkerOnboardingScreen,
CustomerProfileScreen, WorkerMyProfileScreen — all removed.

No remaining references in source code.

---

### 6. New Screens (21 created)

ProfileScreen, EngagementDetailScreen, ChatScreen, NotificationsScreen,
EarningsScreen, WalletScreen, FAQScreen, TermsScreen, PrivacyScreen,
SupportChatScreen, MapScreen, QRCodeScreen, ActivityScreen,
SavedExpertsScreen, SavedAddressesScreen, EmergencyContactScreen,
EditPhotoScreen, BecomeExpertScreen, PortfolioScreen,
CertificationsScreen, VideoProfileScreen, KYCScreen

---

### 7. Updated Screens (Phase 3C)

**DashboardScreen** — all `user.role` checks → `user.is_worker`. Both jobs+engagements loaded for all users.

**PostJobScreen** — role guard removed (anyone can post). Added: urgency chips, recurrence chips, anonymous toggle, GPS "Use my location", AI voice-to-job button, AI photo-to-job button.

**WorkerJobFeedScreen** — role guard removed. Non-workers see feed + "Become a Local Expert" banner. Apply → redirects non-workers to BecomeExpert.

**MarketplaceScreen** — "Near Me" GPS button, "Map" button (→ MapScreen), GPS coords in search query.

**Other fixes** — LandingScreen, FindWorkScreen, WorkerProfileScreen, CalendarScreen, PhoneSignupScreen all updated to use `is_worker`.

---

### 8. Role Check Sweep Result

```
grep -rn "user\.role\|user?\.role" mobile/src/screens/
→ 0 results
```

---

### 9. Known Caveats

- AI endpoints use dev fallbacks without Doppler credentials
- MapScreen needs EAS build (not Expo Go)
- Chatwoot URL requires `EXPO_PUBLIC_CHATWOOT_URL` env var

---

### 10. Phase 3D — Not Yet Implemented

- First-time Lottie walkthrough
- Offline mode (AsyncStorage cache)
- PostHog events
- Language toggle in AppHeader
- Skill badges in ProfileScreen

These are follow-ups that don't block Phase 4.

---

STATUS: PASS
Signed off by: Claude
Date: 2026-05-21
