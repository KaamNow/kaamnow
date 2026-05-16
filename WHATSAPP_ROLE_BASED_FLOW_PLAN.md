# WhatsApp Bot — Role-Based Flow Implementation Plan

**Date:** 2026-05-16  
**Based on:** WHATSAPP_CURRENT_FLOW_AUDIT.md  
**Scope:** `backend/routers/whatsapp.py` (primary), `backend/whatsapp_notify.py` (minor)

---

## Architecture Decision

All changes are **additive** inside `backend/routers/whatsapp.py`.  
No new files in backend. No schema changes. No new collections except:
- `bot_sessions` already exists — add `ttl` index + `phone` field
- `whatsapp_sessions` → we **keep using** `bot_sessions` (same collection, rename in docs only)

Data always reads/writes to: `users`, `workers`, `jobs`, `bookings`, `engagements`.  
No WhatsApp-only user store.

---

## A. Phone Normalization Utility

**Replace current two-function approach with one canonical function.**

### Current problem
- `_normalize_phone()` strips to 10 digits, used for DB regex lookup
- `_full_phone()` adds `91` prefix, used for sending
- Regex lookup `{"phone_primary": {"$regex": normalized}}` risks partial matches

### New: `normalize_phone(raw: str) -> str`
Returns canonical 12-digit string `91XXXXXXXXXX` for all inputs:
- `+919654945155` → `919654945155`
- `919654945155` → `919654945155`
- `9654945155` → `919654945155`
- `09654945155` → `919654945155`

### New: `_lookup_user_by_phone(phone: str) -> Optional[dict]`
Search `phone_primary` with **three exact alternatives** (not regex):
```python
{"phone_primary": {"$in": [f"+91{digits10}", f"91{digits10}", digits10]}}
```
Also check `phone` field with same `$in` as fallback.

---

## B. Session Schema Updates

**Add to every session document:**
```json
{
  "session_id": "whatsapp-919XXXXXXXXX",
  "phone": "919XXXXXXXXX",
  "user_id": "uuid | null",
  "role": "worker | customer | null",
  "worker_id": "uuid | null",
  "state": "onboarding_role | worker_menu | ...",
  "step": "<same as state — kept for backward compat>",
  "temp": {},
  "last_worker_results": [],
  "last_job_results": [],
  "updated_at": "ISO8601"
}
```

**TTL index:** `updated_at` with 30-day expiry (MongoDB TTL index).  
Add index on first startup via `db.bot_sessions.create_index("updated_at", expireAfterSeconds=2592000)`.

**State machine states** (canonical list going forward):

| State | Description |
|-------|-------------|
| `start` | Fresh / reset — triggers identity check |
| `worker_menu` | Worker greeted, waiting for action |
| `worker_job_list` | Worker viewing job list |
| `worker_job_detail` | Worker viewing single job |
| `worker_applied` | Worker just applied |
| `customer_menu` | Customer greeted, waiting for action |
| `customer_worker_list` | Customer viewing worker list |
| `customer_worker_detail` | Customer viewing single worker |
| `customer_select_job` | Customer choosing which job to attach booking to |
| `change_pincode` | Either role: awaiting 6-digit pincode input |
| `change_pincode_save_ask` | Awaiting yes/no to save as default |
| `onboarding_role` | Unregistered: awaiting 1/2 role choice |
| `onboarding_name` | Unregistered: awaiting name |
| `onboarding_pincode` | Unregistered: awaiting pincode |
| `onboarding_village` | Unregistered: awaiting village |
| `onboarding_rate` | Worker onboarding: awaiting daily rate |
| `onboarding_skill` | Worker onboarding: awaiting skill selection |

---

## C. Gupshup Interactive Message Sending

### C1. Reply Buttons (`_send_gupshup_buttons`)

Sends up to 3 quick-reply buttons. Falls back to numbered text if Gupshup rejects.

