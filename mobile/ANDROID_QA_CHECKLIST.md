# KaamNow Android — QA Checklist (Phase 7A)
**Date:** 2026-05-16  
**Scope:** Manual device QA before first APK build  
**Status:** Static checks complete (29/29 pass). This checklist covers what only a real device can prove.

---

## Test Device Info

| Field | Fill before testing |
|-------|-------------------|
| Device model | |
| Android version | |
| RAM | |
| Screen size / resolution | |
| Expo Go version OR bare APK | |
| Network: 4G / WiFi | |
| WhatsApp installed: Yes / No | |
| Test date | |
| Tester name | |

**Recommended test device for low-end simulation:**  
Redmi 9A / Realme C11 class (2–3 GB RAM, 720p screen, Android 10–12)

---

## SDK / Dependency Reference

| Package | Version |
|---------|---------|
| Expo SDK | ~54.0.0 |
| React Native | 0.81.5 |
| @react-navigation/native | ^7.0.0 |
| expo-image-picker | ~17.0.8 |

---

## Section 1 — OTP Input (HIGH PRIORITY)

> LoginScreen uses its own inline 6-box OTP implementation with `otpRefs` array — not the reusable `OTPInput` component. All boxes must be tested on Android hardware.

| # | Test | Expected | Pass / Fail | Notes |
|---|------|----------|-------------|-------|
| OTP-1 | Type first digit in box 1 | Focus jumps to box 2 automatically | | |
| OTP-2 | Type all 6 digits | Each digit fills, focus reaches box 6 | | |
| OTP-3 | Backspace on filled box | Digit clears, focus stays on same box | | |
| OTP-4 | Backspace on empty box | Focus moves back to previous box | | |
| OTP-5 | Tap box 3 directly | Cursor lands in box 3 | | |
| OTP-6 | Paste 6-digit OTP | All 6 boxes fill at once, focus moves to last box | | |
| OTP-7 | Paste partial (3 digits) | First 3 boxes fill, no crash | | |
| OTP-8 | Android OTP SMS autofill | OTP auto-populates if SMS arrives (if supported by SMS format) | | |
| OTP-9 | Submit with incomplete OTP | Shows "6-digit code dalein" alert, does not call API | | |
| OTP-10 | Keyboard hides OTP boxes | Boxes remain visible above keyboard | | |

---

## Section 2 — WhatsApp CTA (HIGH PRIORITY)

> Guest Landing WhatsApp CTA uses `Linking.openURL("https://wa.me/917834811114?text=Hi%20KaamNow")` with `.catch()` fallback Alert.

| # | Test | Expected | Pass / Fail | Notes |
|---|------|----------|-------------|-------|
| WA-1 | Tap WhatsApp CTA (WhatsApp installed) | WhatsApp app opens — NOT browser | | |
| WA-2 | WhatsApp opens correct chat | Chat opens with number **+91 78348 11114** | | |
| WA-3 | Prefilled text in WhatsApp | Message box shows **"Hi KaamNow"** pre-typed | | |
| WA-4 | Tap WhatsApp CTA (WhatsApp NOT installed) | Alert: "WhatsApp install karein ya +91 78348 11114 par manually message karein." | | |
| WA-5 | WhatsApp CTA copy (EN) | Button reads: "WhatsApp se shuru karein" | | |
| WA-6 | WhatsApp CTA copy (हिं) | Button reads: "WhatsApp से शुरू करें" | | |
| WA-7 | Internal Chat tab NOT opened | WhatsApp Demo screen should NOT open | | |

---

## Section 3 — Hindi / Hinglish Rendering

> Manrope and Outfit fonts must render Devanagari correctly. Box glyphs (□) indicate missing glyph support.

