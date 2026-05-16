# WhatsApp Bot — Current Flow Audit

**Date:** 2026-05-16  
**Branch:** botfixes  
**Auditor:** Claude Code

---

## 1. File Locations

| File | Purpose |
|------|---------|
| `backend/routers/whatsapp.py` | Main bot logic, webhook handler, Gupshup helpers (1326 lines) |
| `backend/whatsapp_notify.py` | Outbound notification templates (fired from engagements/bookings) |
| `backend/config.py` | All env var bindings for Gupshup settings |
| `backend/schemas.py` | `WhatsAppMessageIn`, `Address`, `UserOut`, `WorkerOut`, etc. |
| `tests/test_whatsapp.py` | Unit tests for payload extraction + send helpers |

---

## 2. Routes

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/whatsapp/message` | Internal REST endpoint — in-app chat bot (authenticated) |
| `POST` | `/api/whatsapp/gupshup` | **Main webhook** — Gupshup inbound messages |
| `GET` | `/api/whatsapp/gupshup` | Webhook URL verification |
| `HEAD/OPTIONS` | `/api/whatsapp/gupshup` | Health check / CORS preflight |

---

## 3. Env Vars Used for Gupshup

| Env Var | Settings Field | Purpose |
|---------|---------------|---------|
| `GUPSHUP_API_URL` | `gupshup_api_url` | Send endpoint URL |
| `GUPSHUP_API_KEY` | `gupshup_api_key` | Auth header (`apikey`) |
| `GUPSHUP_SOURCE` | `gupshup_source` | Sender WhatsApp number |
| `GUPSHUP_APP_ID` | `gupshup_app_id` | Optional app name (`src.name` field) |
| `GUPSHUP_CHANNEL` | `gupshup_channel` | Always `"whatsapp"` |
| `GUPSHUP_VERIFY_TOKEN` | `gupshup_verify_token` | Webhook verification token |
| `GUPSHUP_TEMPLATE_URL` | `gupshup_template_url` | Template send URL (not used in bot logic) |
| `GUPSHUP_TEMPLATE_NAMESPACE` | `gupshup_template_namespace` | Template namespace (not used in bot logic) |
| `GUPSHUP_SANDBOX_MODE` | `gupshup_sandbox_mode` | Flag (not used in logic) |
| `FEATURE_WHATSAPP_NOTIFICATIONS` | `feature_whatsapp_notifications` | Gate for outbound notifications |

---

## 4. Gupshup Send Endpoint — Exact Payload Shape

**All outbound messages** are plain text sent via `_send_gupshup_text()`:

```
POST <GUPSHUP_API_URL>
Content-Type: application/x-www-form-urlencoded
apikey: <GUPSHUP_API_KEY>

