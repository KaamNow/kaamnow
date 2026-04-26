# KaamNow Mobile (Expo + React Native)

Cross-platform iOS + Android app for **kaamnow.com** — full feature parity with the web app.

## ✨ What's inside

- **9 screens**: Landing, Strategy showcase, Login, Signup, Marketplace (with native map), Worker Profile, Post Job, Dashboard, WhatsApp simulated chat
- **JWT auth** with `expo-secure-store` (no cookies on mobile)
- **Native map** via `react-native-maps` (Apple Maps on iOS, Google Maps on Android)
- **Custom design system**: Saffron + Indigo, Outfit (display) + Manrope (body)
- **Bottom tab navigation** + native stack for sub-screens
- Connects to the **same FastAPI backend** as the web app — zero backend changes needed

---

## 🚀 Run it on your phone in 3 minutes

### 1. Install Expo Go on your phone
- **iOS** → App Store: search "Expo Go"
- **Android** → Play Store: search "Expo Go"

### 2. On your dev machine
```bash
cd mobile
yarn install        # already done if you cloned this
npx expo start
```

A QR code appears in your terminal.

### 3. Scan the QR code
- **iOS** → Open Camera app → point at QR → tap notification
- **Android** → Open Expo Go → tap "Scan QR code"

The app loads on your phone in ~30 seconds. ✅

---

## 🔌 Backend URL configuration

By default, the app connects to the live preview URL configured in `app.json`:
```json
"extra": {
  "apiUrl": "https://adb859de-82e2-4ac1-9d9b-f64456df6b58.preview.emergentagent.com"
}
```

**To use a different backend** (e.g. local dev or production):
1. Open `app.json`
2. Change `expo.extra.apiUrl` to your URL (no trailing slash)
3. Restart `npx expo start`

For local backend: use your computer's LAN IP (not `localhost`), e.g. `http://192.168.1.42:8001`.

---

## 🔐 Demo logins

| Role | Email | Password |
|---|---|---|
| Customer | `customer@kaamnow.com` | `customer123` |
| Worker | `worker@kaamnow.com` | `worker123` |
| Admin | `admin@kaamnow.com` | `admin123` |

---

## 📦 Build production APK / IPA (later)

When you're ready to publish to Play Store / App Store:

```bash
npm install -g eas-cli
eas login          # create an Expo account first at expo.dev
eas build --platform android       # APK / AAB
eas build --platform ios           # IPA (requires Apple Developer account)
```

EAS handles native compilation in the cloud — no Mac/Xcode needed for development.

---

## 📁 Structure

```
mobile/
├── App.js                          # Root + nav setup
├── app.json                        # Expo config (icon, bundle ID, API URL)
├── package.json
├── babel.config.js
├── assets/                         # icons + splash (replace with branded ones)
└── src/
    ├── api.js                      # axios + Bearer token
    ├── theme.js                    # design tokens
    ├── components/
    │   ├── Button.js
    │   ├── Input.js
    │   ├── Overline.js
    │   ├── TrustBadge.js
    │   └── WorkerCard.js
    ├── contexts/
    │   └── AuthContext.js          # SecureStore-backed JWT
    └── screens/
        ├── LandingScreen.js
        ├── StrategyScreen.js
        ├── LoginScreen.js
        ├── SignupScreen.js
        ├── MarketplaceScreen.js    # list + native map toggle
        ├── WorkerProfileScreen.js
        ├── PostJobScreen.js
        ├── DashboardScreen.js
        └── WhatsAppDemoScreen.js
```

---

## 🐛 Common gotchas

| Problem | Fix |
|---|---|
| `Network Error` on login | Check `app.json` → `extra.apiUrl` matches a reachable backend |
| Map blank on Android | Expo Go ships with a free map key — works out of the box |
| Fonts not loading | Run `npx expo start -c` to clear cache |
| App crashes on launch | Check terminal for red errors; usually a missing dep — re-run `yarn install` |
| Local backend not reachable | Use LAN IP not `localhost` (your phone is on the same wifi but a different host) |

---

## 🎨 Replacing placeholder assets

The `assets/icon.png`, `splash.png`, etc. are 1×1 placeholders. Before publishing:
- `icon.png` → **1024×1024** PNG, no transparency
- `splash.png` → **1284×2778** (iPhone 14 Pro Max safe size)
- `adaptive-icon.png` → **1024×1024** with safe zone in center

Drop them into `assets/` and rebuild.
