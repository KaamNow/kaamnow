# WhatsApp E2E QA Report

**Date:** 2026-05-16  
**Domain:** https://kaamnow.com  
**Webhook URL:** https://kaamnow.com/api/whatsapp/gupshup  
**Mode tested from this environment:** Public HTTP webhook checks + local unit/syntax verification  
**Real WhatsApp app test status:** Not executed from this environment; registered customer/worker/unregistered test phones were not provided.  
**Production log access status:** Not available from this environment; `kubectl` is not installed.  
**Gupshup source number:** Not verified here. Local shell has no visible `GUPSHUP_SOURCE` env var. Do not infer production env from this local shell.  
**Gupshup env vars:** Not verified in cluster because `kubectl` is unavailable. Local shell did not expose `GUPSHUP_API_URL`, `GUPSHUP_API_KEY`, `GUPSHUP_SOURCE`, or `GUPSHUP_APP_ID`.

## 1. Environment

| Item | Value |
|---|---|
| Public domain | `https://kaamnow.com` |
| Callback URL checked | `https://kaamnow.com/api/whatsapp/gupshup` |
| Test date | 2026-05-16 |
| Tester phone types | Not available in this environment |
| Sandbox/live/proxy mode | Not confirmed |
| Backend logs | Blocked: `kubectl` command not found |
| Local regression tests | Passed: `53 passed` |

## 2. Test Results

| Test ID | Scenario | Expected | Actual | Pass/Fail | Notes |
|---|---|---|---|---|---|
| 1A | `GET /api/whatsapp/gupshup` | HTTP 200 empty body | HTTP/2 200, `content-length: 0` | Pass | Verified with `curl -i` |
| 1B | `HEAD /api/whatsapp/gupshup` | HTTP 200 empty body | HTTP/2 200, `content-length: 0` | Pass | Verified with `curl -I` |
| 1C | `OPTIONS /api/whatsapp/gupshup` | HTTP 200 empty body | HTTP/2 200, `content-length: 0` | Pass | Verified with `curl -i -X OPTIONS` |
| 2 | Gupshup `sandbox-start` user-event | HTTP 200 empty body | HTTP/2 200, `content-length: 0` | Pass | Verified with provided JSON payload |
| 3 | Registered customer `hi` | Show workers from saved pincode with buttons/list | Not executed | Blocked | Requires real registered customer WhatsApp phone |
| 4 | Customer change pincode | Ask for pincode, then show workers | Not executed | Blocked | Requires real registered customer WhatsApp phone |
| 5 | Customer worker selection | Show worker detail + Send Request buttons | Not executed | Blocked | Requires real registered customer WhatsApp phone |
| 6 | Customer booking request | Create existing engagement/customer booking request | Not executed | Blocked | Requires real customer with open jobs and app/dashboard validation |
| 7 | Registered worker `hi` | Show jobs from saved pincode with buttons/list | Not executed | Blocked | Requires real registered worker WhatsApp phone |
| 8 | Worker change pincode | Ask for pincode, then show jobs | Not executed | Blocked | Requires real registered worker WhatsApp phone |
| 9 | Worker job selection | Show job detail + Apply buttons | Not executed | Blocked | Requires real registered worker WhatsApp phone |
| 10 | Worker apply | Create existing engagement/application | Not executed | Blocked | Requires real worker and customer dashboard validation |
| 11 | Worker My Applications / Status | Show grouped applications or empty state | Not executed | Blocked | Requires real registered worker WhatsApp phone |
| 12 | Worker withdraw | Confirm and cancel pending application | Not executed | Blocked | Requires worker with pending application |
| 13 | Unregistered onboarding | Role choice buttons and onboarding | Not executed | Blocked | Requires unregistered WhatsApp phone |
| 14 | Alias testing | Common aliases route cleanly | Not executed in real WhatsApp | Partial | Covered by local automated tests, not live app |
| 15 | Interactive rendering | Buttons/lists render, no raw JSON | Not executed | Blocked | Requires real WhatsApp app and configured number |
| 16 | Proxy bot caveat | Real app is source of truth | Not applicable | Not run | No proxy/live app session available |