channel=whatsapp
&source=<GUPSHUP_SOURCE>
&destination=<phone_digits_with_91_prefix>
&message={"type":"text","text":"<message body>"}
&src.name=<GUPSHUP_APP_ID>      ← only if GUPSHUP_APP_ID is set
```

**No interactive message payloads are sent anywhere in the current codebase.** There is no `_send_gupshup_buttons()` or `_send_gupshup_list()` function.

---

## 5. Phone Normalization — Current State

Two helpers exist but are inconsistently applied:

```python
_normalize_phone(phone)  # → last 10 digits (strips everything)
_full_phone(phone)       # → "91" + 10 digits
```

**Lookup** (`_lookup_user_by_phone`):
```python
normalized = _normalize_phone(phone)   # e.g. "9654945155"
db.users.find_one({"phone_primary": {"$regex": normalized, "$options": "i"}})
```

**Gaps:**
- Regex on 10 digits can match partial numbers (e.g., `9654945155` matches `+919654945155` AND any number ending in those digits)
- `phone` field not checked — only `phone_primary`
- User records created by WhatsApp onboarding store phone as `+91XXXXXXXXXX` in `phone_primary`
- User records created by mobile/web OTP flow may store differently
- No index on `phone_primary` — regex scan is full-collection

---

## 6. Session Storage

Collection: `db.bot_sessions`

```json
{
  "session_id": "whatsapp-919XXXXXXXXX",
  "state": {
    "step": "worker_menu",
    "user_id": "uuid",
    "worker_id": "uuid",
    "role": "worker",
    "job_list": [...],
    "job_offset": 5,
    "job_category": null,
    "job_pincode_filter": null,
    "viewed_job": null,
    "active_engagement_id": null
  },
  "updated_at": "2026-05-16T..."
}
```

**Gaps:**
- **No TTL/expiry** — sessions never expire. A session from 6 months ago stays active.
- `whatsapp_sessions` is called `bot_sessions` in the actual code.
- No `phone` or `last_job_results` / `last_worker_results` fields.
- No `temp_data` dict for onboarding state (stored as flat `wa_*` keys).

---

## 7. Current Supported Commands

### Worker Commands
| Input | Handler |
|-------|---------|
| `JOBS` / `KAAM` | `_cmd_jobs()` — shows paginated job list |
| `JOBS <pincode>` | `_cmd_jobs()` with `pincode_filter` (does NOT save to profile) |
| `JOBS <category>` | `_cmd_jobs()` with category filter |
| `MORE` | `_cmd_jobs()` with current offset |
| `1` – `5` (when job_list shown) | `_cmd_job_detail()` |
| `APPLY` / `INTERESTED` | `_cmd_apply()` — creates engagement |
| `WITHDRAW` / `WAPAS` / `CANCEL` | `_cmd_withdraw()` |
| `STATUS` / `MY STATUS` | `_cmd_status()` |
| `PINCODE <digits>` | `_cmd_set_pincode()` — saves to `worker.address.pincode` |
| `PINCODE` (no arg) | `_cmd_show_pincode()` |
| `ACCEPT` | Accept pending booking |
| `REJECT` / `DECLINE` / `NAHI` / `NO` | Reject pending booking |
| `HI` / `HELLO` / `NAMASTE` | Show worker menu (text only) |
| `HELP` / `?` / `MADAD` | Show `_HELP_WORKER` text |
| `MENU` / `RESET` / `START` | Clear job state, re-enter as "hi" |

### Customer Commands
| Input | Handler |
|-------|---------|
| `HI` / `HELLO` / `NAMASTE` | Greet + prompt MENU/HELP (text only) |
| `MENU` | Triggers `_bot_reply_customer()` state machine |
| `1` / `2` (role select) | Customer booking flow |
| `1`–`6` (category) | Category select |
| `1`–`20` (count) | Worker count |
| `1`–`3` (date) | Date select |
| Village name (text) | `_handle_village()` — text-match worker search |
| `1`–`5` (select worker) | `_handle_select()` — creates job + booking |
| `HELP` | Show `_HELP_CUSTOMER` text |

### Unregistered Commands
| Input | Handler |
|-------|---------|
| Any first message | Start onboarding with role prompt |
| `1` → customer, `2` → worker | `_cmd_onboard()` state machine |
| Name → Pincode → Village → (Rate → Skills for worker) | Sequential onboarding |

---

## 8. Current User Lookup Logic

```
gupshup_webhook()
  → _extract_gupshup_incoming(body)  # extract phone + text
  → session_id = "whatsapp-" + phone_digits
  → load state from db.bot_sessions
  → _handle_message(phone, text, state)
      → _identify_user(phone, state)
          if state.user_id:
              db.users.find_one({id: state.user_id})
          else:
              _lookup_user_by_phone(phone)  # regex on phone_primary
      → route by state.role
