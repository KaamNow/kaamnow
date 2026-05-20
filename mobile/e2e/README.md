# KaamNow E2E Tests

## Tools
- **Maestro** — YAML flow-based mobile UI testing (recommended, zero-config)
- **Mobile MCP** — MCP server for Claude to control device via tools  
- **Appium MCP** — MCP server with AI element finding

## Setup

### Option A — Maestro (runs YAML flows directly)
```bash
# Install
curl -Ls "https://get.maestro.dev" | bash
export PATH="$HOME/.maestro/bin:$PATH"

# Connect Android device or start emulator, then:
maestro test mobile/e2e/01_signup.yaml

# Run all flows
maestro test mobile/e2e/
```

### Option B — Mobile MCP (lets Claude control device interactively)
Already added to .mcp.json. Restart Claude Code and you'll see mobile tools.

Connect Android device via USB with USB debugging ON, then ask Claude:
> "Take a screenshot of the app, tap the Login tab, enter phone 9000000099, verify OTP flow works"

### Option C — Appium MCP
Already added to .mcp.json. Requires Appium server running separately:
```bash
npm install -g appium
appium
# Then Claude can use appium tools
```

## Test Flows

| File | What it tests |
|---|---|
| `01_signup.yaml` | New user signup — phone → OTP → name → home |
| `02_post_job.yaml` | Post a job — category → skill → details → submit |
| `03_become_expert.yaml` | Become a Local Expert — skills → rate → submit |
| `04_apply_and_hire.yaml` | Worker applies for a job |
| `05_profile_navigation.yaml` | All profile screen buttons — wallet, FAQ, terms, language toggle |

## Running on Device vs Emulator

**Physical Android device:**
1. Enable Developer Options → USB Debugging
2. Connect via USB
3. `adb devices` — confirm device listed
4. `maestro test mobile/e2e/`

**Android Emulator:**
1. Open Android Studio → AVD Manager → Start emulator
2. `maestro test mobile/e2e/`

**Expo Go (fastest for dev):**
- Maestro works with Expo Go — just have the app open before running flows
- Set `appId` to `host.exp.exponent` in YAML files for Expo Go

## App ID
- **Expo Go**: `host.exp.exponent`
- **Development build**: `com.kaamnow.app`
- **Production APK**: `com.kaamnow.app`