| # | Screen | What to check | Pass / Fail | Notes |
|---|--------|---------------|-------------|-------|
| HI-1 | LoginScreen | "Login करो", "OTP भेजो", "Code भेजा: +91..." no box glyphs | | |
| HI-2 | RoleSelectionScreen | "Kaam Dene Wale", "Kaam Karne Wale" render cleanly | | |
| HI-3 | WorkerOnboardingScreen | Hindi step hints ("Poora naam likho", "Honest rahein") | | |
| HI-4 | LandingScreen (guest, हिं mode) | "बिहार का भरोसेमंद काम का मंच", category chips in Hindi | | |
| HI-5 | LandingScreen (worker, हिं mode) | "आज का कaam taiyaar hai?" no mixed-script clipping | | |
| HI-6 | DashboardScreen worker | "Mera Kaam", "Chal raha kaam", "Abhi koi kaam nahi" | | |
| HI-7 | WorkerMyProfileScreen | "Meri Profile", "Profile strong rakhein" | | |
| HI-8 | CustomerProfileScreen | "Meri Profile", "Apni details updated rakhein" | | |
| HI-9 | FindWorkScreen (हिं) | Category chip labels (राजमिस्त्री is the longest — must not clip) | | |
| HI-10 | WorkerJobFeedScreen (हिं) | "लोड हो रहा है...", "kaam mile", applied filter tags | | |
| HI-11 | Language toggle (EN→हिं→EN) | Toggle works on Landing, all copy switches correctly | | |

---

## Section 4 — Keyboard Safety

> All 10 input screens now have `KeyboardAvoidingView`. Test that keyboard does not cover the active input field.

| # | Screen / Field | Expected | Pass / Fail | Notes |
|---|----------------|----------|-------------|-------|
| KB-1 | LoginScreen — Phone input | Keyboard opens, +91 field stays visible above keyboard | | |
| KB-2 | LoginScreen — OTP boxes | All 6 OTP boxes visible when number keyboard is open | | |
| KB-3 | PhoneSignupScreen | Phone input visible, no keyboard overlap | | |
| KB-4 | WorkerOnboarding Step 1 — Daily rate | Rate input visible when number keyboard opens | | |
| KB-5 | WorkerOnboarding Step 2 — Village | Village field scrolls into view when keyboard opens | | |
| KB-6 | WorkerOnboarding Step 2 — Pincode | Pincode field accessible; live lookup result visible | | |
| KB-7 | CustomerOnboarding — Pincode | Pincode visible, lookup result shows above keyboard | | |
| KB-8 | PostJob Step 3 — Daily rate | Rate input visible when number keyboard opens | | |
| KB-9 | PostJob Step 3 — Pincode | Pincode field visible | | |
| KB-10 | WorkerMyProfileScreen edit — Bio | Multiline bio field scrolls into view when keyboard opens | | |
| KB-11 | CustomerProfileScreen edit — Name | Name field visible above keyboard | | |
| KB-12 | MarketplaceScreen — Pincode modal | Pincode input has `autoFocus`; modal input visible above keyboard | | |
| KB-13 | FindWorkScreen — Search input | Search box stays visible above keyboard when focused | | |
| KB-14 | WorkerJobFeedScreen — Search input | Search box stays visible above keyboard | | |

---

## Section 5 — Navigation Flows