**Payload shape (Gupshup interactive buttons):**
```
POST <GUPSHUP_API_URL>
Content-Type: application/x-www-form-urlencoded
apikey: <GUPSHUP_API_KEY>

channel=whatsapp
&source=<GUPSHUP_SOURCE>
&destination=<phone>
&src.name=<GUPSHUP_APP_ID>
&message={
  "type": "interactive",
  "interactive": {
    "type": "button",
    "body": {"text": "<body text>"},
    "action": {
      "buttons": [
        {"type": "reply", "reply": {"id": "btn_1", "title": "Option 1"}},
        {"type": "reply", "reply": {"id": "btn_2", "title": "Option 2"}},
        {"type": "reply", "reply": {"id": "btn_3", "title": "Option 3"}}
      ]
    }
  }
}
```

Button title max 20 chars. Max 3 buttons per message.

**Fallback text** (if Gupshup responds 4xx/5xx or `success: false`):
```
<body text>

1. Option 1
2. Option 2  
3. Option 3

Reply 1, 2 ya 3 type karein.
```

### C2. List Message (`_send_gupshup_list`)

Sends a scrollable list for jobs/workers (up to 10 items in one section).

**Payload shape:**
```json
{
  "type": "interactive",
  "interactive": {
    "type": "list",
    "body": {"text": "<body text>"},
    "action": {
      "button": "Dekhein",
      "sections": [{
        "title": "Available",
        "rows": [
          {"id": "item_0", "title": "Worker Name", "description": "Skill · ₹rate/day · Pincode"}
        ]
      }]
    }
  }
}
```

Row title max 24 chars. Description max 72 chars. Max 10 rows per section.

**Fallback text:**
```
<body text>

1. Worker Name — ₹rate/day
   Skill · Pincode
2. ...

Number type karein details ke liye (e.g. *1*)
```

### C3. Inbound Button/List Reply Parsing

Update `_extract_gupshup_incoming()` to handle interactive replies:

**Button reply payload (Gupshup sends):**
```json
{
  "type": "message",
  "payload": {
    "type": "interactive",
    "source": "919XXXXXXXXX",
    "payload": {
      "type": "button_reply",
      "payload": {"id": "btn_change_pincode", "title": "Change Pincode"}
    }
  }
}
```

**List reply payload:**
```json
{
  "payload": {
    "type": "interactive", 
    "payload": {
      "type": "list_reply",
      "payload": {"id": "item_2", "title": "Worker Name"}
    }
  }
}
```

Extraction: if `payload.type == "interactive"`, extract `payload.payload.payload.id` as the message text (the button/row ID). This becomes `message_text` passed to `_handle_message()`. All IDs are designed so the dispatch logic handles them like typed commands.

---

## D. Registered Customer — "Hi" Flow

### D1. Trigger
Any of: `hi`, `hello`, `namaste`, `hai`, `MENU`, `RESET`, `START`, or step == `start`

### D2. Logic
```
1. _identify_user() → finds registered customer
2. Read customer pincode:
   - Try user.address.pincode
   - Fallback: user.pincode
   - Fallback: "not set"
3. If pincode found:
   - _fetch_workers_for_customer(pincode)
   - If workers found:
       - Send greeting text:
         "Namaste {name}! 🙏 KaamNow mein swagat hai."
         "Aapke pincode {pincode} ke nearby workers:"
       - Send list message with workers
       - Send buttons: [Change Pincode] [Help]
   - If no workers:
       - Send greeting + "Is pincode mein koi worker nahi mila."
       - Send buttons: [Change Pincode] [Help]
4. If no pincode:
   - Send greeting
   - Ask: "Apna pincode batayein workers dhundhne ke liye:"
   - State → change_pincode (save_as_default=True implicit)
```

### D3. State after greeting
```json
{
  "state": "customer_worker_list",
  "last_worker_results": [...],   // up to 5 workers shown
  "default_pincode": "801505"
}
```

---

## E. Registered Customer — Worker List & Detail Flow

### E1. Worker list item format (list message rows)
```
title: "Ramesh Kumar"  (max 24 chars)
description: "Kheti · ₹500/day · 801505"
id: "worker_0"  (index into last_worker_results)
```

### E2. Worker detail (on selecting a worker)
Trigger: button/list reply with id `worker_N` or typed number `N`

```
Send text:
👷 *{name}*

📁 Skills: harvesting, weeding
💰 Rate: ₹500/day
📍 {village}, {district}
⭐ Rating: 4.2 (12 jobs)

Send buttons: [Send Request] [More Workers] [Change Pincode]
```