## 3. Bugs Found

### BUG-001

**Severity:** Blocker for launch readiness  
**Area:** Real WhatsApp E2E coverage  
**Steps to reproduce:** Attempt to complete WA-6 from this environment without registered/unregistered test phones and without production log access.  
**Expected:** Real WhatsApp app tests for customer, worker, and unregistered phones; logs confirming inbound routing and Gupshup provider responses.  
**Actual:** Only public webhook HTTP behavior and local regression tests could be verified. Real WhatsApp interaction was not executable here.  
**Logs:** `kubectl` unavailable: `kubectl not found`.  
**Suggested fix:** Run manual WhatsApp test matrix with at least one registered customer phone, one registered worker phone, and one unregistered phone; provide production log access or exported logs.

### BUG-002

**Severity:** Medium  
**Area:** QA environment tooling  
**Steps to reproduce:** Run `kubectl -n kaamnow logs deploy/backend --tail=200`.  
**Expected:** Recent backend logs available.  
**Actual:** Shell returned `zsh:1: command not found: kubectl`.  
**Logs:** `which kubectl` returned `kubectl not found`.  
**Suggested fix:** Install/configure `kubectl`, or provide logs from the deployment platform for the exact test window.

No application code bugs were confirmed during this WA-6 pass.

## 4. Data Sync Validation

| Sync Check | Result | Notes |
|---|---|---|
| WhatsApp-created customer appears in mobile/web | Not verified | Requires real unregistered customer onboarding from WhatsApp |
| WhatsApp-created worker appears in mobile/web | Not verified | Requires real unregistered worker onboarding from WhatsApp |
| WhatsApp booking appears in customer/worker dashboards | Not verified | Requires real customer booking flow |
| WhatsApp application appears in customer/worker dashboards | Not verified | Requires real worker apply flow |
| Mobile/web pincode changes are used by WhatsApp bot next time | Not verified | Requires app-side profile edit plus WhatsApp retest |

## 5. Gupshup Interactive Validation

| Check | Result | Notes |
|---|---|---|
| Reply buttons submitted | Not verified live | Requires real inbound flow or live send with configured Gupshup env |
| Reply buttons render in WhatsApp | Not verified | Requires real WhatsApp app |
| List messages submitted | Not verified live | Requires real inbound flow or live list test |
| List messages render in WhatsApp | Not verified | Requires real WhatsApp app |
| Raw JSON absent | Not verified live | Local code/tests cover payload shape, but real app must confirm |
| Fallback triggered | Not observed | No live interactive provider call executed here |

## 6. Commands Run

```bash
curl -i https://kaamnow.com/api/whatsapp/gupshup
curl -I https://kaamnow.com/api/whatsapp/gupshup
curl -i -X OPTIONS https://kaamnow.com/api/whatsapp/gupshup
curl -i -X POST https://kaamnow.com/api/whatsapp/gupshup \
  -H "Content-Type: application/json" \
  -d '{"app":"KaamNow","timestamp":1778872532450,"version":2,"type":"user-event","payload":{"phone":"callbackSetPhone","type":"sandbox-start"}}'
which kubectl
python -m py_compile backend/routers/whatsapp.py scripts/test_whatsapp_bot_flow.py scripts/test_gupshup_interactive.py
pytest tests/test_whatsapp.py -q
```

## 7. Local Regression Results

```text
53 passed, 2 warnings
```

`python -m py_compile` completed with no output/errors.

## 8. Final Decision

**Decision:** NOT READY

**Reason:** Public webhook validation passes and local tests pass, but launch readiness requires real WhatsApp app verification. The following launch-blocking checks remain unverified:

- Buttons render in real WhatsApp.
- Lists render in real WhatsApp, if enabled.
- Registered customer `hi` flow works live.
- Registered worker `hi` flow works live.
- Unregistered onboarding works live.
- Customer booking can be created live and syncs to app/web.
- Worker apply can be created live and syncs to app/web.
- Production logs show expected flow/provider status during live tests.

## 9. Manual Steps Still Pending

Run these from real WhatsApp phones:

1. Registered customer sends `hi`.
2. Customer taps `Change Pincode`, sends `841219`.
3. Customer selects worker and taps `Send Request`.
4. Confirm customer/worker dashboards show request.
5. Registered worker sends `hi`.
6. Worker taps `Change Pincode`, sends `841219`.
7. Worker selects job and taps `Apply`.
8. Confirm worker/customer dashboards show application.
9. Worker taps `My Applications`.
10. Worker runs `WITHDRAW` and confirms.
11. Unregistered phone sends `hi` and completes customer onboarding.
12. Unregistered phone sends `hi` and completes worker onboarding, using a separate phone if possible.
13. Send aliases: `Hii`, `Namaste`, `Find Jobs`, `My Applications`, `Change Pincode`, `More Jobs`, `More Workers`.

## 10. WA-6A Worker Flow Test — 917903770969

**Date/time:** 2026-05-16 12:06:35 UTC  
**Environment:** `https://kaamnow.com`, Kubernetes namespace `kaamnow`, backend deployment `backend`  
**EC2 host:** `13.207.54.156`  
**Gupshup WhatsApp number:** `+91 78348 11114`  
**Worker phone under test:** `917903770969`  
**Expected role:** `worker`  
**Expected default pincode:** `800001`  
**Actual DB result:** Blocked by test data mismatch.

### Infrastructure Checks

| Check | Actual | Result |
|---|---|---|
| SSH to EC2 | Successful after setting `KaamNow-KeyPair.pem` permissions to `0600` | Pass |
| Project directory | `/home/ubuntu/kaamnow` exists | Pass |
| Kubernetes access | Plain `kubectl` had no context; generated kind kubeconfig with `sudo kind get kubeconfig --name kaamnow > /tmp/kaamnow-kubeconfig` | Pass after workaround |
| Pods | `backend-87dcb97cd-tjrs4 1/1 Running`, `frontend 1/1 Running`, `mongodb-0 1/1 Running` | Pass |
| Backend deployment | `backend 1/1 available` | Pass |
| Gupshup env vars | `GUPSHUP_API_URL`, `GUPSHUP_API_KEY`, `GUPSHUP_SOURCE`, `GUPSHUP_APP_ID` all set in backend pod | Pass |
| Webhook GET | HTTP/2 200, empty body | Pass |
| Webhook HEAD | HTTP/2 200, empty body | Pass |
| Webhook OPTIONS | HTTP/2 200, empty body | Pass |

### DB Verification

Queried database: `kaamnow_db`.

Phone variants checked:

```text
917903770969
+917903770969
7903770969
```

User query result:

```json
{
  "id": "e8acb9e0-c99b-4d2e-bcc9-ea298fc71484",
  "name": "Faiza Tahreen",
  "role": "customer",
  "phone": "7903770969"
}
```

Worker query result:

```text
No worker profile found for this user/phone, and no worker profile found with pincode 800001 in the checked query.
```

Jobs in pincode `800001`:

```json
{
  "jobs800001": 0
}
```

### WA-6A Test Matrix