| # | Flow | Expected path | Pass / Fail | Notes |
|---|------|---------------|-------------|-------|
| NAV-1 | Guest → Find Workers tab | MarketplaceScreen with worker list | | |
| NAV-2 | Guest → Find Work tab | FindWorkScreen with job list | | |
| NAV-3 | Guest → WhatsApp tab | WhatsAppDemoScreen (internal demo) | | |
| NAV-4 | Guest → "Join free" | PhoneSignupScreen | | |
| NAV-5 | Guest → "Log in" | LoginScreen | | |
| NAV-6 | Guest → Worker card → WorkerProfile | WorkerProfileScreen with hero, stats, booking | | |
| NAV-7 | Customer signup → OTP → Role select → Customer home | Lands on LandingScreen customer state | | |
| NAV-8 | Worker signup → OTP → Role select → Worker onboarding | 3-step WorkerOnboarding | | |
| NAV-9 | Worker onboarding complete → Worker home | LandingScreen worker state | | |
| NAV-10 | Customer home → Post Job | 4-step PostJobScreen | | |
| NAV-11 | PostJob complete → "OK" | MarketplaceScreen (Find Workers tab) | | |
| NAV-12 | Customer Dashboard → "Review Responses" | Detail modal opens | | |
| NAV-13 | Worker Dashboard → "Browse Jobs" | WorkerJobFeedScreen | | |
| NAV-14 | Worker Job Feed → Apply | Interest sent, card updates to "Pending review" | | |
| NAV-15 | Worker Dashboard → Detail modal → Mark Done | Completion confirmation | | |
| NAV-16 | Customer Dashboard → Hire worker → Rate | Rating modal appears | | |
| NAV-17 | Worker Home → availability toggle | Updates backend, UI changes green/grey | | |
| NAV-18 | Android back button on Login step 2 | Returns to step 1 (phone entry), NOT to previous screen | | |
| NAV-19 | Android back button on Modal | Closes modal, does not exit screen | | |
| NAV-20 | Bottom tab switching | No flicker, correct screen loads, state preserved | | |

---

## Section 6 — Android-Specific Actions

| # | Test | Expected | Pass / Fail | Notes |
|---|------|----------|-------------|-------|
| AND-1 | WorkerJobFeedScreen hired card → Call | Android phone dialer opens with customer number | | |
| AND-2 | DashboardScreen active job → Call Worker/Customer | Android dialer opens | | |
| AND-3 | FindWorkScreen hired card → Call | Android dialer opens | | |
| AND-4 | WorkerMyProfileScreen edit → take photo (camera) | Camera opens, photo saved as profile picture | | |
| AND-5 | WorkerMyProfileScreen edit → choose from library | Gallery opens, photo saved | | |
| AND-6 | CustomerProfileScreen edit → take photo | Camera opens, photo uploads | | |
| AND-7 | WorkerMyProfileScreen → Remove photo | Photo removed, initials fallback appears | | |
| AND-8 | Back button on nested screens (WorkerProfile, PostJob, etc.) | Returns to correct previous screen | | |
| AND-9 | Bottom tab bar + Android gesture navigation | Tab bar not overlapping Android nav pill (64px height + 8px padding) | | |
| AND-10 | App backgrounded then foregrounded | No crash, screen state preserved | | |
| AND-11 | Screen rotation (if not locked) | No crash (app may not support rotation — note if portrait-locked) | | |
| AND-12 | Network lost mid-operation | Alert shown, no crash | | |

---

## Section 7 — Low-End Device Performance

> Test on or simulate a device with 2–3 GB RAM, API 26–29.

| # | Test | Expected | Pass / Fail | Notes |
|---|------|----------|-------------|-------|
| PERF-1 | Marketplace FlatList — scroll 30+ workers | Smooth, no jank, no white flashes | | |
| PERF-2 | WorkerJobFeed FlatList — scroll 20+ jobs | Smooth, job cards render without delay | | |
| PERF-3 | Dashboard pull-to-refresh | Spinner shows, data reloads < 3s on 4G | | |
| PERF-4 | LandingScreen first load | Worker previews and stats appear within 2s | | |
| PERF-5 | WorkerCard photo load | Photo loads with placeholder (not white square) | | |
| PERF-6 | WorkerCard NO photo | Initials fallback renders immediately, no delay | | |
| PERF-7 | WorkerProfileScreen hero photo | Large avatar loads cleanly (no flicker) | | |
| PERF-8 | PostJob category grid tap | Category selected instantly, auto-advances to step 2 | | |
| PERF-9 | Marketplace search — type fast | No input lag, no dropped characters | | |
| PERF-10 | App startup (cold) | Splash → home screen < 5s | | |

---

## Section 8 — Missing Data Safety

> All screens must handle missing/null data without crashing.