State → `customer_worker_detail`, `selected_worker_id: worker.id`

### E3. Send Request flow

**If customer has open jobs:**
```
Kaunsi job ke liye request bhejein?
[list of open jobs] (list message)
[Post New Job] button
```
State → `customer_select_job`

**If customer has no open jobs:**
```
Aapke paas koi open job nahi hai.
Worker ko request bhejne ke liye pehle job post karein.

[Post Job] [Open App]
```
"Post Job" → triggers `customer_post_job_*` mini-flow (scope for Phase 2; current MVP: redirect to app)

**On job selection:**
- Create engagement using existing `create_engagement_request()`
- Send confirmation text
- Send buttons: [More Workers] [Main Menu]

---

## F. Registered Worker — "Hi" Flow

### F1. Trigger
Same as customer: `hi`, `hello`, `namaste`, `MENU`, `RESET`, `START`, step == `start`

### F2. Logic
```
1. _identify_user() → finds registered worker
2. Read worker pincode:
   - Try worker.address.pincode
   - Fallback: user.address.pincode
   - Fallback: user.pincode
   - Fallback: "not set"
3. If pincode found:
   - _fetch_jobs_for_worker(worker, pincode_filter=pincode)
   - If jobs found:
       - Send greeting text
       - Send list message with jobs
       - Send buttons: [Change Pincode] [My Applications] [Help]
   - If no jobs:
       - Send greeting + "Is pincode mein koi kaam nahi mila."
       - Send buttons: [Change Pincode] [Help]
4. If no pincode:
   - Send greeting
   - Ask: "Apna pincode batayein kaam dhundhne ke liye:"
   - State → change_pincode
```

### F3. Worker greeting text
```
Namaste {name}! 👷 KaamNow mein swagat hai.
Aapke pincode {pincode} ke nearby kaam:
```

### F4. Job list item format (list message rows)
```
title: "Farm Worker Needed"  (max 24 chars, truncate)
description: "Sonepur · ₹400/day · 2026-05-18"
id: "job_0"
```

### F5. Job detail (on selecting a job)
Trigger: list reply `job_N` or typed `N`

```
Send text:
💼 *{title}*

📁 Category: Farm
💰 Rate: ₹400/day
📅 Date: 2026-05-18
👥 Workers needed: 3
📍 Sonepur, Saran, Bihar
📐 Distance: 12.5 km

Send buttons: [Apply] [More Jobs] [Change Pincode]
```

State → `worker_job_detail`, `viewed_job: job`

---

## G. Unregistered User — Onboarding Flow

### G1. Trigger
Any message from phone not found in `users`

### G2. Opening message
Send **buttons** (not numbered text):
```
Body: "Namaste! KaamNow par aapka swagat hai 🙏
Aap kya karna chahte hain?"

Buttons:
[btn_customer] Mujhe worker chahiye
[btn_worker]   Mujhe kaam chahiye
[btn_help]     Help
```

State → `onboarding_role`

### G3. If "Mujhe worker chahiye" (customer onboarding)
```
Step onboarding_name:   "Aapka poora naam kya hai?"
Step onboarding_pincode: "Aapka area ka pincode? (6 digits)"
  → validate + lookup district/state via postalpincode.in
  → show: "✅ Saran District · Bihar. Sahi hai?"
  → Buttons: [Yes, Correct] [Enter Again]
Step onboarding_village: "Apna village ya area naam type karein:"
  → _finish_customer_onboard() 
  → Auto-show workers for pincode (list message)
```

### G4. If "Mujhe kaam chahiye" (worker onboarding)
```
Step onboarding_name
Step onboarding_pincode
Step onboarding_village
Step onboarding_rate:  "Daily rate kitna chahiye? (₹100–5000)"
Step onboarding_skill: (buttons/numbered)
  → _finish_worker_onboard()
  → Auto-show jobs for pincode (list message)
```

### G5. After onboarding: auto-show results
- Customer → same as section D (worker list for their pincode)
- Worker → same as section F (job list for their pincode)
- No "MENU type karein" — results are shown immediately

