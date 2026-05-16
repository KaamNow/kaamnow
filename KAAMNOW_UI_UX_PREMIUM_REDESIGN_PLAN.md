# KaamNow — Premium UI/UX Redesign Plan
**Prepared:** 2026-05-16  
**Status:** Planning only — no code changes in this document  
**Scope:** React Native (Expo) mobile app, Android-first, low-end device friendly

---

## Table of Contents
1. Current App Audit
2. Product Design Direction
3. Premium Design System Proposal
4. Screen-by-Screen Redesign Plan
5. Component System Plan
6. Customer Flow UX Improvements
7. Worker Flow UX Improvements
8. Copywriting Improvements
9. Implementation Phases
10. Risk Control
11. Final Output

---

## 1. Current App Audit

### 1.1 Screens Inventory

| Screen | File | Role(s) | Current Status |
|--------|------|---------|----------------|
| Landing / Home | `LandingScreen.js` | Guest + Worker + Customer | 3 states in 1 file — functional but dense |
| Login / OTP | `LoginScreen.js` | All | 3-step flow — workable but flat |
| Phone Signup | `PhoneSignupScreen.js` | New users | Not audited in detail |
| Worker Onboarding | `WorkerOnboardingScreen.js` | Worker | Form-heavy, NGO-like |
| Customer Onboarding | `CustomerOnboardingScreen.js` | Customer | Not audited in detail |
| Marketplace / Find Workers | `MarketplaceScreen.js` | Guest + Customer | Functional, lacks visual pull |
| Worker Profile | `WorkerProfileScreen.js` | All | Best screen currently — hero is decent |
| Post Job | `PostJobScreen.js` | Customer | 4-step wizard — solid structure |
| Dashboard / My Work | `DashboardScreen.js` | Worker + Customer | Overloaded — too many tabs |
| Worker Job Feed | `WorkerJobFeedScreen.js` | Worker | Dense header, good cards |
| Find Work (Guest) | `FindWorkScreen.js` | Guest | Not audited in detail |
| Worker My Profile | `WorkerMyProfileScreen.js` | Worker | Not audited in detail |
| Customer Profile | `CustomerProfileScreen.js` | Customer | Not audited in detail |
| Calendar | `CalendarScreen.js` | Worker + Customer | Not audited in detail |
| Contact Support | `ContactSupportScreen.js` | All | Not audited in detail |
| WhatsApp Demo | `WhatsAppDemoScreen.js` | Guest | Marketing-adjacent |
| Admin | `AdminScreen.js` | Admin | Out of scope |

**Missing screens (need to create):**
- Dedicated Splash/Loader screen
- Notifications screen
- Settings screen
- Worker KYC screen
- Rating/review history screen

---

### 1.2 User Flows

**Guest Flow:**
```
App open → Splash → Landing (guest) → Login or Signup
                                    → Browse Workers (unauthenticated)
                                    → Browse Jobs (unauthenticated)
```

**Customer Onboarding Flow:**
```
Signup (phone) → OTP verify → Role selection (step 3 of login) → Customer Onboarding (pincode/location) → Customer Home
```

**Worker Onboarding Flow:**
```
Signup (phone) → OTP verify → Role selection → Worker Onboarding (name + rate → address → skills) → Worker Home
```

**Customer Core Flow:**
```
Customer Home → Post Job (4 steps) → Dashboard (Responses tab) → Accept/Reject → Active Job → Rate Worker
             → Browse Workers → Worker Profile → Select Job → Send Booking
```

**Worker Core Flow:**
```
Worker Home → Job Feed → Express Interest → Dashboard (Pending tab) → Accepted → Mark Done
           → My Profile → Update skills/rate/availability
```

---

### 1.3 Screens That Feel Basic/NGO-Like

**Severity: HIGH (must fix)**
- `WorkerOnboardingScreen.js` — "Worker Onboarding · 1 of 3" tag at top, then a form with Input components stacked vertically. Completely form-like, no visual personality, no motivational copy. Feels like a government registration form.
- `DashboardScreen.js` — Too many tabs (4 for customer, 4 for worker). "Tap for details →" hint is awkward. Hero gradient is ok but below it drops into a list of dense cards with no breathing room.
- `LoginScreen.js` — "Step 1 of 2" and "Step 2 of 2" copy is bureaucratic. The OTP input is a single box with letter-spacing 14 — visually plain. No brand illustration. Back button says "Back" in small teal text — feels like a web form.

**Severity: MEDIUM (improve)**
- `LandingScreen.js` (guest view) — Footer "KaamNow · Bihar se shuru 🙏" is endearing but reads like a charity tagline. The stats strip (1K+ Workers / 200+ Villages / 5K+ Jobs) is tiny uppercase text in a bordered container — feels like a government tally board.
- `MarketplaceScreen.js` — "FIND WORKERS" uppercase label at top, then an instant-search pattern with an expandable filter panel. Functional but cold. Empty state is basic emoji + two lines.
- `WorkerJobFeedScreen.js` — "JOB FEED" uppercase label. The header area is very dense: title row → search row → category chips → filter row → count row — five rows before any content.

**Severity: LOW (polish)**
- `WorkerProfileScreen.js` — Already the best-designed screen. Hero gradient is solid. The booking card ("Book Ramesh") is clean. Needs minor polish: larger avatar, better trust signal display, verified badge hierarchy.
- `PostJobScreen.js` — "Auto-generated description" label in the review step feels developer-y. Otherwise the 4-step wizard is well-structured.

---

### 1.4 Inconsistencies Found

**Typography inconsistencies:**
- `LandingScreen.js` stats: `fontSize: 22` with `fontFamily: fonts.display` — correct
- `DashboardScreen.js` cards: `fontFamily: fonts.display, fontSize: 16` for card titles — display font at 16px is too small for display font usage
- `WorkerJobFeedScreen.js` count text: `fontFamily: fonts.body, fontSize: 12` — fine
- `WorkerOnboardingScreen.js` title: `fontFamily: fonts.display, fontSize: sizes.h2` (28px) — correct
- Some screens use `sizes.h2` tokens, others hardcode font sizes directly — **inconsistent usage of the `sizes` token**

**Spacing inconsistencies:**
- Most screens use `spacing.lg` (16) as horizontal padding, but `WorkerOnboardingScreen.js` uses `spacing.xl` (24)
- `DashboardScreen.js` hero uses `paddingHorizontal: spacing.lg` but content uses an inner `paddingHorizontal: spacing.lg` creating double-nesting
- Card padding varies: `padding: 14` in some, `padding: 16` in others, `padding: 18` in booking card — no token used

**Color naming confusion:**
- `colors.saffron` is actually `#0F766E` (deep teal) — the variable was renamed from saffron to teal in color but the key name was kept. This is technically a developer debt, not user-visible, but will confuse any new developer
- `colors.indigo` is also `#0F766E` — same as `colors.saffron`. They were unified. This creates dead aliases in the theme

**Button inconsistencies:**
- `Button.js` `base` style uses `radius.md` (10px border-radius)
- Inline `Pressable` CTAs across screens use `borderRadius: 12`, `borderRadius: 14`, `borderRadius: 10` inconsistently
- Some action buttons have `paddingVertical: 11`, others `paddingVertical: 14`, others `paddingVertical: 15`
- Bottom nav tab buttons and sheet confirm buttons both use different padding — no shared token

**Card inconsistencies:**
- `WorkerCard.js`: `borderRadius: 16`, `padding: 14`
- `DashboardScreen.js` card: `borderRadius: 14`, `padding: 14`
- `WorkerJobFeedScreen.js` job card: `borderRadius: 16`, `padding: 16`
- `LandingScreen.js` wCard: `borderRadius: 14`, `padding: 12`
- Worker preview card on Landing vs WorkerCard component — two different designs for the same entity

**Input inconsistencies:**
- `LoginScreen.js` uses custom phone input styles inline
- `WorkerOnboardingScreen.js` uses the `Input` component from `components/Input.js`
- `PostJobScreen.js` defines its own `styles.input` inline
- `MarketplaceScreen.js` defines its own `styles.searchBox` inline
- **There is no universal input design — every screen rolls its own**

**Navigation inconsistencies:**
- Some screens show native header (`CustomerOnboarding: "Your Location"`) — plain OS default header
- Some screens have custom back buttons inside (`WorkerProfileScreen`, `LoginScreen`) with `headerShown: false`
- Some screens use the native header (`WorkerMyProfile: "My Profile"`, `FindWork: "Find Work"`)
- The mix of native and custom headers creates an inconsistent look

---

### 1.5 Missing Trust Signals

- No "verified workers" badge system visible on the home/marketplace landing — `TrustBadge.js` component exists but usage is unclear
- No reviews/testimonials section on Landing for guest users
- No "last active" or "responds quickly" indicators on worker cards
- No visible safety/vetting information for customers
- Worker trust tiers (Basic/Verified/Pro/Elite) exist in backend but only shown inside `WorkerProfileScreen` and `WorkerCard` — not surfaced prominently on marketplace
- No "background checked" or "ID verified" signal even for Verified tier
- No platform guarantees or dispute resolution mention anywhere

---

### 1.6 Unnecessary Complexity

- `LandingScreen.js` handles 3 completely different states (Guest, Worker, Customer) in one 912-line file — deeply nested conditional rendering
- `DashboardScreen.js` is 987 lines with 4 tabs per role (8 total states) — needs decomposition
- `WorkerOnboardingScreen.js` has 6 address fields (village, post, block, district, state, pincode) all at once on step 1 — overwhelming
- The WhatsApp opt-in flow inside `LoginScreen.js` (requires_optin banner) is a niche edge case that takes up prominent OTP screen space
- `PostJobScreen.js` has an "Auto-generated description" in the review step — this is developer-facing, confusing to users

---

## 2. Product Design Direction

### 2.1 Brand Feel

**KaamNow = Reliable. Local. Direct.**

Not a luxury brand. Not a tech startup. Not an NGO.

KaamNow should feel like the **most trusted person in your village who also runs a professional service**. The visual language says: "We know Bihar, we know this community, we take our work seriously, and we will help you fast."

Design personality: **Warm professional. Confident without being corporate. Indian without being kitsch.**

Inspirations:
- **Urban Company** for service clarity and worker trust signals
- **PhonePe** for tap-to-go simplicity and strong CTA hierarchy
- **Apna** for worker-centric language and job-first thinking
- **Zepto** for clean spacing, fast information hierarchy, decisive typography