| # | Scenario | Expected | Pass / Fail | Notes |
|---|----------|----------|-------------|-------|
| NULL-1 | Worker with no photo | Initials shown in WorkerCard, WorkerProfile hero, WorkerMyProfile | | |
| NULL-2 | Worker with no rating (0.0) | "0.0" shown, no crash, no NaN | | |
| NULL-3 | Worker with no skills | Empty state or "No skills" shown in WorkerMyProfile view mode | | |
| NULL-4 | Worker with no location/village | "Location not set" shown in hero | | |
| NULL-5 | Customer with no address | Location nudge card shown on CustomerProfile | | |
| NULL-6 | Customer with no name set | "Customer" shown as fallback in hero | | |
| NULL-7 | Empty job feed (no jobs in area) | EmptyState with "Is area mein koi kaam nahin" | | |
| NULL-8 | Empty worker list in Marketplace | EmptyState with "Koi worker nahin mila" | | |
| NULL-9 | Worker dashboard — no engagements | "Abhi koi kaam nahi" EmptyState + Browse Jobs CTA | | |
| NULL-10 | Customer dashboard — no jobs posted | "Abhi koi job post nahi hai" EmptyState + Post Job CTA | | |

---

## Section 9 — Visual Consistency Spot-Checks

| # | Check | Expected | Pass / Fail | Notes |
|---|-------|----------|-------------|-------|
| VIS-1 | Find Workers — category chip selected | Teal background + teal text, NO floating green checkmark | | |
| VIS-2 | Find Work — category chip emoji | Emoji visible at correct size (16px), not tiny or clipped | | |
| VIS-3 | Find Work — header does NOT overlap job list | Scroll reveals job cards immediately below header | | |
| VIS-4 | Worker Dashboard stat summary row | 4 stat boxes: Active / Pending / Done / Cancelled | | |
| VIS-5 | WorkerMyProfile completion card | Visible when profile < 100%; hidden when all fields filled | | |
| VIS-6 | CustomerProfile location nudge | Amber card visible when no address; gone after address saved | | |
| VIS-7 | Bottom nav icons | Filled icon for active tab, outline for inactive | | |
| VIS-8 | LandingScreen path cards | Both "Find Workers" and "Find Work" have green circle + arrow | | |
| VIS-9 | Marketplace pincode modal | Clean bottom sheet, no side-by-side layout with ALL/Available | | |
| VIS-10 | "Available Now" pill + Reset in Marketplace | Side by side in count row, reset only visible when filter active | | |

---

## Critical Blocker Section

These failures block APK release:

| Priority | Issue | Status |
|----------|-------|--------|
| 🔴 BLOCKER | OTP 6-box auto-advance does not work on Android | Untested |
| 🔴 BLOCKER | WhatsApp CTA opens browser instead of WhatsApp app | Untested |
| 🔴 BLOCKER | Keyboard covers OTP boxes on Login (cannot enter OTP) | Untested |
| 🔴 BLOCKER | Save on WorkerMyProfile crashes or silently fails | Untested |
| 🔴 BLOCKER | Save on CustomerProfile crashes or silently fails | Untested |
| 🔴 BLOCKER | Worker interest/apply crashes | Untested |
| 🔴 BLOCKER | Customer accept/reject worker crashes | Untested |
| 🔴 BLOCKER | Photo upload fails (camera or gallery) | Untested |

---

## Minor Visual Bug Section

These are acceptable for first APK but should be logged:

| Priority | Issue | Status |
|----------|-------|--------|
| 🟡 MINOR | WorkerMyProfileScreen phone shown but not tappable to call | Known — display only, no tel: link in profile screen |
| 🟡 MINOR | Legacy `colors.saffron` used in DashboardScreen detail modal icon (same value as primary, no visual difference) | Known — dead alias |
| 🟡 MINOR | Unused style keys in MarketplaceScreen (filterPanel, filterRow etc.) | Known — dead code, no visual impact |
| 🟡 MINOR | `SafeAreaView` import in DashboardScreen (unused after Phase 5B) | Known — lint warning only |
| 🟡 MINOR | Hindi text may show system fallback font on Android API 26 (Manrope may not cover all Devanagari) | Untested |