### G6. Data written (same as today, no change)
- `users` collection: id, phone_primary (`+91XXXXXXXXXX`), name, role, address, source=whatsapp
- `workers` collection (worker only): id, user_id, name, skills, daily_rate, address

---

## H. Pincode Change Flow

### H1. Trigger
- Button reply with id `btn_change_pincode`
- Typed command `CHANGE PINCODE` or `PINCODE` (existing command kept as fallback)

### H2. Flow
```
Send text: "Kaunsa pincode dekhna hai? (6-digit pincode bhejein)"
State → change_pincode, save_as_default: false, role_context: "worker"|"customer"

On receiving 6-digit pincode:
  - Validate digits
  - lookup postalpincode.in
  - Show: "📍 {district}, {state}"
  - Send buttons:
    [btn_save_default]     Haan, default banao
    [btn_search_only]      Nahi, sirf search

State → change_pincode_save_ask, pending_pincode: "XXXXXX"

On btn_save_default:
  - Update worker.address.pincode (worker) or user.address.pincode (customer)
  - Confirm: "✅ Default pincode save ho gaya: XXXXXX"
  - → Show worker/job list for new pincode

On btn_search_only:
  - Do NOT update DB
  - → Show worker/job list for pincode (temporary search)
```

---

## I. "More Workers" / "More Jobs" Flow

- Button reply `btn_more_workers` or `btn_more_jobs`
- Loads next page (offset += 5) from `last_worker_results` / `last_job_results`
- Sends new list message
- Updates offset in session state
- If no more results: send text "Aur results nahi hain. Pincode change karein?"

---

## J. My Applications (Worker)

- Button reply `btn_my_applications` or typed `STATUS`
- Calls existing `_cmd_status()` logic (no change)
- Send as formatted text (no interactive needed here)

---

## K. Typed Command Fallback Compatibility

All existing typed commands remain fully functional as fallback:

| Typed command | Routes to |
|---------------|-----------|
| `JOBS` | F (worker job list) |
| `MENU` | D or F (role-aware greeting) |
| `HELP` | Help text (same as today) |
| `APPLY` | Apply to viewed_job |
| `WITHDRAW` | Cancel latest interest |
| `STATUS` | Show engagements |
| `PINCODE XXXXXX` | Set pincode + show results |
| `MORE` | Next page |
| `1`–`5` | Select from list |
| `ACCEPT` / `REJECT` | Booking response |

---

## L. Logging (Structured Per-Message)

Add at start of `_handle_message()`:
```python
logger.info(
    "WA_IN phone=***%s matched=%s role=%s flow=%s",
    source_phone[-4:],
    bool(user),
    state.get("role", "none"),
    state.get("state", "?")
)
```

Add after send:
```python
logger.info(
    "WA_OUT phone=***%s kind=%s chars=%d provider_id=%s",
    source_phone[-4:],
    outbound_kind,   # "text" | "buttons" | "list" | "fallback_text"
    len(reply_text),
    provider_response.get("messageId", "?")
)
```

Do not log full phone. Do not log API key.

---

## M. Database / Session Changes

### M1. New TTL index on `bot_sessions`
```python
await db.bot_sessions.create_index(
    "updated_at",
    expireAfterSeconds=2592000,  # 30 days
    background=True
)
```

Run once on app startup (idempotent — MongoDB ignores duplicate index creation).

### M2. Session document shape additions
Add `phone`, `last_worker_results`, `last_job_results`, `temp` to session writes.  
Old sessions missing these fields will get them on next save (graceful).

### M3. Worker pincode fallback chain
When reading a worker's "default pincode" for job search:
```python
pincode = (
    (worker.get("address") or {}).get("pincode") or
    (user.get("address") or {}).get("pincode") or
    user.get("pincode")
)
```

### M4. Customer pincode fallback chain
```python
pincode = (
    (user.get("address") or {}).get("pincode") or
    user.get("pincode")
)
```

### M5. Worker lat/lng issue
Workers onboarded via WhatsApp have `lat: 0.0, lng: 0.0`.  
**Short-term fix:** use pincode as primary filter in `_fetch_jobs_for_worker()` when worker lat/lng == 0.  
**Long-term:** geocode pincode on onboarding (out of scope for this PR).

