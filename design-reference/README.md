# KaamNow Design Reference

This folder stores Claude-generated visual mockups and design-canvas files used as references for the mobile UI redesign.

These files are documentation only. They are not imported by the React Native app and should not be treated as production runtime code.

Production mobile code lives in:

- `mobile/src/screens`
- `mobile/src/components`
- `mobile/src/theme.js`

Reference files:

- `index.html` - Phase 1 visual preview
- `screens.jsx` - Phase 1 screen mockups
- `screens-2.jsx` - Phase 2 screen mockups
- `screens-3.jsx` - Phase 3 screen mockups
- `screens-4.jsx` - Phase 4 screen mockups
- `screens-5.jsx` - Phase 5 screen mockups
- `design-canvas.jsx` - design canvas wrapper
- `android-frame.jsx` - Android frame wrapper

## Phase Coverage

### Phase 1 - Core Marketplace Flow

Reference file: `screens.jsx`

- `DashboardScreen` - logged-in home with location, search, expert/work CTAs, categories, and urgent jobs.
- `MarketplaceScreen` - find local experts feed with search, filters, expert cards, profile navigation, and booking CTA.
- `WorkerProfileScreen` - public expert profile with hero, stats, specializations, intro video, reviews, and book action.
- `FindWorkScreen` - worker-side find jobs page with search, filters, job cards, apply/withdraw states.
- `PostJobScreen` - job posting flow and review/success structure.
- `ActivityScreen` - engagement/activity list with cards and status actions.
- `JobDetailScreen` - full job detail with owner/applicant logic references.
- `ProfileScreen` - user profile, expert tools, account shortcuts, support, and logout.

### Phase 2 - Auth, Profile Editing, and Addresses

Reference file: `screens-2.jsx`

- `LandingScreen` - logged-out entry/home experience.
- `LoginScreen` - OTP login flow.
- `PhoneSignupScreen` - OTP signup flow.
- `EditProfileScreen` - editable profile fields and read/edit states.
- `EditPhotoScreen` - profile photo preview and upload action.
- `AddressFormScreen` - add/edit saved address form with pincode and GPS affordance.
- `SavedAddressesScreen` - saved address list with default, edit, and delete actions.

### Phase 3 - Expert Tools

Reference file: `screens-3.jsx`

- `BecomeExpertScreen` - expert onboarding skills and daily-rate steps.
- `PortfolioScreen` - expert portfolio photo grid with add/remove reference.
- `CertificationsScreen` - certification list, verified/pending states, add/delete actions.
- `VideoProfileScreen` - intro video status and upload/change CTA.
- `KYCScreen` - KYC verification status and initiate CTA.
- `EarningsScreen` - earnings hero, stats, and completed-job list.
- `QRCodeScreen` - shareable service-profile QR code.
- `SavedExpertsScreen` - saved expert list cards.

### Phase 4 - Communication and Support

Reference file: `screens-4.jsx`

- `ChatsListScreen` - incoming requests, active chats, applications, and completed chat rows.
- `ChatScreen` - engagement chat with job banner, message bubbles, quick replies, and input/locked states.
- `ContactSupportScreen` - support channels and short FAQ references.
- `SupportChatScreen` - support chat/WebView shell reference.
- `FAQScreen` - searchable FAQ list with grouped expandable items and support CTA.
- `NotificationsScreen` - notification inbox with icons, unread states, mark-all-read, and navigation hints.

### Phase 5 - Utility, Legal, and Secondary Screens

Reference file: `screens-5.jsx`

- `WalletScreen` - wallet balance, referral card, and transaction list.
- `CalendarScreen` - monthly work calendar, hero stats, event dots, and selected-day cards.
- `MapScreen` - expert map pins, callout, and locate button.
- `TermsScreen` - terms document layout with optional accept CTA.
- `PrivacyScreen` - privacy policy document layout.
- `WorkerJobFeedScreen` - alternate worker job feed reference with expert banner, search, filters, cards, apply/pending states.
- `WhatsAppDemoScreen` - WhatsApp-style bot demo chat reference.