---

## APK Readiness Decision

Complete this section after device testing:

| Category | Result |
|----------|--------|
| OTP input | ☐ PASS / ☐ FAIL |
| WhatsApp CTA | ☐ PASS / ☐ FAIL |
| Keyboard safety (all screens) | ☐ PASS / ☐ FAIL |
| Navigation flows | ☐ PASS / ☐ FAIL |
| Android actions (call, photo) | ☐ PASS / ☐ FAIL |
| Hindi rendering | ☐ PASS / ☐ FAIL |
| Missing data safety | ☐ PASS / ☐ FAIL |
| Low-end device performance | ☐ PASS / ☐ FAIL |

**Decision:**

- ✅ **READY FOR APK** — All blockers pass, minor issues logged
- ⚠️ **FIX BEFORE APK** — One or more blockers failed (list below)
- ❌ **NOT READY** — Multiple blockers failed

**Blockers found (fill if any):**
```
1.
2.
3.
```

**Tester sign-off:**  
Name: _______________  Date: _______________

---

## Test Sequence (Recommended Order)

Run in this exact sequence on one device:

```
1.  Cold start — watch startup time
2.  Guest home — WhatsApp CTA, path cards, worker preview
3.  Language toggle EN → हिं → EN
4.  Find Workers — search, location modal, available now, reset
5.  Find Work — category chips, search, pincode modal
6.  Guest → "Join free" → Phone signup → OTP (6-box test)
7.  Role selection → Customer
8.  Customer onboarding (pincode + village)
9.  Customer home → Post Job (all 4 steps)
10. Customer profile → edit name → edit location
11. Customer dashboard — review responses (if any)
12. Logout
13. Login as existing worker → OTP
14. Worker home — availability toggle
15. Worker job feed — search, category filter, pincode modal, apply
16. Worker dashboard — view active/pending/history
17. Worker profile (My Profile) — edit skills, rate, bio → save
18. Worker profile — photo upload (camera)
19. Back button behavior throughout
20. App background → foreground
```

---

## Syntax Check Reference

Run before building APK:

```bash
cd mobile && node -e '
const babel = require("@babel/core");
const files = [
  "App.js","src/theme.js",
  "src/components/AppScreen.js","src/components/AppHeader.js",
  "src/components/PrimaryButton.js","src/components/SecondaryButton.js",
  "src/components/InputField.js","src/components/PhoneInput.js",
  "src/components/OTPInput.js","src/components/EmptyState.js",
  "src/components/StatusBadge.js","src/components/WorkerCard.js",
  "src/components/JobCard.js","src/components/LocationBar.js",
  "src/components/RatingTrustRow.js","src/components/ServiceCategoryCard.js",
  "src/components/TrustBadge.js",
  "src/screens/LoginScreen.js","src/screens/PhoneSignupScreen.js",
  "src/screens/RoleSelectionScreen.js","src/screens/WorkerOnboardingScreen.js",
  "src/screens/CustomerOnboardingScreen.js","src/screens/LandingScreen.js",
  "src/screens/MarketplaceScreen.js","src/screens/WorkerJobFeedScreen.js",
  "src/screens/PostJobScreen.js","src/screens/WorkerProfileScreen.js",
  "src/screens/DashboardScreen.js","src/screens/FindWorkScreen.js",
  "src/screens/WorkerMyProfileScreen.js","src/screens/CustomerProfileScreen.js",
];
let p=0,f=0;
for (const file of files) {
  try { babel.transformFileSync(file,{presets:["babel-preset-expo"],babelrc:false,configFile:false}); console.log("OK  ",file); p++; }
  catch(e) { console.error("FAIL",file,"->",e.message.split("\n")[0]); f++; }
}
console.log("Passed:",p,"Failed:",f);
'
```

**Current result (2026-05-16): 15 key screens — 15/15 PASS**