Anti-inspirations:
- Government portals (dense forms, grey backgrounds, Times New Roman)
- NGO apps (muted colors, donation-speak, poverty framing)
- Luxury apps (marble textures, thin serifs, whitespace overkill)

---

### 2.2 Color Direction

**Keep the existing Deep Teal primary** — it's correct, neutral, trustworthy, not religious.

**Additions and refinements:**
- Add a warm background tint (existing `#F8F7F4` is perfect — keep)
- Add a **warm accent** (not amber/money) for onboarding highlight moments — a lighter, warmer teal tint
- Money stays amber (`#B45309`) — correct, only on ₹ numbers
- Success stays green (`#16A34A`) — correct
- Danger stays red (`#DC2626`) — correct

**New semantic colors needed:**
- `info`: `#0EA5E9` — for informational banners (WhatsApp opt-in, tips)
- `warning`: `#D97706` — for nudges (complete your profile)
- `surface2`: `#F0FDFA` — elevated surfaces, selected states (already exists as `saffronTint` — rename)

---

### 2.3 Typography Direction

**Keep Outfit + Manrope** — already premium, already loaded.

**Scale adjustment:**
- Increase base body size from 15 to 15 (fine as-is)
- Add a `caption` size of 12 (currently `small: 13` — add `caption: 12, micro: 10`)
- Display font (`Outfit`) should only be used for: screen titles, stat numbers, hero text, CTA text in hero blocks
- Body font (`Manrope`) for all other text including card titles, labels, body copy

**Text hierarchy rules (to enforce):**
1. `h1` (36) — Screen hero title only (Landing, onboarding first step)
2. `h2` (28) — Section titles within onboarding steps  
3. `h3` (22) — Card prominent numbers (stats)
4. `h4` (18) — Sub-section headers
5. `body` (15) — Primary body text, card content
6. `small` (13) — Secondary body, hints, captions
7. `tiny` (11) — Labels, chips, tags, meta info
8. `micro` (10) — NEW — Uppercase tracking labels only (e.g. "MASON", "AVAILABLE")

---

### 2.4 Icon Style

- **Keep Ionicons** — already installed, familiar icon set, works on low-end devices
- Use `outline` variants by default, `filled` for active/selected states
- Icon sizes: 20 (action icons), 16 (inline with text), 14 (chips/badges), 12 (meta info)
- Never mix filled and outline icons in the same visual context

---

### 2.5 Card Style

**Unified card design:**
- `borderRadius: 16` — consistent across all cards (move away from 12/14 mix)
- `borderWidth: 1, borderColor: colors.border` — thin border, not shadow-only
- `padding: 16` — consistent (not 12/13/14/18 mix)
- `backgroundColor: "#FFFFFF"` — white card on warm bg
- Subtle elevation: `elevation: 1` on Android with `shadowColor: "#0F766E10"` — very light teal shadow
- **Interactive cards**: `pressed` state should use `opacity: 0.94` (not 0.88 — too dark)
- **Highlighted cards** (e.g. worker with pending response): `borderLeftWidth: 3, borderLeftColor: colors.saffron`

**Card types:**
1. List card (worker card, job card) — horizontal layout, photo/icon + content
2. Stats card — 3-column horizontal strip
3. CTA card (gradient) — full-width, teal gradient
4. Alert card — amber/green/red border-left
5. Empty state card — centered illustration + text + button

---

### 2.6 Button Style

**Hierarchy:**
1. **Primary** — Full width, `borderRadius: 14`, `paddingVertical: 16`, teal fill, white bold text, 15px. Use for: main CTA per screen.
2. **Secondary** — Full width, `borderRadius: 14`, `paddingVertical: 14`, white fill with teal border (1.5px), teal bold text.
3. **Destructive** — Red fill or red border, same proportions as secondary.
4. **Ghost/Tertiary** — No border, no fill, teal text — for low-emphasis actions ("Skip", "Back", "See all →")
5. **Icon+Text** — Same as primary/secondary but with left-aligned icon

**Rules:**
- Every screen must have exactly 1 primary button visible at a time
- Secondary buttons should be visually subordinate to primary
- Never stack two primary buttons (one must become secondary)
- Loading state: replace title with `ActivityIndicator` (current behavior is correct)
- Disabled state: `opacity: 0.4` (current `0.6` is too visible — makes disabled look active)

---

### 2.7 Input Style