| Step | Scenario | Expected | Actual | Result | Notes |
|---|---|---|---|---|---|
| 1 | Connect to EC2 | SSH works | SSH works after PEM chmod | Pass | `chmod 600 KaamNow-KeyPair.pem` applied locally |
| 2 | Confirm backend pods | Backend pod Running/Ready | Backend pod `1/1 Running` | Pass | Used kind kubeconfig workaround |
| 3 | Webhook health | GET/HEAD/OPTIONS 200 empty | All 200 empty | Pass | Verified from EC2 |
| 4 | Start/inspect logs | Backend logs available | Logs accessible via `KUBECONFIG=/tmp/kaamnow-kubeconfig kubectl ... logs` | Pass | No live WhatsApp worker event observed |
| 5 | Verify worker exists | Phone maps to worker user | Phone maps to `role=customer` | Fail | Test identity data mismatch |
| 6 | Verify jobs in `800001` | At least one open/available job | `jobs800001: 0` | Fail | Test job data missing |
| 7 | Real WhatsApp `hi` | Worker job list from `800001` | Not executed | Blocked | Would not be valid because DB role is customer and jobs are absent |
| 8 | Select job | Job detail shown | Not executed | Blocked | No jobs in pincode |
| 9 | Apply | Engagement created | Not executed | Blocked | No valid worker/job setup |
| 10 | Verify engagement | New pending engagement | Not executed | Blocked | Apply not run |
| 11 | My Applications | Pending application visible | Not executed | Blocked | Apply not run |
| 12 | Duplicate apply | Duplicate prevented | Not executed | Blocked | Apply not run |

### Logs Summary

Recent filtered backend logs showed:

```text
GET /api/whatsapp/gupshup 200 OK
HEAD /api/whatsapp/gupshup 200 OK
OPTIONS /api/whatsapp/gupshup 200 OK
Gupshup OTP requests returning HTTP 202 submitted
```

No live WhatsApp inbound worker-flow log was observed for phone `917903770969` during this pass.

### Bugs Found

#### WA6A-BUG-001

**Severity:** Blocker for this worker E2E test  
**Area:** Test data / account role  
**Steps to reproduce:** Query `kaamnow_db.users` for `917903770969`, `+917903770969`, or `7903770969`.  
**Expected:** Registered worker user with default pincode `800001`.  
**Actual:** Found `Faiza Tahreen` with `role=customer` and `phone=7903770969`.  
**Suggested fix:** Update/provide a real registered worker phone, or convert/create the intended test worker account in existing app collections before rerunning WA-6A.

#### WA6A-BUG-002

**Severity:** Blocker for this worker E2E test  
**Area:** Test job data  
**Steps to reproduce:** Query `kaamnow_db.jobs` for `pincode=800001` or `address.pincode=800001`.  
**Expected:** At least one open/available dummy job.  
**Actual:** `0` jobs found.  
**Suggested fix:** Seed at least one open job in pincode `800001` using the normal app/admin flow, then rerun WA-6A.

### DB/Data Sync Verification

| Check | Result | Notes |
|---|---|---|
| Worker profile exists for test phone | Fail | Phone maps to customer user |
| Jobs exist in pincode `800001` | Fail | Count is 0 |
| Engagement created | Not verified | Blocked before WhatsApp apply |
| Worker dashboard sync | Not verified | No engagement created |
| Customer dashboard sync | Not verified | No engagement created |

### Final WA-6A Decision

**Decision:** BLOCKED

Worker WhatsApp flow cannot be truthfully marked pass/fail because the configured test phone and test pincode do not satisfy the prerequisites:

1. `917903770969` is currently a customer account, not a worker account.
2. No jobs were found in pincode `800001`.

No application code changes were made for WA-6A.

## WA-6A Data Reconciliation + Worker Flow Retest

### Environment

| Item | Value |
|---|---|
| Test date/time | 2026-05-16 17:43 IST |
| Domain | `https://kaamnow.com` |
| Webhook URL | `https://kaamnow.com/api/whatsapp/gupshup` |
| Kubernetes namespace | `kaamnow` |
| Backend deployment | `backend` |
| Mongo database used by backend | `kaamnow_db` |
| Test phone variants | `+917903770969`, `917903770969`, `7903770969` |
| Expected role/pincode | `worker`, `841215` |

### Data Reconciliation Results