```

---

## 9. Current Customer Behavior (Registered)

**On "hi":**
- Greets by first name
- Shows text: "Workers dhundhne ke liye: *MENU*"
- **Does NOT auto-show workers** — customer must type MENU

**On MENU:**
- Starts numbered category selection (type 1–6)
- Requires typing numbers at each step
- Worker search by village name (typed, not pincode)
- No default pincode used
- No buttons or lists

**Gap:** Customer default pincode (`user.pincode` or `user.address.pincode`) is never read by the bot to auto-fetch nearby workers.

---

## 10. Current Worker Behavior (Registered)

**On "hi":**
- Greets by first name
- Shows current pincode from `worker.address.pincode`
- Shows text commands: `*JOBS*`, `*STATUS*`, `*HELP*`
- **Does NOT auto-show jobs** — worker must type JOBS

**On JOBS:**
- Fetches jobs sorted by haversine distance from worker lat/lng
- Displays as numbered text list (no list buttons)
- `worker.lat` / `worker.lng` used for distance — NOT pincode-based proximity

**Gap:** Worker sees "hi" menu but must type JOBS to get jobs. No auto-show on greeting.

---

## 11. Current Unregistered Behavior

**On any message:**
- Prompts: "1️⃣ Mujhe workers chahiye / 2️⃣ Main kaam dhundhta hun"
- User types `1` or `2` (no buttons)
- Sequential onboarding: name → pincode → village → (worker: rate → skills)
- Creates user + (for worker) worker record in same MongoDB collections used by app
- After onboarding: sends MENU/JOBS prompt — **does NOT auto-show workers/jobs**

---

## 12. Button/List Implementation Status

| Feature | Status |
|---------|--------|
| WhatsApp reply buttons | ❌ Not implemented |
| WhatsApp list messages | ❌ Not implemented |
| Gupshup interactive message API calls | ❌ Not implemented |
| Button/list reply payload parsing | ❌ Not implemented |
| Interactive message fallback | ❌ Not needed (never attempted) |

**All messages are plain text.** The UX is entirely command/number-based.

---

## 13. Current Fallback Behavior

| Situation | Response |
|-----------|---------|
| Worker unknown command | "Samajh nahi aaya. 🙏\n\nJOBS – Kaam dhundhen\nHELP – Sabhi commands" |
| Customer unknown command | "MENU type karein naya request karne ke liye." |
| Unregistered unknown | Starts onboarding |
| Unknown role in DB | "Aapka account linked nahi ho saka. kaamnow.com/signup par register karein." |
| Gupshup parse failure | Logs error, returns HTTP 200 (swallows) |
| Gupshup send failure | Raises HTTP 502 |

---

## 14. Data Sync Gaps

| Gap | Detail |
|-----|--------|
| **Phone field inconsistency** | Mobile/web OTP stores phone in `phone_primary` as `+91XXXXXXXXXX`. Bot lookup only searches `phone_primary`. If a user registered via OTP with phone stored differently, bot won't find them. |
| **Pincode in two places** | Workers have pincode in `worker.address.pincode` AND `user.address.pincode`. Bot reads from `worker.address.pincode` only. Customer pincode is in `user.pincode` / `user.address.pincode` — bot never reads it. |
| **Customer worker search by village text** | Bot searches workers by `village` text match. Mobile/web use geolocation (lat/lng). Inconsistent discovery. |
| **Job search uses lat/lng for workers** | `_fetch_jobs_for_worker` uses haversine from worker `lat`/`lng`. Workers created via WhatsApp onboarding have `lat: 0.0, lng: 0.0` — all jobs sort as equal distance. |
| **No TTL on bot_sessions** | Stale conversation state persists indefinitely. User context can be wrong after profile updates. |
| **Onboarding doesn't update existing user** | If user has `user.address.pincode` set via app, WhatsApp onboarding ignores it and asks again. |
| **`wa_*` temp state keys** | Onboarding state stored as flat keys (`wa_name`, `wa_pincode`, etc.) — no cleanup after onboarding completes. |
| **Worker bookings: ACCEPT/REJECT** | Worker can ACCEPT/REJECT via WhatsApp. But customer phone checked via `customer.phone` not `customer.phone_primary`. Notification may silently fail. |

---

## 15. Current State Steps (All Known Values)

```
start            initial / reset
intent           customer role-select (type 1/2) — legacy, pre-registration check
category         customer: choose category 1-6
count            customer: enter worker count
date             customer: choose date
village          customer: enter village text
select           customer: choose worker number
customer_menu    customer: post-onboard or post-hi menu state
worker_menu      worker: post-hi menu state
job_list         worker: viewing numbered job list
job_detail       worker: viewing a single job
applied          worker: just applied
start            unregistered: after MENU/RESET

wa_ob_role       onboarding: choose customer/worker (type 1/2)
wa_ob_name       onboarding: enter name
wa_ob_pincode    onboarding: enter pincode
wa_ob_village    onboarding: enter village
wa_ob_rate       onboarding worker: enter daily rate
wa_ob_skills     onboarding worker: choose skills (type 1-6 comma-separated)
```

---

## 16. Missing States (Required by New Design)

The following states do not exist yet and must be added:

```
onboarding_role          (rename/replace wa_ob_role)
onboarding_name          (rename/replace wa_ob_name)  
onboarding_pincode       (rename/replace wa_ob_pincode)
onboarding_skill         (new, cleaner wa_ob_skills)
onboarding_rate          (rename wa_ob_rate)
change_pincode           (NEW — mid-session pincode update flow)
customer_post_job_*      (NEW — in-WhatsApp job creation)
selecting_worker         (NEW — customer has chosen a worker, awaiting action)
selecting_job            (NEW — worker viewing job, awaiting APPLY)
```

---

## 17. Summary: What Works vs What's Missing

### Works Today
- Session persistence in MongoDB
- User lookup by phone via regex on `phone_primary`
- Role routing (worker/customer/unregistered)
- Full worker onboarding (creates user + worker record synced to DB)
- Full customer onboarding (creates user record synced to DB)
- Worker: JOBS, MORE, APPLY, WITHDRAW, STATUS, PINCODE, ACCEPT, REJECT
- Engagement creation using same backend logic as app
- Outbound text notifications on booking events
- Multi-format Gupshup payload parsing

### Missing / Broken
- **Auto-show workers/jobs on "hi"** — user must type MENU/JOBS
- **Button/list interactive messages** — entire UX is text/number commands
- **Customer default pincode used** — ignored in bot
- **Pincode-based worker search for customer** — bot uses village text match
- **Post-onboarding auto-show** — after registering, bot doesn't show results
- **Session TTL** — sessions never expire
- **"Change Pincode" flow** — no interactive pincode update flow
- **Unified phone normalization** — regex lookup has partial-match risk
- **Logging** — no structured per-message logs with phone mask/flow/kind
- **Test script** for simulating flows
- **Customer job posting via WhatsApp** — redirects to web