---

## N. New Worker Search for Customer (`_fetch_workers_for_customer`)

New function that does NOT exist today:
```python
async def _fetch_workers_for_customer(pincode: str, category: Optional[str] = None) -> list[dict]:
    query = {"available": True, "address.pincode": pincode}
    if category:
        query["$or"] = [{"skills": {"$elemMatch": {"$regex": category, "$options": "i"}}},
                        {"structured_skills.skill": {"$regex": category, "$options": "i"}}]
    workers = await db.workers.find(query, {"_id": 0}).limit(10).to_list(10)
    return workers
```

---

## O. Test Script: `scripts/test_whatsapp_bot_flow.py`

Standalone script that posts fake Gupshup payloads to the local server.

Scenarios:
1. Registered customer sends "hi" → expect worker list auto-shown
2. Registered worker sends "hi" → expect job list auto-shown
3. Unregistered "hi" → expect role-selection buttons
4. Unregistered selects "Mujhe worker chahiye" → onboarding name prompt
5. Pincode change flow → worker → save/skip
6. Button reply payload: `{"type":"message","payload":{"type":"interactive","source":"91XXXX","payload":{"type":"button_reply","payload":{"id":"btn_change_pincode","title":"Change Pincode"}}}}`
7. List reply payload: same shape with `list_reply`

Usage:
```bash
python scripts/test_whatsapp_bot_flow.py --phone 919654945155 --scenario customer_hi
```

---

## P. Implementation Order (for Codex)

1. **Phone normalization** — replace `_normalize_phone` / `_full_phone` with single `normalize_phone()`. Update `_lookup_user_by_phone()` to use `$in` not regex.

2. **Interactive message senders** — add `_send_gupshup_buttons()` and `_send_gupshup_list()` with fallback logic.

3. **Inbound interactive parsing** — update `_extract_gupshup_incoming()` to handle button/list replies, extracting `id` as message text.

4. **Session TTL index** — add to app startup.

5. **Registered customer "hi" flow** — update handler to auto-fetch workers by pincode, send list + buttons.

6. **Registered worker "hi" flow** — update handler to auto-fetch jobs by pincode, send list + buttons.

7. **Unregistered onboarding** — change opening message to buttons, add auto-show after finish.

8. **Pincode change flow** — add `change_pincode` and `change_pincode_save_ask` state handlers.

9. **Worker detail + Send Request** — customer selects worker, show detail, send booking.

10. **Job detail + Apply** — worker selects job, show detail, APPLY sends engagement.

11. **New customer worker search** — `_fetch_workers_for_customer()` by pincode.

12. **Structured logging** — add per-message WA_IN / WA_OUT log lines.

13. **Test script** — `scripts/test_whatsapp_bot_flow.py`.

---

## Q. Success Criteria

- [ ] Registered customer sends "hi" → worker list for default pincode shown automatically (no MENU required)
- [ ] Registered worker sends "hi" → job list for default pincode shown automatically (no JOBS required)
- [ ] Unregistered user sends "hi" → role selection buttons appear (not numbered text)
- [ ] Customer and worker can change pincode through "Change Pincode" button
- [ ] Worker/job list sends as WhatsApp list message (not numbered text) when Gupshup accepts
- [ ] Reply buttons appear correctly in real WhatsApp
- [ ] Fallback to numbered text when Gupshup rejects interactive
- [ ] All existing typed commands (JOBS, MENU, APPLY, etc.) still work
- [ ] WhatsApp onboarding creates records in same `users`/`workers` collections as mobile/web
- [ ] Profile pincode updated via WhatsApp is visible in mobile/web app
- [ ] No primary flow asks user to type 1/2/3
- [ ] Sessions expire after 30 days
- [ ] Logs show phone masked to last 4 digits

---

## R. Out of Scope (Phase 2)

- In-WhatsApp job posting by customer (full `customer_post_job_*` flow)
- Geocoding pincode to lat/lng for haversine distance display
- Rating via WhatsApp
- Multi-language support toggle via WhatsApp
- Media messages (images of workers/jobs)
- OTP-based WhatsApp login