| Check | Expected | Actual | Result |
|---|---|---|---|
| Backend DB config | Production backend uses known DB | `DB_NAME=kaamnow_db`; `MONGO_URL` is set but DB path is not exposed in safe env print | Pass |
| Matching users by exact phone variants | Worker user for Faiza Tahreen | One matching user found in `kaamnow_db.users`, but role is `customer` | Fail |
| Duplicate users for same phone variants | Determine if duplicate customer/worker records exist | No duplicate user found by exact phone variants or broad Faiza/phone regex search | Pass |
| Canonical worker user | Worker user with phone `+917903770969` | Not found | Fail |
| Existing matching user | N/A | `id=e8acb9e0-c99b-4d2e-bcc9-ea298fc71484`, `name=Faiza Tahreen`, `role=customer`, `phone=7903770969` | Data issue |
| Worker profile | Worker profile linked by phone/name/pincode `841215` | No matching worker profile found | Fail |
| Jobs in worker pincode | At least one open/available job in `841215` | `0` jobs found in `kaamnow_db.jobs` for `pincode` or `address.pincode` = `841215` | Fail |
| Real WhatsApp retest | Run worker `hi -> select job -> Apply -> My Applications` | Not run | Blocked |

### Mongo Evidence

Matching user in `kaamnow_db.users`:

```json
{
  "_id": "69ef7e6726430c88e991ed65",
  "id": "e8acb9e0-c99b-4d2e-bcc9-ea298fc71484",
  "name": "Faiza Tahreen",
  "role": "customer",
  "phone": "7903770969",
  "created_at": "2026-04-27T15:19:03.370635+00:00"
}
```

Counts:

```text
kaamnow_db.users exact phone matches: 1
kaamnow_db.workers matches by phone/name/pincode 841215: 0
kaamnow_db.jobs in pincode 841215: 0
kaamnow.users exact phone matches: 0
kaamnow.workers matches by phone/name/pincode 841215: 0
kaamnow.jobs in pincode 841215: 0
```

### Logs Summary

Filtered backend logs were reachable. Recent logs showed webhook health traffic and app API traffic, including worker/profile, workers/search, jobs/feed, and engagements/mine requests. No live inbound WhatsApp worker-flow event for `+917903770969` was observed during this data-fix pass.

### Bugs / Data Issues Found

#### WA6A-DATA-001

**Severity:** Blocker  
**Area:** Production user data  
**Issue:** Expected worker record for `+917903770969` is absent from production MongoDB. The only exact phone match is `Faiza Tahreen` as `role=customer` with `phone=7903770969`.  
**Impact:** WhatsApp lookup cannot route this phone to the registered worker flow.  
**Recommended fix:** Decide the canonical account for this phone. If this phone should be a worker, repair/create the worker user through the existing app data model and ensure phone fields include the canonical variant used by WhatsApp lookup.

#### WA6A-DATA-002

**Severity:** Blocker  
**Area:** Worker profile data  
**Issue:** No worker profile was found by phone variants, name `Faiza`, or pincode `841215`.  
**Impact:** Even if the user role were corrected, worker-specific job/apply flows need a linked worker profile.  
**Recommended fix:** Create or repair the worker profile linked to the canonical worker user in the existing `workers` collection.

#### WA6A-DATA-003

**Severity:** Blocker  
**Area:** Test job data  
**Issue:** No jobs exist in pincode `841215`.  
**Impact:** Worker `hi` cannot show pincode-matched jobs for this test case.  
**Recommended fix:** Seed at least one open/available job in `841215` using the existing app/admin path before rerunning WA-6A.

### Final WA-6A Data-Fix Decision

**Decision:** BLOCKED

No WhatsApp bot code was changed. No MongoDB records were modified or deleted. The worker E2E retest remains blocked until production data has:

1. A canonical worker user for `+917903770969`.
2. A linked worker profile with pincode `841215`.
3. At least one open/available job in pincode `841215`.