**Unified input design:**
- `backgroundColor: "#FFFFFF"` 
- `borderRadius: 12`
- `borderWidth: 1.5, borderColor: colors.border` (default)
- `borderColor: colors.saffron` (focused)
- `borderColor: colors.success` (validated/success)
- `borderColor: colors.danger` (error)
- `paddingVertical: 14, paddingHorizontal: 16`
- `fontFamily: fonts.body, fontSize: 15, color: colors.text`
- Label above: `fontFamily: fonts.bodyBold, fontSize: 12, color: colors.textSecondary` (NOT uppercase with tracking — that's too form-like)
- Helper text below: `fontFamily: fonts.body, fontSize: 12, color: colors.textMuted`
- Error text below: `fontFamily: fonts.body, fontSize: 12, color: colors.danger`

---

### 2.8 Empty State Style

**Pattern:**
```
[Icon or illustration — 64x64, teal color]
[Title — Outfit 20px]
[Subtitle — Manrope 14px, textMuted]
[Optional: Primary button]
```

**Rules:**
- Never use large emoji as empty state illustration (looks casual/NGO)
- Use a teal-colored Ionicons icon at 64px or a simple SVG illustration
- Title should be motivating, not just descriptive ("No jobs yet" → "Post your first job")
- Always have an actionable next step unless impossible

---

### 2.9 Loading State Style

**Three types:**
1. **Full-screen**: Centered ActivityIndicator with teal color on warm background (current behavior — correct)
2. **Inline/list**: Small teal ActivityIndicator next to count text (current — correct)
3. **Button**: Replace text with ActivityIndicator centered in button (current — correct)
4. **Card skeleton**: NEW — For marketplace/job feed, show 3 skeleton cards with shimmer animation on first load. Remove after data arrives. (Not in current app — worth adding in Phase 5)

---

### 2.10 Error State Style

**Pattern:**
```
[Red border input OR red banner below input]
[Short plain-language message — NOT "Internal Server Error"]
```

**Global error banner pattern:**
- Slide down from top of screen
- `backgroundColor: "#FEF2F2", borderBottomColor: colors.danger`
- `fontFamily: fonts.bodySemi, fontSize: 14, color: colors.danger`
- Auto-dismiss after 4 seconds or on tap

---

### 2.11 Success State Style

**Pattern:**
- For form completion: green checkmark + brief success text below input
- For post/submit actions: Modal or bottom sheet with green header + confetti-less celebration (no animation library needed — just a checkmark icon + success text)
- Example: Job posted → "✅ Job posted! Workers nearby will be notified." (current Alert behavior is ok, but could be a styled bottom sheet)

---

## 3. Premium Design System Proposal

### 3.1 Color Tokens

```js
// src/theme.js — REVISED
export const colors = {
  // Primary
  primary: "#0F766E",       // Deep teal — buttons, active tabs, key CTAs
  primaryDark: "#0D5F59",   // Pressed/hover
  primaryLight: "#F0FDFA",  // Chip bg, selected rows, tinted surfaces

  // Money (ONLY for ₹ amounts)
  money: "#B45309",

  // Semantic
  success: "#16A34A",
  successLight: "#F0FDF4",
  danger: "#DC2626",
  dangerLight: "#FEF2F2",
  warning: "#D97706",
  warningLight: "#FFFBEB",
  info: "#0EA5E9",
  infoLight: "#F0F9FF",

  // Neutrals
  bg: "#F8F7F4",            // App background — warm off-white
  surface: "#FFFFFF",       // Card / input background
  surface2: "#F3F2EF",      // Secondary surfaces, subtle chips

  // Text
  text: "#111827",          // Heading, important body
  textSecondary: "#374151", // Body text
  textMuted: "#6B7280",     // Hint, caption, placeholder

  // Borders
  border: "#E5E7EB",        // Default card/input border
  borderStrong: "#D1D5DB",  // Focused border alternative

  // Overlays
  overlay: "rgba(0,0,0,0.45)",
  overlayDark: "rgba(0,0,0,0.65)",
};
```

### 3.2 Spacing Scale

```js
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,      // Standard screen horizontal padding
  xl: 24,      // Section gaps, card inner padding (large)
  xxl: 32,
  xxxl: 48,    // NEW — hero sections, onboarding vertical gaps
};
```

### 3.3 Border Radius Scale

```js
export const radius = {
  xs: 4,       // Tags, inline badges
  sm: 8,       // Small chips, pills
  md: 12,      // Inputs, small cards, buttons
  lg: 16,      // Standard cards, worker cards, job cards
  xl: 20,      // Hero cards, modal sheets
  xxl: 24,     // Bottom sheets
  pill: 999,   // Rounded pills (availability badge, etc.)
};
```

### 3.4 Shadow / Elevation Scale

```js
export const shadow = {
  // Android elevation only (iOS uses shadowColor/offset/opacity/radius)
  none: { elevation: 0 },
  xs: { elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 },
  sm: { elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4 },
  md: { elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8 },
  lg: { elevation: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 16 },
};
```

### 3.5 Font Size Scale

```js
export const sizes = {
  h1: 36,       // Hero only
  h2: 28,       // Screen titles
  h3: 22,       // Stat numbers, card section headers
  h4: 18,       // Sub-section headers
  body: 15,     // Primary body text
  small: 13,    // Secondary body, hints
  caption: 12,  // Meta info
  tiny: 11,     // Chips, badges
  micro: 10,    // Uppercase tracking labels only
};
```

### 3.6 Font Tokens (unchanged, just renamed for clarity)

```js
export const fonts = {
  display: "Outfit_800ExtraBold",     // Hero titles, stat numbers only
  displayBold: "Outfit_700Bold",      // Slightly lighter display usage
  body: "Manrope_400Regular",         // Primary body text
  bodyMedium: "Manrope_500Medium",    // Slightly emphasized body
  bodySemi: "Manrope_600SemiBold",    // Card titles, section headers
  bodyBold: "Manrope_700Bold",        // Labels, chips, CTAs, button text
};
```

### 3.7 Button System

```js
// Styles (to replace scattered inline button styles)
PrimaryButton: {
  backgroundColor: colors.primary,
  borderRadius: radius.md,
  paddingVertical: 16,
  paddingHorizontal: 24,
  // Text: fontFamily: fonts.bodyBold, fontSize: 15, color: "#fff"
}

SecondaryButton: {
  backgroundColor: colors.surface,
  borderRadius: radius.md,
  borderWidth: 1.5,
  borderColor: colors.border,
  paddingVertical: 15,
  paddingHorizontal: 24,
  // Text: fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text
}

GhostButton: {
  backgroundColor: "transparent",
  paddingVertical: 12,
  paddingHorizontal: 16,
  // Text: fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primary
}

DestructiveButton: {
  backgroundColor: colors.danger,
  borderRadius: radius.md,
  paddingVertical: 15,
  paddingHorizontal: 24,
  // Text: fontFamily: fonts.bodyBold, fontSize: 15, color: "#fff"
}
```

### 3.8 Card System

```js
BaseCard: {
  backgroundColor: colors.surface,
  borderRadius: radius.lg,       // 16
  borderWidth: 1,
  borderColor: colors.border,
  padding: spacing.lg,           // 16
  ...shadow.xs,
}

HighlightCard: {
  ...BaseCard,
  borderLeftWidth: 3,
  borderLeftColor: colors.primary,
}

GradientCard: {
  // LinearGradient with colors.primary → primaryDark
  borderRadius: radius.xl,       // 20
  padding: spacing.xl,           // 24
  overflow: "hidden",
}

AlertCard: {
  backgroundColor: colors.warningLight,
  borderRadius: radius.md,       // 12
  borderWidth: 1,
  borderColor: "#FDE68A",
  padding: spacing.md + 2,       // ~14
}
```

### 3.9 Component Hierarchy

```
App
├── AppScreen (SafeAreaView wrapper)
│   ├── AppHeader
│   └── [Screen content]
│
├── Navigation
│   ├── BottomNav (Tab.Navigator with custom tabBar)
│   └── Stack.Navigator
│
├── Form Components
│   ├── InputField
│   ├── PhoneInput
│   └── LocationPincodeSelector
│
├── Display Components
│   ├── WorkerCard
│   ├── JobCard
│   ├── ServiceCategoryCard
│   ├── TrustBadge
│   ├── StatusBadge
│   └── RatingTrustRow
│
├── Feedback Components
│   ├── PrimaryButton
│   ├── SecondaryButton
│   ├── EmptyState
│   └── LoadingSkeleton (Phase 5)
│
└── Utility Components
    ├── Overline (exists — keep)
    └── LocationBar (currently inline — extract)
```

---

## 4. Screen-by-Screen Redesign Plan

---

### 4.1 Splash / Loading Screen

**Current problem:** No dedicated splash screen. Font loading shows a raw `ActivityIndicator` on `colors.bg`. No branding.

**New premium layout:**
```
[Full screen: colors.primary gradient — top to bottom, #0F766E → #0D5F59]
[Center: KaamNow logo mark — "K" in white circle, 80×80, borderRadius: 24]
[Below logo: "KaamNow" in Outfit 28px, white]
[Below name: "Bihar ka bharosa" in Manrope 14px, rgba(255,255,255,0.75)]
[Bottom: ActivityIndicator in white, small]
```

**Main CTA:** None (loading state)
**Trust signals:** Logo itself, clean branding
**Implementation notes:** Replace raw `ActivityIndicator` in `App.js` with a `SplashScreen` component. Keep `StatusBar style="light"` during this screen.

---

### 4.2 Landing Screen — Guest State

**Current problems:**
- Footer "Bihar se shuru 🙏" feels like charity/NGO copy
- Stats strip (1K+ Workers / 200+ Villages) with tiny uppercase text in a bordered box feels like a government tally
- The two path cards (Find Workers / Find Work) have equal visual weight — no hierarchy
- Auth CTA buttons at bottom are below the fold and undersized for conversion importance
- Worker preview cards use a mini version of WorkerCard — not the same component

**New premium layout:**

```
[Sticky top: AppHeader — KaamNow logo left, language toggle right]
[LocationBar — pincode selector]

[Hero section — gradient card]
  "Need kaam?" — Outfit 32px, white
  "Find workers near you in 60 seconds" — Manrope 14px, white 80% opacity
  [Green dot pill] "47 workers available nearby"

[Category quick-browse — horizontal scroll]
  Service category chips: Mason | Farm | Elec | Clean | Driver | Home
  Each chip: emoji + label, rounded pill, white bg, teal border

[Primary path: Customer]
  Full-width card with gradient background (lighter teal)
  "Find Workers" — large
  "Hire mason, cook, driver & more" — subtitle
  Arrow →

[Secondary path: Worker]
  Full-width card, white bg, teal border
  "Find Work"
  "Farm, construction, home & more"
  Arrow →

[Trust strip — 3 stats]
  Bold numbers, warm background, no hard borders between items
  Layout: flex row, centered, no dividers (use gap instead)

[Worker previews section]
  "Available near you" header
  3 WorkerCard (unified component)
  "See all workers →" ghost button

[WhatsApp CTA — green card]
  WhatsApp icon + "Book via WhatsApp" + "No app needed"

[Bottom auth strip — sticky or near-bottom]
  Primary: "Join free" (teal fill, full width)
  Secondary: "Already registered? Log in" (ghost text, centered)
```

**Main CTA:** "Join free" (for guest conversion)
**Secondary CTA:** "Find Workers" path card
**Trust signals:** Worker count, completed jobs count, availability pill, WhatsApp option
**Copy improvements:**
- Remove: "Bihar se shuru 🙏" footer
- Change: "1K+ Workers · 200+ Villages · 5K+ Jobs done" → make numbers larger and warmer

---

### 4.3 Landing Screen — Customer State (Home)

**Current problems:**
- Customer greeting uses a 4px accent bar on the left — unusual pattern, not premium
- Stats strip (Open Jobs / Responses / Workers near) is good but the values are too small
- "Post a Job" gradient CTA is duplicate code from Worker home — same component used twice
- Alert banner "X workers interested" is in amber — visually correct but placement mid-scroll

**New premium layout:**

```
[AppHeader: KaamNow logo + notification bell (unread dot if responses pending)]
[LocationBar]

[Customer greeting — clean, no accent bar]
  "Good morning, Ravi 🙏" — Outfit 20px
  "What do you need done today?" — Manrope 13px, muted
  [Profile icon — tappable, top right]

[Alert banner — if responses pending — STICKY below header]
  Amber/green card: "3 workers interested — Review now →"

[Stats row — 3 tappable stat boxes]
  Open Jobs | Responses | Workers Near
  Larger numbers (Outfit 24px), smaller labels (Manrope 10px uppercase)

[Primary CTA — gradient card]
  "Post a Job"
  "60 second mein post karo"
  [Add icon]

[Category browser — horizontal chips]

[Available workers section]
  Section header + 3 WorkerCard items
  "See all →"

[My open jobs — if any]
  Section header
  Mini job cards with response indicator

[Bottom: empty post-job nudge if no activity]
  WorkerCard placeholder with "Post a job to see matching workers"
```

**Main CTA:** "Post a Job" gradient card
**Secondary CTA:** "Find Workers"
**Trust signals:** Worker availability count, response notifications
**Copy improvements:**
- "काम दो" → "Post a Job" (or "Kaam do — 60 second mein")
- "Open Jobs" → "आपके काम" (Your jobs)

---

### 4.4 Landing Screen — Worker State (Home)

**Current problems:**
- Worker greeting shows name correctly but availability toggle is a small iOS-style Switch — hard to tap on low-end Android
- Status card (greeting + toggle) uses inline styles — not a reusable component
- Profile nudge "Complete profile — get 2× more job calls" is in amber at the bottom — should be near the top
- Job preview cards are adequate but the "Jobs matching you" section header has no visual count

**New premium layout:**

```
[AppHeader: KaamNow logo + notification bell]
[LocationBar]

[Worker identity card — premium surface]
  Left: avatar (photo or initials circle) + name + skills summary
  Right: Large availability toggle (bigger button, not Switch)
    "Available" (green) / "Busy" (grey)
    Touch target: min 48×48

[Stats row — 3 stats, tappable]
  Rating ⭐ | Jobs Done | ₹ Per Day
  Same Stats strip pattern as customer

[Profile completion nudge — if incomplete — after stats]
  Amber card: "Profile aur strong banao — 2× zyada calls milenge"
  Progress bar: X% complete
  [Complete Profile] button

[Primary CTA — gradient card]
  "Find Jobs Near You"
  "X jobs available" (real count)
  [Briefcase icon]

[Category chips — horizontal]

[Active jobs section — if any]
  "Chal rahe kaam" header
  Engagement mini-cards with status dot

[Matching jobs preview — if no active]
  "Aapke liye kaam" header
  3 mini JobCard items with rate prominent
  "See all →"

[Empty state — if nothing at all]
  EmptyState component: briefcase icon + "No jobs nearby yet. Browse above."
```

**Main CTA:** "Find Jobs Near You" gradient card
**Secondary CTA:** Availability toggle
**Trust signals:** Rating display, jobs done count, profile completion nudge
**Copy improvements:**
- "Ready for today's work?" → "Aaj ka kaam taiyaar hai?"
- "Available" toggle → make it a full pill button, not a Switch

---

### 4.5 Login / OTP Screen

**Current problems:**
- "Step 1 of 2" and "Step 2 of 2" are bureaucratic
- The OTP input is a single box with letter-spacing 14 — works but not delightful
- No brand illustration connecting to the app's purpose
- "New here? Sign up →" link is too subtle for the conversion it represents

**New premium layout:**

```
[Back button — top left, just an arrow icon, no text]
[Step progress — 2 horizontal bars (current) — good, keep]

[Brand mark — KaamNow "K" badge + app name — centered]

[Step 1: Phone]
  Large title: "Log in" (Outfit 30px)
  Subtitle: "Apna mobile number dalein"
  [PhoneInput component: +91 prefix + 10-digit input]
  Helper: "OTP WhatsApp par aayega"
  [Primary button: "Send Code"]
  Below: "Naya hai? Register karo →" (prominent, not a tiny link)

[Step 2: OTP]
  Large title: "Code dalein" (Outfit 30px)
  Subtitle: "6-digit code bheja: +91 XXXXX-XXXXX"
  [OTP input — 6 individual boxes with bold number display]
    Each box: 48×56px, borderRadius: 12, bordered
    Fill left to right as user types
  Timer: "60 seconds mein code expire ho jaayega"
  Resend: "Code nahin mila? Resend" (ghost, appears after 30s)
  [Primary button: "Verify & Log in"]
  [Ghost: "Wrong number? Change"]
```

**Main CTA:** "Send Code" → "Verify & Log in"
**Secondary CTA:** "Register karo →" (step 1), "Change number" (step 2)
**Trust signals:** WhatsApp OTP (builds trust), phone verification
**Implementation notes:**
- OTP input: use 6 individual `TextInput` boxes in a row, each auto-advancing on type. This is the standard Indian OTP UX (PhonePe, GPay, etc.) and feels much more premium than a single full-width box.
- Remove the "Step X of 2" text label — the progress bars convey this visually.

---

### 4.6 Role Selection Screen

**Current problem:** Role selection is embedded inside `LoginScreen.js` step 3 (signup fallback). It's wedged between OTP verification and account creation as an afterthought. This is the most important decision a new user makes — it deserves its own screen with proper visual weight.

**New premium layout:**

```
[Full screen — not scrollable]
[Top: Back arrow]
[KaamNow logo centered at top]

[Large title: "Aap kaun hain?" — Outfit 32px]
[Subtitle: "Apna kaam chunein" — Manrope 14px, muted]

[Two large role cards — stacked vertically, full width]

  CUSTOMER CARD:
  [Large icon: 🏠 or worker illustration — 64px]
  "Kaam Dene Wale" — Outfit 22px
  "Mujhe karigar chahiye" — Manrope 14px, muted
  [List of service categories as tiny chips: Mason · Cook · Driver · More]
  [Primary button: "Customer ke roop mein join karo"]

  [Separator: "ya / or"]

  WORKER CARD:
  [Large icon: 💼 or person working — 64px]
  "Kaam Karne Wale"  — Outfit 22px
  "Mujhe kaam chahiye" — Manrope 14px, muted
  [Average earnings: "₹400–800/day kamate hain workers" in amber]
  [Primary button: "Worker ke roop mein join karo"]
```

**Main CTA:** Two equal primary buttons — one per role
**Trust signals:** Earnings display for workers (social proof)
**Implementation notes:** Create as a dedicated `RoleSelectionScreen`. Navigate from PhoneSignupScreen after OTP verification, before role-specific onboarding.

---

### 4.7 Worker Onboarding Screen

**Current problems:**
- "Worker Onboarding · 1 of 3" tag is form/government-like
- Step 0: just "Your Name" then two `Input` components stacked — no motivation
- Step 1: 6 address fields visible at once — overwhelming
- Step 2: Flat skill chips with no visual category grouping except the small uppercase label
- No visual reward or sense of progress as user completes steps
- No explanation of why each piece of information is needed

**New premium layout:**

**Step 1 of 3 — "Who are you?"**
```
[Progress: 1 of 3 bars filled]
[Category emoji or illustration — relevant to work: 🔨]
[Large title: "Apna naam aur rate batao" — Outfit 28px]
[Subtitle: "Customers yahi dekhenge — imandar raho" — Manrope 14px]

[Name input — with label "Poora naam"]
[Daily rate input — with label "Roz ki kamai (₹)"]
  Below: "Market rate: ₹350–700/day" (teal helper text)
  Rate insight (existing logic — keep, just style better)

[Continue button — full width primary]
```

**Step 2 of 3 — "Aap kahan hain?"**
```
[Progress: 2 of 3 bars filled]
[Icon: 📍]
[Large title: "Apna ghar batao" — Outfit 28px]
[Subtitle: "Pincode dalein — baaki sab automatic fill ho jaayega"]

[Pincode input — prominent, with live lookup animation]
  [Success: green checkmark + "Patna, Bihar" preview]

[Village / Town input — simple, required]
[District + State — auto-filled, greyed, editable]
  (Post office + Block — hide behind "Add more details" link — not required)

[Continue button]
```

**Step 3 of 3 — "Aap kya kar sakte hain?"**
```
[Progress: 3 of 3 bars filled]
[Icon: 🛠️]
[Large title: "Apni skills chunein" — Outfit 28px]
[Subtitle: "Jitni skills — utni zyada calls"]

[Skill categories — visual grid]
  Each category: full-width section header (e.g. "🏗️ Construction")
  Skills below as wrap chips — teal fill when selected
  Selected count: "3 skills chosen" (live counter)

[Finish & See Jobs button — primary]
  Or loading state: "Saving..."
```

**Post-onboarding success moment:**
```
[Full screen success state — briefly before navigating to Worker Home]
[Green checkmark circle — animated scale in]
[Title: "Welcome, Ramesh! 🎉"]
[Subtitle: "Aapki profile ready hai. Ab kaam dhoondhein!"]
[Button: "Jobs Dekhein →"]
```

**Main CTA per step:** "Continue" → "Continue" → "Finish & See Jobs"
**Trust signals:** Market rate display (builds confidence), skill count (motivates completion)

---

### 4.8 Customer Onboarding Screen

**Current problem:** Not fully audited but likely similar form-based pattern. Currently shows a native header "Your Location" — very plain.

**New premium layout:**

```
[No native header — custom back]
[Logo + progress indicator]

[Title: "Aap kahan hain?" — Outfit 28px]
[Subtitle: "Kaam post karne ke liye location zaroori hai" — Manrope 14px]

[Pincode input — large, prominent]
  Live lookup → success state shows district + state

[Village / Area input]

[Continue button → Customer Home]
```

**Main CTA:** "Continue"
**Trust signals:** Location used to show nearby workers — explain this benefit inline

---

### 4.9 Marketplace / Find Workers Screen

**Current problems:**
- "FIND WORKERS" uppercase tracking label feels bureaucratic
- "Workers near you" title is flat — no warmth
- Filter panel is a generic expandable box — cold interaction
- `WorkerCard` component shows chevron-forward icon at the right — small affordance
- Empty state is bare (emoji + 2 lines)

**New premium layout:**

```
[Header — white, no shadow, clean]
  [Row 1: "Find Workers" title (Outfit 22px) + filter icon button]
  [Row 2: Search input — full width, teal focus border]
  [Row 3: Category chips — horizontal scroll]
    All · Mason · Farm · Elec · Clean · Driver · Home
  [Row 4: Result count + availability toggle]
    "24 workers found" | [Available now ✓] toggle

[FlatList — WorkerCard items]
  Workers sorted: Available first, then by distance (if location set), then by rating
  Each card uses unified WorkerCard component

[Empty state — EmptyState component]
  Icon: person-search outline, 64px teal
  Title: "Koi worker nahin mila"
  Subtitle: "Filter change karo ya pincode check karo"
  Button: "Filters clear karo"
```

**Main CTA:** None (browse screen) — main action is tapping a WorkerCard
**Secondary CTA:** Search input, filter chip
**Trust signals:** Availability dot on each card, trust tier badge, rating + jobs done
**Implementation notes:**
- Move "FIND WORKERS" uppercase label → drop it; use just the title
- Keep skill chips but make them taller (paddingVertical: 10 → 12) for better tap target
- Add "Available now" quick toggle as a pill button next to result count

---

### 4.10 Worker Profile Screen

**Current problems:** Best-designed screen but needs minor polish:
- Avatar is 100×100 — slightly small for a hero moment
- The booking section title "Book Ramesh" is good but the card feels plain
- Missing: previous work photos row, "Responds quickly" / "Last active" signal
- Trust tier badge is inside a pill in the hero — not prominent enough for the Verified tier

**New premium layout:**

```
[Back arrow — top left, no native header]

[Hero gradient card — extended height]
  [Availability badge — top left of card: "● Available" green pill]
  [Avatar — 120×120, borderRadius: 20, white ring 4px]
  [Name — Outfit 28px, white, centered]
  [Rating row: ⭐ 4.8 · 23 jobs — white]
  [Trust tier — prominent: "✅ Verified Worker" — green pill with border]
  [Pills row: location · ₹X/day]

[Stats card — 3 columns]
  Jobs Done | Rating | Per Day

[Skills section]
  "Skills" header
  Skill chips — teal tinted

[About section — if bio exists]
  "About Ramesh" header
  Bio text

[Trust signals section — NEW]
  Row: ✅ Verified · 📞 Phone verified · 📍 Address verified
  Row: ⏱️ "Usually responds in 2 hours" (if data available)

[Booking section — card with teal top border]
  "Ramesh ko kaam do" — title
  [Guest]: Login to book
  [Worker]: Cannot book
  [Customer — no open jobs]: "Pehle kaam post karo" button
  [Customer — has jobs]: Job picker + "Booking bhejo" primary button
```

**Main CTA:** "Send Booking Request"
**Secondary CTA:** "Post a Job First" (if no jobs)
**Trust signals:** Verified badge, response time, address verified, phone verified

---

### 4.11 Post Job Screen (4-step Wizard)

**Current problems:**
- Step 4 review shows "Auto-generated description" — sounds developer-y
- Category grid cards (Step 1) use passive colors (`#FEF3C7`, `#D1FAE5` etc.) — nice, but active state only shows a teal border — could be more decisive
- Step 3 uses a raw `TextInput` for date in `YYYY-MM-DD` format — bad UX for non-tech users
- "Workers needed" counter is good — keep as is
- The footer nav (Back + Continue) is clear — keep

**New premium layout:**

**Step 1 — Category:**
```
[Progress bars: 1/4 active]
[Title: "Kya kaam chahiye?" — Outfit 26px]
[Subtitle: "Category chunein" — Manrope 14px]
[Category grid: 2 columns, each with colored background + emoji + label]
  Active state: teal border 2px + faint teal overlay + checkmark top-right
  Auto-advance to step 2 on selection (existing — good, keep)
```

**Step 2 — Skill:**
```
[Category breadcrumb pill at top: "🏗️ Construction"]
[Title: "Kaunsi skill chahiye?" — Outfit 26px]
[Skill chips — wrap grid]
[Separator: "Ya apni zaroorat likho:"]
[Custom skill input]
```

**Step 3 — Details:**
```
[Category + skill breadcrumb]
[Title: "Kaam ki jankari" — Outfit 26px]

[Workers needed — counter widget: keep]
[Daily rate — input with market rate helper + insight box: keep]
[Work date — IMPROVEMENT: replace raw TextInput with a simple date picker]
  OR: preset date chips: "Kal" (tomorrow) | "Is hafte" | "Date chunein"
  If "Date chunein": show a date picker sheet
[Pincode — large input with live lookup: keep]
```

**Step 4 — Review:**
```
[Title: "Janchein aur Post karein" — Outfit 26px]
[Job preview card — premium card with teal top accent]
  Emoji + skill + category
  Rate | Workers | Date | Location
[Note: Remove "Auto-generated description" label → call it "Job description"]
[Post Job button — full width, prominent]
```

**Main CTA per step:** "Continue" → "Continue" → "Continue" → "Post Job"
**Trust signals:** Market rate insight, worker notification confirmation on step 4
**Copy improvements:**
- "Auto-generated description" → "Job description" or remove label entirely

---

### 4.12 Dashboard Screen (My Work)

**Current problems:**
- 4 tabs per role = 8 total states = too complex to navigate
- Worker stats strip (Active/Pending/Completed/Cancelled) above tabs AND tabs below — redundant
- `DashboardScreen.js` is 987 lines — needs decomposition
- "Tap for details →" hint on job cards is awkward
- Detail modal is a bottom sheet — good pattern, but content inside uses raw ScrollView with no handle indicator

**New premium layout — Customer:**
```
[Hero gradient card]
  Name greeting + Open jobs count + Workers near count
  [Post Job quick CTA in hero: small button]

[Quick action pills: "Post Job" | "Find Workers" | "My Jobs"]
  These replace the tab system for primary navigation

[Pending responses card — if responses exist]
  Amber alert: "3 workers interested in your job"
  [Review Now] primary button

[Active bookings — if any]
  Section: "Chal raha kaam"
  CustomerActiveCard per item
  Each shows: Worker name + date + rate + Call button

[Open jobs — cards]
  Each job card shows: title + date + location + responses count
  If responses > 0: teal "X interested — Review" CTA
  If no responses: grey "Find Workers" ghost

[Support link at bottom]
```

**New premium layout — Worker:**
```
[Hero gradient card]
  Name + availability toggle (large pill — not Switch)
  Active jobs count + Nearby jobs count

[My jobs section]
  Active (accepted) jobs → WorkerActiveCard
  Pending (applied) jobs → WorkerPendingCard

[Find more jobs CTA]
  Gradient card: "X jobs near you — Browse now"

[Earnings summary]
  Total earned | Jobs done | Avg rating
  (Moved from Completed tab to always-visible)

[History — ghost button to full history view]
```

**Main CTA:** "Review Responses" (customer) | "Browse Jobs" (worker)
**Trust signals:** Active job status, rating display, earnings history
**Implementation notes:**
- Replace 4-tab system with a simpler 2-section layout (Active + History)
- Extract `CustomerActiveCard`, `WorkerActiveCard`, `WorkerPendingCard` to separate component files
- Decompose `DashboardScreen.js` into `WorkerDashboard.js` + `CustomerDashboard.js`

---

### 4.13 Worker Job Feed Screen

**Current problems:**
- Header area has 5 rows before any content — too dense
- "JOB FEED" uppercase label is bureaucratic
- The "I'm interested" CTA button text ("मुझे interest है") feels awkward in hybrid language
- No visual distinction between jobs the worker is qualified for vs general jobs (though `matched_skills` exists)
- Urgency badges (🔥 Urgent, ⚡ Now) are present — good, but styling is minimal

**New premium layout:**

```
[Header — compact]
  [Row 1: "Jobs Near You" title + location pin showing current pincode]
  [Row 2: Pincode search bar + Send button (keep)]
  [Row 3: Category chips (keep, but make taller)]
  REMOVE separate filter toggle row — fold into an icon button on row 1

[Job count: "18 kaam mile · 841001" — keep, below header]

[FlatList of JobCard items]
```

**Redesigned JobCard:**
```
[Card — borderRadius: 16, padding: 16]
  [Top row: Category badge (emoji in teal circle) + Title + Urgency badge (right)]
  [Location line: 📍 Village · Pincode]
  
  [Key info row — horizontal]
    ₹X/day (amber, Outfit 18px) | X workers | Date | Posted X days ago
  
  [Matched skills row — if any]
    "✓ mason  ✓ painter" — green chips (keep existing)
  
  [Customer name: "👤 Rahul Kumar"]
  
  [CTA area at bottom]
    Not applied: "Apply karo" — full-width primary button
    Pending: "⏳ Review ho raha hai" + [Withdraw] secondary
    Hired: "🎉 Hire ho gaye! Call karo" + [Call] green button
```

**Main CTA:** "Apply karo" (per job card)
**Trust signals:** Customer name, job date, posted time, matched skill chips

---

### 4.14 Worker My Profile Screen (Edit Profile)

**Assumed current problems** (based on pattern in codebase):
- Form-based layout — plain
- No photo preview
- No gamification of profile completion

**New premium layout:**

```
[Header: "Meri Profile" + [Save] button top right]

[Profile hero — editable]
  [Photo upload circle — 96×96 with edit icon overlay]
  [Name — large, tap to edit inline]
  [Rating display: ⭐ X.X · X jobs]

[Profile completion bar]
  XX% complete
  Checklist: Photo ✓ | Bio ✓ | Skills ✓ | Address ✓

[Availability toggle — large pill: Available / Busy]

[Daily rate — inline edit field]

[Skills section — chip selection grid]

[About/Bio — multiline text area]

[Address — pincode + village display, tap to edit]

[Account section]
  Phone: XXXXX-XXXXX (verified ✓)
  [Contact Support] ghost link
  [Log Out] destructive ghost
```

**Main CTA:** Save (top right, or auto-save)
**Trust signals:** Verification badges, profile completion percentage

---

### 4.15 Customer Profile Screen

**New premium layout:**

```
[Header: "Meri Profile" + [Edit] button]

[Avatar circle — initials or photo]
[Name + phone]
[Location: pincode + district]

[Stats: Jobs Posted | Workers Hired | Reviews Given]

[Active address card]

[Notification preferences toggle]

[Contact Support]
[Log Out — destructive]
```

---

### 4.16 Notifications Screen (NEW — to be created)

**Current problem:** No notification screen exists. Engagement responses are surfaced as banners on Landing and Dashboard but there is no dedicated notification center.

**New premium layout:**

```
[Header: "Notifications" + "Mark all read" ghost]

[Notification list — FlatList]
  Each item:
    [Dot indicator — unread: teal | read: transparent]
    [Icon: person for worker-related, briefcase for job-related]
    [Title — bold if unread]
    [Subtitle — body copy]
    [Time — relative: "2 hours ago"]
  
  Grouped: "Today" | "This week" | "Earlier"

[Empty state]
  Bell icon
  "Koi notification nahin"
  "Kaam post karo ya apply karo — updates yahan aayenge"
```

---

### 4.17 Settings / Help Screen

**Effectively the ContactSupportScreen + a few settings:**

```
[Header: "Settings & Help"]

[Account section]
  Language: Hindi | English (toggle)
  Phone: XXXXX-XXXXX

[Support section]
  Contact Support → (link to ContactSupportScreen)
  FAQ (if built)
  WhatsApp Support: wa.me/...

[About section]
  App version
  Privacy Policy
  Terms

[Danger zone]
  Log Out — destructive
  Delete Account — destructive, requires confirmation
```

---

## 5. Component System Plan

### 5.1 AppScreen

**Purpose:** Standard screen wrapper replacing boilerplate `SafeAreaView` + `backgroundColor` setup.

**Props:**
```
edges?: ("top" | "bottom" | "left" | "right")[]  // default: ["top"]
backgroundColor?: string                           // default: colors.bg
style?: ViewStyle
children: ReactNode
```

**Visual style:** Just a `SafeAreaView` with `colors.bg` background. No UI of its own.

**Where used:** Every screen as the outermost wrapper.

---

### 5.2 AppHeader

**Purpose:** Consistent top bar for screens that need branding (home screens). Replaces the inline `Header` component currently defined inside `LandingScreen.js`.

**Props:**
```
showLogo?: boolean        // default: true
showLangToggle?: boolean  // default: true
showNotifBell?: boolean   // default: false
notifCount?: number       // unread count
onNotifPress?: () => void
rightElement?: ReactNode  // custom right side
```

**Visual style:**
```
flexDirection: "row", justifyContent: "space-between", alignItems: "center"
paddingHorizontal: spacing.lg, paddingTop: 10, paddingBottom: 8

Left: KaamNow "K" badge (36×36, borderRadius: 10, teal) + "KaamNow" text
Right: Language toggle pill (EN/हिं) + optional notification bell
```

**Where used:** LandingScreen (all 3 states), MarketplaceScreen, WorkerJobFeedScreen.

---

### 5.3 PrimaryButton

**Purpose:** The main call-to-action button. One per screen.

**Props:**
```
title: string
onPress: () => void
loading?: boolean       // default: false
disabled?: boolean      // default: false
icon?: ReactNode        // left icon
fullWidth?: boolean     // default: true
style?: ViewStyle
```

**Visual style:**
```
backgroundColor: colors.primary
borderRadius: radius.md      // 12
paddingVertical: 16
paddingHorizontal: 24
fontFamily: fonts.bodyBold, fontSize: 15, color: "#fff"
disabled: opacity 0.4
loading: ActivityIndicator (white)
pressed: opacity 0.88
```

**Where used:** Login screens, Onboarding screens, PostJobScreen, WorkerProfileScreen booking section.

---

### 5.4 SecondaryButton

**Purpose:** Secondary action, visually subordinate to primary.

**Props:** Same as PrimaryButton.

**Visual style:**
```
backgroundColor: colors.surface
borderRadius: radius.md
borderWidth: 1.5
borderColor: colors.border
paddingVertical: 15
fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text
```

**Where used:** "Back" button in wizards, "Cancel" / "Withdraw" actions.

---

### 5.5 InputField

**Purpose:** Universal text input replacing scattered inline input styles.

**Props:**
```
label?: string
placeholder?: string
value: string
onChangeText: (text: string) => void
keyboardType?: KeyboardType
maxLength?: number
autoFocus?: boolean
helperText?: string
errorText?: string
successText?: string
leftIcon?: ReactNode
rightElement?: ReactNode
style?: ViewStyle
```

**Visual style:**
```
label: fontFamily: fonts.bodyBold, fontSize: 12, color: colors.textSecondary, marginBottom: 6
container: backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1.5
  default: borderColor: colors.border
  focused: borderColor: colors.primary
  success: borderColor: colors.success
  error: borderColor: colors.danger
paddingVertical: 14, paddingHorizontal: 16
fontFamily: fonts.body, fontSize: 15, color: colors.text
helperText: fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: 4
errorText: fontFamily: fonts.body, fontSize: 12, color: colors.danger, marginTop: 4
```

**Where used:** Every form in the app (replaces all inline input styles).

---

### 5.6 PhoneInput

**Purpose:** Phone number input with +91 prefix, specific to India.

**Props:**
```
value: string
onChangeText: (text: string) => void
autoFocus?: boolean
style?: ViewStyle
```

**Visual style:**
```
flexDirection: "row"
Left: "+91" prefix box — backgroundColor: colors.primaryLight, borderColor: colors.primary, borderTopLeftRadius: radius.md, borderBottomLeftRadius: radius.md
Right: TextInput — backgroundColor: colors.surface, borderColor: colors.primary, borderTopRightRadius: radius.md, borderBottomRightRadius: radius.md
Input: keyboardType: "number-pad", maxLength: 10, fontSize: 18, letterSpacing: 2
```

**Where used:** LoginScreen, PhoneSignupScreen.

---

### 5.7 TrustBadge

**Purpose:** Display worker trust tier and verifications.

**Props:**
```
tier: 1 | 2 | 3 | 4
verifications?: ("phone" | "address" | "id" | "background")[]
size?: "small" | "medium"  // default: "medium"
```

**Visual style:**
```
Tier 2 Verified: green pill with ✅ icon
Tier 3 Pro: blue pill with 🔵 icon
Tier 4 Elite: amber pill with 🏆 icon
Verification row: small icon chips for each verification type
```

**Where used:** WorkerCard, WorkerProfileScreen hero.

---

### 5.8 WorkerCard

**Purpose:** Display a worker in a list (already exists — needs upgrade).

**Current issues:** Avatar too small (72px), chevron affordance too subtle, tier badge too small.

**New props (extends existing):**
```
worker: WorkerData
onPress: () => void
size?: "compact" | "full"  // compact for landing preview, full for marketplace
showTrustBadge?: boolean   // default: true
```

**New visual style:**
```
card: borderRadius: radius.lg (16), padding: spacing.lg (16), borderColor: colors.border, ...shadow.xs
photoWrap: position relative
photo: 80×80 (up from 72), borderRadius: radius.md (12)
photoFallback: teal-tinted with initials (Outfit 28px, teal)
availDot: 12×12 (up from 11), bottom: 2, right: 2

nameRow: space-between
name: fontFamily: fonts.bodySemi, fontSize: 15
rate: fontFamily: fonts.display, fontSize: 17, color: colors.money

skills: fontFamily: fonts.body, fontSize: 12, color: colors.textMuted

footer:
  ratingRow: star icon + "4.8" + "· 23 jobs"
  tierBadge: prominent (current is too small)
  locRow: pin icon + village

No chevron-forward — the whole card is tappable (Android ripple feedback)
```

**Where used:** MarketplaceScreen, LandingScreen (worker preview), WorkerJobFeedScreen (matched workers).

---

### 5.9 JobCard

**Purpose:** Display a job listing in the worker job feed. Currently inline in `WorkerJobFeedScreen.js` — needs extraction.

**Props:**
```
job: JobData
engagement?: EngagementData | null
onInterest: () => void
onWithdraw: () => void
lang: "en" | "hi"
```

**Visual style:** (See Section 4.13 for layout detail)

**Where used:** WorkerJobFeedScreen, LandingScreen (preview), Dashboard (mini version).

---

### 5.10 ServiceCategoryCard

**Purpose:** A tappable category tile (used in PostJobScreen step 1, category browsing).

**Props:**
```
category: { icon: string, label: string, value: string, color: string }
selected?: boolean
onPress: () => void
size?: "grid" | "chip"  // grid: 2-col card, chip: horizontal pill
```

**Visual style:**
```
grid: borderRadius: radius.md, padding: 16, backgroundColor: category.color
  icon: fontSize: 32, marginBottom: 8
  label: fontFamily: fonts.bodySemi, fontSize: 13
  selected: borderWidth: 2, borderColor: colors.primary + checkmark top-right

chip: borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 10
  emoji: fontSize: 16 + label: fontFamily: fonts.bodyBold, fontSize: 11
```

**Where used:** PostJobScreen step 1, LandingScreen category chips, MarketplaceScreen filter chips.

---

### 5.11 EmptyState

**Purpose:** Consistent empty states across the app.

**Props:**
```
icon: string           // Ionicons name
title: string
subtitle?: string
actionLabel?: string
onAction?: () => void
```

**Visual style:**
```
Container: alignItems: "center", paddingVertical: 48, paddingHorizontal: 32
icon: Ionicons size 64, color: colors.primary
title: fontFamily: fonts.display, fontSize: 20, color: colors.text, marginTop: 16, textAlign: "center"
subtitle: fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, marginTop: 8, textAlign: "center", lineHeight: 20
button: PrimaryButton, marginTop: 24
```

**Where used:** MarketplaceScreen, WorkerJobFeedScreen, DashboardScreen all tabs, FindWorkScreen.

---

### 5.12 StatusBadge

**Purpose:** Pill badge for engagement/job statuses. Currently defined inline in multiple screens.

**Props:**
```
status: "open" | "requested" | "accepted" | "completed" | "rejected" | "cancelled" | "booked"
size?: "small" | "medium"  // default: "medium"
```

**Status → style map:**
```
open:      { bg: colors.primaryLight, text: colors.primary,  label: "Open" }
requested: { bg: colors.warningLight, text: colors.warning,  label: "Pending" }
accepted:  { bg: colors.successLight, text: colors.success,  label: "Hired ✓" }
completed: { bg: "#DBEAFE",           text: "#1E40AF",       label: "Done" }
rejected:  { bg: colors.dangerLight,  text: colors.danger,   label: "Rejected" }
cancelled: { bg: colors.surface2,     text: colors.textMuted,label: "Cancelled" }
booked:    { bg: colors.successLight, text: colors.success,  label: "Filled" }
```

**Where used:** DashboardScreen (all tabs), WorkerJobFeedScreen, WorkerCard, JobCard.

---

### 5.13 BottomNav

**Purpose:** The tab bar. Currently defined inline in `App.js`.

**Design changes:**
```
height: 64 (keep)
paddingBottom: 8 (keep — safe area)
paddingTop: 6 (keep)
backgroundColor: colors.surface
borderTopWidth: 1, borderTopColor: colors.border

Active icon: filled variant (not outline) — currently both use same icon name
Active tint: colors.primary
Inactive tint: colors.textMuted
Label: fontFamily: fonts.bodyBold, fontSize: 11 (keep)

Tab count per role:
  Guest: Home | Workers | Work | Account — 4 tabs (current — ok)
  Customer: Home | Workers | Post Job | Dashboard — 4 tabs (keep)
  Worker: Home | Jobs | Schedule | Profile — 4 tabs (keep)
```

**Icon improvement: use filled icons for active state:**
```
Home: "home-outline" → "home" when active
Workers/Search: "search-outline" → "search" when active
Jobs/Briefcase: "briefcase-outline" → "briefcase" when active
Calendar: "calendar-outline" → "calendar" when active
Profile: "person-circle-outline" → "person-circle" when active
Dashboard: "apps-outline" → "apps" when active
```

**Where used:** `App.js` Tab.Navigator — customize `tabBarStyle`.

---

### 5.14 LocationPincodeSelector

**Purpose:** The bottom sheet location picker (modal). Currently inline in `LandingScreen.js`. Extract as reusable component.

**Props:**
```
visible: boolean
onClose: () => void
onConfirm: (data: { pincode: string, district: string | null, state: string | null }) => void
initialPincode?: string
lang: "en" | "hi"
```

**Visual style:** (Current design is already decent — minor polish)
```
Bottom sheet: borderTopLeftRadius: radius.xxl (24), padding: spacing.xl
Handle: width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border
Title: fontFamily: fonts.display, fontSize: 22
Input: full-width, teal border, location icon left
Success preview: green mini card with district + state
Buttons: [Clear filter (if existing)] + [Search here] primary
```

**Where used:** LandingScreen, MarketplaceScreen, WorkerJobFeedScreen.

---

### 5.15 RatingTrustRow

**Purpose:** Display a worker's rating + trust tier in a single compact row. Used in multiple places.

**Props:**
```
rating: number         // 0.0–5.0
totalJobs: number
tier?: 1 | 2 | 3 | 4
size?: "small" | "medium"
```

**Visual style:**
```
flexDirection: "row", alignItems: "center", gap: 6
⭐ icon (amber) + "4.8" (bodyBold 13) + "· 23 jobs" (body 12, muted) + TrustBadge (if tier >= 2)
```

**Where used:** WorkerCard, WorkerProfileScreen hero, WorkerPreviewCard on Landing.

---

## 6. Customer Flow UX Improvements

### 6.1 How Customer Finds Workers

**Current flow:**
1. Landing → tap "Find Workers" path card → MarketplaceScreen
2. Or: tap category chip → MarketplaceScreen
3. Or: tap a worker from the "Available near you" preview → WorkerProfileScreen directly

**Problem:** Too many ways, no clear journey for a first-time customer.

**Improved flow:**
1. Landing (customer home) → **prominent "Find Workers" section** with "See all →"
2. If location set: show workers sorted by proximity, availability first
3. MarketplaceScreen: category filter is primary, search is secondary (not equal weight)
4. WorkerCard → WorkerProfileScreen: clear booking flow
5. On WorkerProfileScreen: if customer has no open jobs, offer "Post a Job" before showing booking widget — this guides the correct workflow

**Trust improvements:**
- Surface TrustBadge more prominently on MarketplaceScreen (show "Verified" badge on card list, not just inside the profile)
- Add a "Top rated this week" section to MarketplaceScreen (a horizontal pre-filtered strip)

### 6.2 How Customer Posts a Job

**Current flow:** PostJobScreen (4 steps) — generally correct.

**Improvements:**
- Step 3 date: add "Kal (Tomorrow)" quick chip before manual date entry — removes the YYYY-MM-DD friction
- Step 4 review: make it feel like a real job listing, not a form review. Style it as what a worker would see.
- After posting: navigate to WorkerJobFeedScreen with "Find workers for this job" CTA — not just navigate to marketplace

### 6.3 How Customer Trusts a Worker

**Current gaps:**
- Tier badges are present but unexplained
- No review/rating history visible on WorkerProfileScreen (only avg rating number)
- No video or work photo gallery

**Improvements:**
- Add a "Reviews" section to WorkerProfileScreen: list past reviews with star rating + comment snippet
- Expand trust signals: ✅ Phone verified · ✅ Address confirmed · ✅ X jobs completed
- Add "Trust Score" explanation in an info tooltip (i button) next to the badge

### 6.4 How Customer Contacts/Books Worker

**Current flow:** Select open job from list → "Send booking request" button.

**Improvements:**
- After booking sent: show a confirmation card with "Worker will respond in X hours" expectation
- Show worker's phone number on the WorkerProfileScreen (with masking/reveal after booking for non-verified users)

### 6.5 How Customer Sees Status

**Current flow:** DashboardScreen → Responses tab (for pending), Overview tab (for active).

**Improvements:**
- Consolidate to 2-section layout: Active (ongoing) + Open (posted, awaiting response)
- Notification bell on AppHeader shows unread response count
- Amber alert banner on Customer Home if responses pending (already exists — improve prominence)

---

## 7. Worker Flow UX Improvements

### 7.1 How Worker Sees Nearby Jobs

**Current flow:** WorkerJobFeedScreen — pincode search + category chips.

**Improvements:**
- Auto-load from worker's pincode on mount (already implemented — good)
- Add distance indicator to each job card if location data available
- "🔥 Urgent" badge already exists — surface urgent jobs at the top of the feed
- Add a "Refresh" floating button when scroll reaches top (pull-to-refresh exists but add explicit button)

### 7.2 How Worker Applies

**Current flow:** "I'm interested" button on JobCard → `POST /jobs/{id}/interest`.

**Improvements:**
- Change CTA: "I'm interested" → "Apply karo" (clearer, active voice)
- After applying: instant feedback — the card updates to "Pending review" state (already works — but animate the state change)
- Show remaining slots: "2 of 3 workers needed" so worker knows competition level

### 7.3 How Worker Updates Availability

**Current flow:** Toggle on LandingScreen (Worker state) — a small iOS Switch.

**Improvements:**
- Replace Switch with a large tappable pill button: "● Available" (green) / "○ Busy" (grey)
- Touch target: min 120px wide, 44px tall
- Provide positive reinforcement: when turning Available on, show "Workers who are available get 3× more responses"

### 7.4 How Worker Builds Trust

**Current gaps:**
- Profile photo upload exists in WorkerMyProfileScreen (assumed)
- Bio field exists but optional
- Skill selection on onboarding exists
- Trust tier is backend-assigned

**Improvements:**
- WorkerMyProfileScreen: show profile completion percentage prominently
- Nudge to add: photo, bio, complete address — with specific benefit copy per item
  - Photo: "Photo wale workers ko 2× zyada responses milte hain"
  - Bio: "Apne baare mein likho — customers trust karte hain"
- Show review count and avg rating on profile edit screen

### 7.5 How Worker Sees Status/Payment/Job History

**Current flow:** DashboardScreen → Active / Pending / Completed / Cancelled tabs.

**Improvements:**
- Completed tab already shows earnings summary — keep and make it more prominent
- Add a "Total earnings this month" card at the top of Completed section
- Payment/payout info: explain that payments are direct (no platform commission) in the UI — this is a key differentiator

---

## 8. Copywriting Improvements

### 8.1 Overall Principles

- Use **Hinglish** (Hindi words in Roman script) for CTAs — feels natural to Bihar/UP users
- Use **pure Hindi** (Devanagari) when already showing Hindi-mode text
- Use **plain English** for technical terms (OTP, PIN, Profile)
- Avoid: "Submit", "Beneficiary", "Register", "Proceed", "Click here"
- Use: "Continue", "Done", "Join", "Find", "Post", "Apply"

### 8.2 CTA Replacements

| Current | Improved |
|---------|----------|
| "Submit Details" | "Continue" |
| "Verify करो" | "OTP confirm karo" |
| "OTP भेजो" | "Code bhejo" |
| "Register करो" | "Account banao" |
| "Search Labour" | "Workers dhoondhein" |
| "Beneficiary Registration" | "Worker profile banao" |
| "Job Post करो" | "Post karo" |
| "मुझे interest है" | "Apply karo" |
| "Booking भेजो" | "Book karo" |
| "Mark Job Done" | "Kaam complete karo" |
| "Find Workers" | "Karigar dhoondhein" |
| "Find Work" | "Kaam dhoondhein" |
| "My Work" (tab) | "Mera Kaam" |

### 8.3 Screen Title Replacements

| Current | Improved |
|---------|----------|
| "Worker Onboarding · 1 of 3" | "Step 1 of 3 — Apni jankari" |
| "Your Location" (nav header) | "Aap kahan hain?" (inline title) |
| "Job Feed" (nav header) | "Jobs Near You" (inline title) |
| "Find Work" (nav header) | "Kaam dhoondhein" (inline title) |
| "My Profile" (nav header) | "Meri Profile" (inline title) |
| "Help & Support" | "Help chahiye?" |

### 8.4 Empty State Copy

| Screen | Current | Improved |
|--------|---------|----------|
| Marketplace | "No workers found" | "Koi worker nahin mila — filter change karo" |
| Job Feed | "No jobs found" | "Is area mein koi kaam nahin — pincode change karo" |
| Dashboard (customer, no jobs) | "Post your first job" | "Aaj apna pehla kaam post karo" |
| Dashboard (worker, no active) | "No active jobs." | "Abhi koi active kaam nahin" |
| Notifications | — | "Koi notification nahin — kaam post karo ya apply karo" |

### 8.5 Trust/Motivational Copy

| Placement | Current | Improved |
|-----------|---------|----------|
| Worker onboarding step 0 | "Tell us your full name so customers can trust you." | "Poora naam likho — customers trust karte hain" |
| Worker onboarding rate | "This is what customers will see as your expected pay." | "Yeh customers dekhenge — honest rahein" |
| Profile nudge on home | "Complete profile — get 2× more job calls" | "Profile puri karo — 2× zyada calls milenge" |
| Marketplace availability toggle | "Available now" chip | "Abhi available" |
| Worker hire confirmed | "You're hired!" | "🎉 Aap hire ho gaye!" |

### 8.6 Platform Differentiator Copy

Add to Landing screen and Worker Onboarding success:
- "KaamNow — Bihar ka sab se bharosemand kaam ka manch"
- "Seedha sambandh. Koi beechan wala nahin. Koi commission nahin."
- "₹0 commission — jo kamate ho, poora tumhara"

---

## 9. Implementation Phases

### Phase 1 — Theme, Tokens, Design System Foundation
**Files:** `src/theme.js`, new `src/components/` files  
**Duration:** 3–5 days

Tasks:
- [ ] Clean up `theme.js`: rename `saffron` → `primary`, `indigo` → remove alias, add `shadow` tokens, add `micro` size, add semantic colors
- [ ] Create `PrimaryButton.js` (replaces scattered inline CTAs)
- [ ] Create `SecondaryButton.js`
- [ ] Create `InputField.js` (unified input)
- [ ] Create `PhoneInput.js`
- [ ] Create `EmptyState.js`
- [ ] Create `StatusBadge.js`
- [ ] Update existing `Button.js` to use new radius/padding tokens
- [ ] Update existing `TrustBadge.js` to new design
- [ ] Create `AppScreen.js` wrapper component
- [ ] Create `AppHeader.js` component (extracted from LandingScreen)

**Risk:** None — these are additive. No screens change in Phase 1.

---

### Phase 2 — Login, Signup, Onboarding
**Files:** `LoginScreen.js`, `PhoneSignupScreen.js`, `WorkerOnboardingScreen.js`, `CustomerOnboardingScreen.js`  
**New files:** `RoleSelectionScreen.js`  
**Duration:** 4–6 days

Tasks:
- [ ] Redesign `LoginScreen.js` — 6-box OTP input, remove bureaucratic "Step X of Y" text
- [ ] Redesign `PhoneSignupScreen.js` — use PhoneInput component
- [ ] Create `RoleSelectionScreen.js` — extract from Login step 3
- [ ] Redesign `WorkerOnboardingScreen.js` — 3 steps with motivational copy, hide optional address fields
- [ ] Redesign `CustomerOnboardingScreen.js` — single pincode step, remove native header
- [ ] Add post-onboarding success moment for workers

**Risk:** Auth flow change (RoleSelectionScreen) — test thoroughly. OTP input change — do not touch `AuthContext.js` or API calls.

---

### Phase 3 — Customer Home, Marketplace, Worker Cards
**Files:** `LandingScreen.js` (customer state), `MarketplaceScreen.js`, `WorkerCard.js`  
**Duration:** 4–5 days

Tasks:
- [ ] Extract `AppHeader` from LandingScreen
- [ ] Extract `LocationBar` from LandingScreen
- [ ] Extract `LocationPickerModal` to standalone component
- [ ] Redesign Customer home state in `LandingScreen.js`
- [ ] Redesign Guest home state in `LandingScreen.js`
- [ ] Redesign `MarketplaceScreen.js` — compact header, add "Available now" toggle
- [ ] Upgrade `WorkerCard.js` — larger photo (80×80), no chevron, prominent tier badge

**Risk:** LandingScreen is 912 lines with 3 states — extract carefully, do not break Worker state while touching Customer/Guest states.

---

### Phase 4 — Worker Home, Job Feed, Post Job
**Files:** `LandingScreen.js` (worker state), `WorkerJobFeedScreen.js`, `PostJobScreen.js`  
**New files:** `JobCard.js` (extracted from WorkerJobFeedScreen)  
**Duration:** 4–5 days

Tasks:
- [ ] Redesign Worker home state in `LandingScreen.js` — large availability toggle pill, move profile nudge up
- [ ] Extract `JobCard.js` from `WorkerJobFeedScreen.js`
- [ ] Redesign `WorkerJobFeedScreen.js` header — reduce from 5 rows to 3 rows
- [ ] Redesign `PostJobScreen.js` — add date quick-chips for step 3, improve step 4 review card
- [ ] Replace "I'm interested" with "Apply karo" throughout

**Risk:** `JobCard` extraction — ensure engagement state (applied/pending/hired) renders correctly in the extracted component.

---

### Phase 5 — Profile, KYC, Dashboard, Polish
**Files:** `WorkerMyProfileScreen.js`, `CustomerProfileScreen.js`, `DashboardScreen.js`  
**New files:** `WorkerDashboard.js`, `CustomerDashboard.js`, `NotificationsScreen.js`  
**Duration:** 6–8 days

Tasks:
- [ ] Decompose `DashboardScreen.js` → `WorkerDashboard.js` + `CustomerDashboard.js`
- [ ] Simplify dashboard tab structure (4 tabs → 2 sections)
- [ ] Extract `CustomerActiveCard`, `WorkerActiveCard`, `WorkerPendingCard` to component files
- [ ] Redesign `WorkerMyProfileScreen.js` — profile completion bar, gamified sections
- [ ] Redesign `CustomerProfileScreen.js`
- [ ] Create `NotificationsScreen.js`
- [ ] Add notification bell to `AppHeader` with unread count
- [ ] Add profile completion percentage display
- [ ] Add worker review list to `WorkerProfileScreen.js`

**Risk:** DashboardScreen decomposition is the highest-risk change — it touches all core business state (engagements, jobs, ratings). Test every tab state before declaring done.

---

### Phase 6 — QA, Android Testing, Low-End Device Polish
**Duration:** 3–4 days

Tasks:
- [ ] Test on low-end Android device (or emulator at 4GB RAM / 32GB storage)
- [ ] Verify all fonts render correctly (Outfit + Manrope on Android)
- [ ] Verify all emoji render on Android API 24+
- [ ] Verify touch targets: all interactive elements min 44×44px
- [ ] Verify Hindi text (Devanagari) renders correctly in all font sizes
- [ ] Verify pincode lookup works with poor connectivity (offline state)
- [ ] Verify pull-to-refresh on all list screens
- [ ] Verify keyboard avoiding on all forms
- [ ] Verify bottom tab nav doesn't overlap content on devices with navigation gestures
- [ ] Run through full Customer flow: register → post job → find worker → book → accept → complete → rate
- [ ] Run through full Worker flow: register → onboard → find job → apply → hired → mark done
- [ ] Check all empty states render correctly
- [ ] Check all error states (network failure, invalid pincode, wrong OTP)

---

## 10. Risk Control

### 10.1 Do NOT Touch

**Backend / API contracts:**
- All API endpoints (`/auth/`, `/workers/`, `/jobs/`, `/engagements/`, `/bookings/`, `/stats`)
- API request/response shapes — do not rename fields in payload
- Auth flow logic in `AuthContext.js` — only touch what's rendered, not what's called
- OTP send/verify logic — only the UI around it
- Pincode lookup hook `usePincodeLookup.js` — UI only, not the fetch logic

**Business logic:**
- Engagement state machine (requested → accepted → completed)
- Trust tier calculation (backend only)
- Rate insight calculation in `PostJobScreen.js` (already premium UX — keep as is)
- Worker availability toggle logic — only the Switch → Button visual change

**Navigation routes:**
- Do not rename any route names (e.g. "Tabs", "Login", "WorkerProfile", "PostJob")
- Adding new screens is safe — do not remove or rename existing screen routes
- Tab structure changes (within Tabs navigator) are safe

**Data:**
- Do not modify MongoDB schemas
- Do not modify Pydantic models in backend
- Do not add new API fields (the UI should read what exists)

---

### 10.2 Change with Caution

- `LandingScreen.js` — has 3 roles in one file; changes to one must not break others
- `DashboardScreen.js` — complex state; decompose first, then redesign
- `App.js` navigation setup — only touch `tabBarStyle`, `screenOptions`, icon names
- `theme.js` — renaming color keys (`saffron` → `primary`) requires a global find-replace and regression test

---

### 10.3 Safe to Change Freely

- All inline `StyleSheet.create()` styles in any screen
- All copy strings (title text, subtitle text, button labels, placeholder text)
- Font sizes, font families, colors in existing styles
- Spacing values, border radius values
- Component extraction (extract a sub-component that was inline)
- New component files in `src/components/`
- New screen files (new screens don't affect existing navigation)
- `TrustBadge.js`, `WorkerCard.js`, `Button.js` — safe to modify visuals

---

## 11. Final Output

### 11.1 Recommended First 5 Files to Modify

In this order:

1. **`src/theme.js`** — Clean up color aliases, add shadow tokens, add `micro` size, add semantic colors. Foundation for everything else.

2. **`src/components/Button.js`** — Update to use new radius (14) and padding (16/15) tokens. This single change improves every CTA in the app.

3. **`src/components/WorkerCard.js`** — Upgrade photo size to 80×80, remove chevron, make tier badge more prominent, improve name/rate row. Affects MarketplaceScreen, LandingScreen.

4. **`src/screens/WorkerOnboardingScreen.js`** — Redesign the 3 steps with motivational copy and hide optional address fields. This is the highest-value screen to fix (first impression for workers).

5. **`src/screens/LoginScreen.js`** — Replace single OTP input with 6-box individual input fields, remove bureaucratic "Step X of Y" labels. This is the first UX touchpoint for every user.

---

### 11.2 Recommended Components to Create (in order)

1. `src/components/EmptyState.js`
2. `src/components/StatusBadge.js`
3. `src/components/InputField.js`
4. `src/components/PhoneInput.js`
5. `src/components/AppScreen.js`
6. `src/components/AppHeader.js`
7. `src/components/JobCard.js` (extracted from WorkerJobFeedScreen)
8. `src/components/LocationBar.js` (extracted from LandingScreen)
9. `src/components/RatingTrustRow.js`
10. `src/screens/RoleSelectionScreen.js`
11. `src/screens/NotificationsScreen.js`

---

### 11.3 Recommended Screens to Redesign First

1. **`WorkerOnboardingScreen.js`** — Highest impact: first impression for workers, currently most NGO-like
2. **`LoginScreen.js`** — Universal first touchpoint, OTP UX is below standard
3. **`LandingScreen.js` (guest state)** — Conversion screen for new users
4. **`MarketplaceScreen.js`** — Core customer experience
5. **`WorkerJobFeedScreen.js`** — Core worker experience

---

### 11.4 Exact Implementation Order

```
Phase 1: theme.js → Button.js → create EmptyState → create StatusBadge → create InputField → create PhoneInput → create AppScreen → create AppHeader

Phase 2: LoginScreen.js → PhoneSignupScreen.js → create RoleSelectionScreen → WorkerOnboardingScreen.js → CustomerOnboardingScreen.js

Phase 3: WorkerCard.js → MarketplaceScreen.js → LandingScreen.js (guest) → LandingScreen.js (customer)

Phase 4: create JobCard.js → WorkerJobFeedScreen.js → LandingScreen.js (worker) → PostJobScreen.js

Phase 5: WorkerMyProfileScreen.js → CustomerProfileScreen.js → decompose DashboardScreen → WorkerProfileScreen.js (minor polish) → create NotificationsScreen

Phase 6: QA + Android testing
```

---

### 11.5 Checklist for Testing After UI Changes

**After every phase, verify:**

**Functional:**
- [ ] Login with phone number (new and existing user)
- [ ] OTP receives and verifies correctly
- [ ] Worker onboarding saves profile to backend
- [ ] Customer can post a job (all 4 steps)
- [ ] Worker can find and apply to a job
- [ ] Customer can accept a worker's application
- [ ] Worker can mark job done
- [ ] Customer can rate a worker
- [ ] Language toggle (EN ↔ हिं) works on all redesigned screens
- [ ] Location/pincode lookup works in the modal
- [ ] Availability toggle updates worker status in backend
- [ ] Pull-to-refresh works on all list screens

**Visual:**
- [ ] No raw ActivityIndicator (should use colors.primary teal)
- [ ] All buttons have correct size (min 44px touch target)
- [ ] No screen shows native header where custom header is expected
- [ ] All text truncates correctly (numberOfLines where needed)
- [ ] Hindi text (Devanagari) renders without clipping
- [ ] Empty states show on correct conditions
- [ ] Status badges show correct colors for each status
- [ ] Worker cards show availability dot when `is_available: true`
- [ ] Trust tier badge shows for tier 2, 3, 4 workers

**Regression:**
- [ ] Admin screen still works (do not accidentally include admin in new tab structure)
- [ ] WhatsApp demo screen is accessible from tab
- [ ] Calendar screen is accessible from tab (customer + worker)
- [ ] Contact support navigates correctly
- [ ] WorkerProfile booking flow (with and without open jobs)

---

## Appendix: File Change Summary

| File | Change Type | Phase |
|------|-------------|-------|
| `src/theme.js` | Modify (token cleanup) | 1 |
| `src/components/Button.js` | Modify (visual upgrade) | 1 |
| `src/components/WorkerCard.js` | Modify (visual upgrade) | 3 |
| `src/components/Input.js` | Modify or replace with InputField | 1 |
| `src/components/TrustBadge.js` | Modify (visual upgrade) | 1 |
| `src/screens/LoginScreen.js` | Major redesign | 2 |
| `src/screens/PhoneSignupScreen.js` | Redesign | 2 |
| `src/screens/WorkerOnboardingScreen.js` | Major redesign | 2 |
| `src/screens/CustomerOnboardingScreen.js` | Redesign | 2 |
| `src/screens/LandingScreen.js` | Major redesign (all 3 states) | 3+4 |
| `src/screens/MarketplaceScreen.js` | Redesign | 3 |
| `src/screens/WorkerJobFeedScreen.js` | Redesign | 4 |
| `src/screens/PostJobScreen.js` | Minor redesign | 4 |
| `src/screens/WorkerProfileScreen.js` | Minor polish | 5 |
| `src/screens/DashboardScreen.js` | Decompose + redesign | 5 |
| `src/screens/WorkerMyProfileScreen.js` | Redesign | 5 |
| `src/screens/CustomerProfileScreen.js` | Redesign | 5 |
| `App.js` | Minor (icon names, tabBarStyle) | 3 |
| **NEW:** `src/components/EmptyState.js` | Create | 1 |
| **NEW:** `src/components/StatusBadge.js` | Create | 1 |
| **NEW:** `src/components/InputField.js` | Create | 1 |
| **NEW:** `src/components/PhoneInput.js` | Create | 1 |
| **NEW:** `src/components/AppScreen.js` | Create | 1 |
| **NEW:** `src/components/AppHeader.js` | Create | 1 |
| **NEW:** `src/components/JobCard.js` | Create | 4 |
| **NEW:** `src/components/LocationBar.js` | Create | 3 |
| **NEW:** `src/components/RatingTrustRow.js` | Create | 3 |
| **NEW:** `src/screens/RoleSelectionScreen.js` | Create | 2 |
| **NEW:** `src/screens/WorkerDashboard.js` | Create (split from Dashboard) | 5 |
| **NEW:** `src/screens/CustomerDashboard.js` | Create (split from Dashboard) | 5 |
| **NEW:** `src/screens/NotificationsScreen.js` | Create | 5 |
