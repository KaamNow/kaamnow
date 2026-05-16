# DATA-RESET-INVESTIGATION

## Summary

Date/time: 2026-05-16 IST  
Environment: production `https://kaamnow.com`  
Kubernetes namespace: `kaamnow`  
Backend deployment: `backend`  
Mongo pod: `mongodb-0`

This investigation was read-only. No MongoDB records were modified or deleted.

## A. Actual Backend DB Name

Production backend environment, with secrets masked:

```text
MONGO_URL=SET dbpart=unknown
DB_NAME=kaamnow_db
```

Code path:

- [backend/config.py](/Users/amirsubhani/Documents/KaamNow/kaamnow/backend/config.py): loads `MONGO_URL` and `DB_NAME`.
- [backend/db.py](/Users/amirsubhani/Documents/KaamNow/kaamnow/backend/db.py): uses `client[settings.db_name]`.

Conclusion: backend uses Mongo DB `kaamnow_db`.

Mongo DBs present:

```text
admin
config
kaamnow_db
local
```

There is no populated `kaamnow` DB.

## B. Seed Behavior

Startup path:

- [backend/app.py](/Users/amirsubhani/Documents/KaamNow/kaamnow/backend/app.py): calls `await seed_data()` on every backend startup.

Seed file:

- [backend/seed.py](/Users/amirsubhani/Documents/KaamNow/kaamnow/backend/seed.py)

What `seed_data()` does:

| Data | Behavior |
|---|---|
| Indexes | Ensures indexes every startup |
| Admin | Inserts admin only if no user exists with `phone_primary=settings.admin_phone` |
| Demo customer | Inserts one demo customer only if no user with `role=customer` exists |
| Workers | Inserts seed worker profiles only if `workers` collection is empty |
| Jobs | Inserts seed jobs only if `jobs` collection is empty |
| Bookings/engagements | Does not seed normal booking/engagement test data |
| Bot sessions | Only indexes `bot_sessions`; does not clear sessions |

Important seed caveats:

- Seed workers are inserted directly into `workers` with random `user_id` values. The seed worker loop does not create matching `users` documents.
- Seed jobs use five hardcoded seed pincodes: `230001`, `442001`, `842001`, `461001`, `342001`.
- Seed does not create jobs in `841215` or `800001`.
- Seed will not fix existing duplicate phone users because it only inserts when broad conditions are empty.
- Restarting backend will run seed again, but current non-empty collections mean it will not reseed workers/jobs.

## C. Current Users For Target Phones

Target worker phone variants:

```text
+917903770969
917903770969
7903770969
```

Target customer phone variants:

```text
+919654945155
919654945155
9654945155
```

Current matching users in `kaamnow_db.users`:

| Phone group | User ID | Name | Role | Phone fields | Pincode/address |
|---|---|---|---|---|---|
| `917903770969` / `7903770969` | `e8acb9e0-c99b-4d2e-bcc9-ea298fc71484` | Faiza Tahreen | `customer` | `phone=7903770969` | none |
| `919654945155` / `9654945155` | `6ba4ccb7-b550-4a68-93f9-3814f0d074bc` | Amir Subhani | `customer` | `phone=9654945155` | none |
| `919654945155` / `9654945155` | `ffe302c7-7488-408a-9256-73fbbd4f88ca` | Prabhat Kumar | `worker` | `phone=9654945155` | address pincode `null` |
| `919654945155` / `9654945155` | `21b41495-0545-4bfe-b54f-18655ab4c718` | testworker | `worker` | `phone=9654945155` | address pincode `841219` |

Role counts in `kaamnow_db.users`:

```text
worker: 9
customer: 7
admin: 1
```

Findings:

- `917903770969` is not currently usable as a worker because it maps to a customer user.
- `919654945155` has duplicate/conflicting user records across customer and worker roles.
- There is no duplicate user for `917903770969`; the problem is that the only matching record has the wrong role for the intended test.

## D. Current Worker/Customer Profiles

There is no `customers` collection in production. Customer profiles appear to live in `users`.

Target worker profile check:

```text
workers matching 917903770969 / 7903770969 / pincode 841215: 0
```

Worker profiles linked to target customer phone `9654945155` user records:

| Worker ID | User ID | Name | Pincode | Rate | Available |
|---|---|---|---|---|---|
| `9c5d3cda-1fb2-448c-b2b0-666548fa64fb` | `21b41495-0545-4bfe-b54f-18655ab4c718` | testworker | `841219` | 350 | true |
| `c5cc1804-3799-44f3-9f24-8d14bce689e7` | `ffe302c7-7488-408a-9256-73fbbd4f88ca` | Prabhat Kumar | `null` | 600 | true |

Findings:

- No worker profile exists for intended worker phone `917903770969`.
- Worker profiles exist for two duplicate worker users that share the intended customer phone `9654945155`.

## E. Jobs Count By Pincode

Checked `kaamnow_db.jobs` for:

```text
841215
800001
```

Results:

```text
841215=0
800001=0
```

Production collection counts:

```text
users=17
workers=23
jobs=8
bookings=4
engagements=3
bot_sessions=22
```

Finding: test jobs needed for worker E2E do not exist in either intended pincode.

## F. Bot Sessions

Collections checked:

| Collection | Exists | Target-phone stale sessions |
|---|---:|---|
| `bot_sessions` | yes | none found for target phone/session regex |
| `whatsapp_sessions` | no | n/a |
| `sessions` | no | n/a |

Recent `bot_sessions` examples use anonymous/demo session IDs like:

```text
wa-xc5d0n9z5v
wa-zqgid281bf
wa-e60lxa8p04
test-session
```

Current WhatsApp webhook code creates real WhatsApp session IDs as:

```text
whatsapp-<full_phone_digits>
```

No stale target sessions were found for:

```text
7903770969
917903770969
9654945155
919654945155
```

Finding: stale `bot_sessions` do not appear to be the cause of the wrong role mapping.

## G. Auth Sessions / Tokens / Cookies

Backend auth accepts token from:

1. HttpOnly cookie named `access_token`.
2. `Authorization: Bearer <token>` header.

Web frontend:

- Stores JWT in `localStorage` key `kn_token`.
- Also calls `/auth/logout`, which clears backend cookie `access_token`.

Mobile app:

- Stores JWT in Expo SecureStore key `kn_token`.
- Sends it as `Authorization: Bearer <token>`.
- No browser cookies on mobile.

Impact:

- Old web/mobile auth tokens can make the app show the wrong logged-in role even after DB changes.
- Old auth tokens do not explain WhatsApp role mismatch, because the Gupshup webhook identifies users by phone lookup, not browser/mobile auth state.

How to clear web session:

```js
localStorage.removeItem("kn_token")
localStorage.removeItem("kn_lang")
sessionStorage.clear()
document.cookie = "access_token=; Max-Age=0; path=/"
```

Then reload `https://kaamnow.com` or log out through the UI.

How to clear mobile session:

- Use the app logout button, or uninstall/reinstall the Expo app.
- For development builds, clear Expo app data.
- The important key is SecureStore `kn_token`.

## H. Why The Data Looks Inconsistent

Most likely causes:

1. Multiple signups were performed with the same phone `9654945155`, creating customer and worker users because phone uniqueness is not enforced consistently across the `phone` field.
2. The unique sparse index is on `phone_primary`, but current records often use `phone`, so duplicates can exist.
3. `seed_data()` runs on startup but does not normalize or repair existing data.
4. `seed_data()` does not create the expected test worker `917903770969` or test jobs in `841215`.
5. Stale app auth tokens may cause the UI to remain logged in as an old role, but they are not the root cause of WhatsApp phone-role lookup.

## I. Is Full DB Drop Safe?

Not safe as the first option.

Reasons:

- Production has real-looking users, bookings, engagements, workers, and jobs.
- `seed_data()` only creates limited demo data and does not recreate all current data.
- Seed worker profiles are not linked to real user documents.
- Dropping the DB would remove admin logs, notifications, bookings, engagements, bot sessions, OTP records, and real test/user data unless backed up and intentionally restored.

Full DB drop should only be considered after a verified backup and a decision that all production data can be lost or recreated.

## J. Recommended Safe Reset Plan

Do not execute without approval.

### 1. Backup first

Run from EC2:

```bash
KUBECONFIG=/tmp/kaamnow-kubeconfig kubectl -n kaamnow exec mongodb-0 -- mongodump --db kaamnow_db --archive=/tmp/kaamnow_db_before_reset.archive
KUBECONFIG=/tmp/kaamnow-kubeconfig kubectl -n kaamnow cp mongodb-0:/tmp/kaamnow_db_before_reset.archive ./kaamnow_db_before_reset.archive
```

Optional verify:

```bash
ls -lh ./kaamnow_db_before_reset.archive
```

### 2. Clear only target test identity conflicts

Preferred: do not clear broad app data. Remove or repair only the target phone records after deciding canonical ownership.

Recommended canonical intent:

| Phone | Canonical role |
|---|---|
| `+917903770969` / `917903770969` / `7903770969` | worker |
| `+919654945155` / `919654945155` / `9654945155` | customer |

Before deleting anything, export the target docs:

```bash
KUBECONFIG=/tmp/kaamnow-kubeconfig kubectl -n kaamnow exec -i mongodb-0 -- mongoexport --db kaamnow_db --collection users --query '{"$or":[{"phone":{"$in":["7903770969","9654945155"]}},{"phone_primary":{"$in":["+917903770969","917903770969","7903770969","+919654945155","919654945155","9654945155"]}}]}' --out /tmp/target_users_before_reset.json
```

Then decide whether to merge, delete, or mutate the conflicting records.

### 3. Clear bot sessions for both phones

After identity records are fixed:

```javascript
db.bot_sessions.deleteMany({
  session_id: /7903770969|917903770969|9654945155|919654945155/
})
```

### 4. Clear app/web/mobile auth sessions

Web browser console:

```js
localStorage.removeItem("kn_token")
sessionStorage.clear()
document.cookie = "access_token=; Max-Age=0; path=/"
```

Mobile:

- Log out in app.
- If behavior remains stale, uninstall/reinstall or clear app data.

### 5. Recreate canonical test accounts through existing app APIs/UI

Use the normal registration flow or admin-safe script:

- Register `917903770969` as worker.
- Register `919654945155` as customer.
- Ensure both use consistent phone storage, ideally `phone_primary` canonicalized.
- Ensure worker profile for `917903770969` has pincode `841215`.

### 6. Seed dummy jobs in worker pincode

Use existing customer job-posting flow or a reviewed admin script to create at least one open job in:

```text
841215
```

### 7. Restart backend only if needed

Restarting backend will rerun `seed_data()`, but it will not repair these target records if collections are non-empty.

```bash
KUBECONFIG=/tmp/kaamnow-kubeconfig kubectl -n kaamnow rollout restart deploy/backend
KUBECONFIG=/tmp/kaamnow-kubeconfig kubectl -n kaamnow rollout status deploy/backend
```

### 8. Rerun WA-6A

After data is clean:

1. Worker `+917903770969` sends `hi`.
2. Confirm role `worker`, pincode `841215`.
3. Select job.
4. Tap Apply.
5. Verify new engagement.
6. Verify duplicate apply is prevented.

## Final Recommendation

Do not drop the full DB yet. The safer fix is a targeted test-data reconciliation:

1. Backup `kaamnow_db`.
2. Resolve duplicate/conflicting phone records.
3. Create one canonical worker and one canonical customer.
4. Clear target bot sessions and client auth sessions.
5. Seed one or more open jobs in `841215`.
6. Rerun WhatsApp worker E2E.

---

# TEST-DB-RESET

Date/time: 2026-05-16 IST  
Requested scope: reset test application DB `kaamnow_db`, reseed baseline, prepare for manual registration.

## Commands Run

### Confirm backend DB env

```bash
KUBECONFIG=/tmp/kaamnow-kubeconfig kubectl -n kaamnow exec deploy/backend -- sh -lc 'printenv | grep -Ei "DB_NAME|MONGO|ADMIN_PHONE" | ...masked...'
```

Observed:

```text
MONGO_URL=SET dbpart=unknown
DB_NAME=kaamnow_db
```

Follow-up safe runtime inspection showed the actual backend connection is Atlas:

```text
mongo_url mongodb+srv://***@cluster0.dduibsm.mongodb.net/?appName=Cluster0
db_name kaamnow_db
db_object_name kaamnow_db
admin_phone_set False
```

### Inspect in-cluster Mongo pod before reset

```bash
KUBECONFIG=/tmp/kaamnow-kubeconfig kubectl -n kaamnow exec -i mongodb-0 -- mongosh kaamnow_db --quiet
```

Before reset, the in-cluster `mongodb-0` copy had:

```text
bookings: 4
bot_sessions: 22
engagements: 3
jobs: 8
users: 17
workers: 23
```

### Backup in-cluster Mongo pod DB

```bash
backup=/tmp/kaamnow_backup_$(date +%Y%m%d_%H%M%S)
KUBECONFIG=/tmp/kaamnow-kubeconfig kubectl -n kaamnow exec mongodb-0 -- mongodump --db kaamnow_db --out $backup
KUBECONFIG=/tmp/kaamnow-kubeconfig kubectl -n kaamnow exec mongodb-0 -- ls -lah /tmp | grep kaamnow_backup
```

Backup path:

```text
/tmp/kaamnow_backup_20260516_122959
```

Dump contents:

```text
workers: 23 documents
bot_sessions: 22 documents
users: 17 documents
jobs: 8 documents
bookings: 4 documents
engagements: 3 documents
```

### Drop in-cluster Mongo pod DB

```bash
KUBECONFIG=/tmp/kaamnow-kubeconfig kubectl -n kaamnow exec -i mongodb-0 -- mongosh kaamnow_db --quiet
db.dropDatabase()
db.getCollectionNames()
```

Result:

```json
{ "ok": 1, "dropped": "kaamnow_db" }
[]
```

Important finding: after this drop, public API stats still showed populated data. That proved the backend is not using `mongodb-0`; it is using Atlas via `MONGO_URL`.

### Backup actual backend Atlas DB

Because `mongodump` is not available in the backend pod, a JSON backup was exported through the backend pod using its live Mongo connection.

```bash
backup=/tmp/kaamnow_atlas_backup_$(date +%Y%m%d_%H%M%S).json
KUBECONFIG=/tmp/kaamnow-kubeconfig kubectl -n kaamnow exec deploy/backend -- sh -lc 'python - <<PY ... export all collections with bson.json_util ... PY' > $backup
ls -lh $backup
```

Backup path on EC2:

```text
/tmp/kaamnow_atlas_backup_20260516_123738.json
```

Backup size:

```text
375K
```

Actual backend Atlas DB before reset:

```text
admin_logs: 4
bookings: 0
bot_sessions: 42
deactivation_log: 5
engagements: 18
jobs: 125
notifications: 58
otps: 3
users: 190
wa_notif_log: 0
workers: 124
```

Target phone records before Atlas reset:

```text
[]
```

### Drop actual backend Atlas DB

```bash
KUBECONFIG=/tmp/kaamnow-kubeconfig kubectl -n kaamnow exec deploy/backend -- sh -lc 'python - <<PY
import asyncio
from backend.db import client, db
from backend.config import settings
async def main():
    print("dropping", settings.db_name)
    await client.drop_database(settings.db_name)
    names = await db.list_collection_names()
    print("collections_after_drop", names)
asyncio.run(main())
PY'
```

Result:

```text
dropping kaamnow_db
collections_after_drop []
```

### Restart backend so seed runs

```bash
KUBECONFIG=/tmp/kaamnow-kubeconfig kubectl -n kaamnow rollout restart deployment/backend
KUBECONFIG=/tmp/kaamnow-kubeconfig kubectl -n kaamnow rollout status deployment/backend --timeout=180s
KUBECONFIG=/tmp/kaamnow-kubeconfig kubectl -n kaamnow get pods
```

Result:

```text
deployment "backend" successfully rolled out
backend-b7fbbcf8c-znv52 1/1 Running
frontend-64d5d8fcc4-5fqbn 1/1 Running
mongodb-0 1/1 Running
```

### Check backend logs after reseed

```bash
KUBECONFIG=/tmp/kaamnow-kubeconfig kubectl -n kaamnow logs deploy/backend --tail=100
```

Relevant log lines:

```text
OTP service initialized — WhatsApp: LIVE (Gupshup)
Seed data loaded.
Engagement expiry background task started.
Weekly analytics background task started.
Application startup complete.
```

## Seed Result After Actual Backend Reset

Actual backend Atlas `kaamnow_db` after restart:

```text
bookings: 0
bot_sessions: 0
engagements: 0
jobs: 5
notifications: 0
users: 2
wa_notif_log: 0
workers: 18
```

Public API stats after reset:

```json
{"workers":18,"jobs":5,"completed_bookings":0,"villages":5}
```

Seeded job pincodes:

```text
230001: 1
342001: 1
442001: 1
461001: 1
842001: 1
```

No seeded job exists in `841215`; that still needs manual/app-created test job data.

## Target Phone Status After Reset

Checked target phone variants:

```text
+917903770969
917903770969
7903770969
+919654945155
919654945155
9654945155
```

Actual backend DB result:

```json
[]
```

Conclusion: both target phones are clean and ready for manual registration.

## Seed/Admin Phone Result

Seed did not recreate `919654945155` as admin/customer/worker.

Seeded admin result:

```json
[
  {
    "phone_primary": "",
    "name": "Admin",
    "role": "admin"
  }
]
```

Issue found:

- `ADMIN_PHONE` is not set in backend environment.
- `seed.py` therefore creates an admin user with blank `phone_primary`.
- This does not block `919654945155` from registering as customer, but it is a seed configuration/code hygiene issue.

Seed code follow-up:

- Local [backend/seed.py](/Users/amirsubhani/Documents/KaamNow/kaamnow/backend/seed.py) was updated after reset so future seed runs only create the admin user when `ADMIN_PHONE` is non-empty.
- This fix has not been deployed by this reset operation.
- The currently seeded DB still contains the blank-phone admin from the pre-fix deployed image.

## Frontend / Mobile Session Clear Instructions

Before manual registration, clear client auth state.

Web:

```js
localStorage.removeItem("kn_token")
sessionStorage.clear()
document.cookie = "access_token=; Max-Age=0; path=/"
```

Then hard-refresh `https://kaamnow.com`.

Mobile / Expo:

- Log out in the app.
- If the old role still appears, clear app storage or uninstall/reinstall Expo Go/dev build.
- The relevant mobile token is Expo SecureStore key `kn_token`.

## Manual Registration Plan

Do not run WhatsApp E2E until these are complete.

### Register worker

Phone:

```text
917903770969
```

Role:

```text
worker
```

Suggested profile:

```text
Name: Faiza Tahreen
Pincode: 841215
Skill: Driver or Mason
Rate: 600
```

### Register customer

Phone:

```text
919654945155
```

Role:

```text
customer
```

Suggested profile:

```text
Name: Amir Subhani
Pincode: 841215 or nearby
```

### Create dummy jobs

After customer registration, create at least two open jobs in pincode:

```text
841215
```

Use the app job-posting flow if possible. Direct DB insertion should wait for separate approval after inspecting current `db.jobs.findOne()` shape.

## WhatsApp Session Status

After actual backend reset:

```text
bot_sessions: 0
```

No WhatsApp session cleanup was needed.

If cleanup is needed after manual registration:

```javascript
const phones=["+917903770969","917903770969","7903770969","+919654945155","919654945155","9654945155"];
["bot_sessions","whatsapp_sessions","sessions"].forEach(c=>{
  if (db.getCollectionNames().includes(c)) {
    print(c + " deleted: " + db[c].deleteMany({phone:{$in:phones}}).deletedCount);
  }
});
```

---

# TEST-DB-RESET — 2026-05-16 (Session 2 — full Atlas reset)

## Key Finding From This Session

Backend uses **MongoDB Atlas** (`cluster0.dduibsm.mongodb.net`), not the local `mongodb-0` Kubernetes pod.
The local pod was a leftover from the original deploy and was consuming resources without serving any data.

## Actions Taken

### 1. SSH + cluster access
Connected via `KaamNow-KeyPair.pem` to `13.207.54.156`. kubectl runs as root using `/root/.kube/config`.

### 2. Confirmed DB name
```
DB_NAME=kaamnow_db
MONGO_URL=mongodb+srv://[USER]:[MASKED]@cluster0.dduibsm.mongodb.net/?appName=Cluster0
```

### 3. Pre-reset Atlas state (kaamnow_db)
```
users:        2   (Admin + Demo customer at +919000000001)
workers:     18
jobs:         5
bot_sessions: 0
bookings:     0
engagements:  0
notifications:0
wa_notif_log: 0
```
Target phones (+917903770969 / +919654945155) — NOT present. Collections were already relatively clean from a prior restart.

### 4. Atlas backup
Ran `mongodump` from inside `mongodb-0` pod targeting Atlas URI.
Backup path in pod: `/tmp/atlas_backup_20260516_180856`
Collections backed up: workers(18), users(2), jobs(5), plus empty collections.

### 5. Dropped Atlas kaamnow_db
```
{ ok: 1, dropped: 'kaamnow_db' }
```
Verified: `db.getCollectionNames()` → `[]`

### 6. Deleted unused local mongodb-0 pod permanently
The `mongodb-0` StatefulSet, its Service, and PVC were all deleted from the cluster:
```
statefulset.apps "mongodb" deleted
service "mongodb" deleted
persistentvolumeclaim "mongo-data" deleted
```
The `deploy/deploy.sh` already skipped `10-mongodb.yaml` (line 185). Updated stale header comment on line 7 to reflect Atlas-only deployment.

### 7. Restarted backend — seed ran
```
INFO: Seed data loaded.
INFO: Application startup complete.
```

### 8. Post-seed Atlas state
```
users:        2   (Admin — no phone, Demo customer — +919000000001)
workers:     18
jobs:         5   (pincodes: 230001, 342001, 442001, 461001, 842001)
bot_sessions: 0
```

### 9. Target phone verification
```
+917903770969 / 917903770969 / 7903770969  → NONE — clean
+919654945155 / 919654945155 / 9654945155  → NONE — clean
```

## Current Cluster State
```
backend    1/1 Running  (fresh restart)
frontend   1/1 Running
mongodb-0  DELETED
```

## Final TEST-DB-RESET Status

**READY_FOR_MANUAL_REGISTRATION**

Backups:

```text
In-cluster Mongo pod backup: /tmp/kaamnow_backup_20260516_122959
Actual backend Atlas JSON backup: /tmp/kaamnow_atlas_backup_20260516_123738.json
```

Reset result:

- Actual backend DB `kaamnow_db` was dropped.
- Backend was restarted.
- Seed ran successfully.
- Target phones are clean.
- Bot sessions are empty.
- Manual worker/customer registration can proceed.

Known follow-up:

- Deploy the `seed.py` guard fix and optionally remove/recreate the current blank-phone seeded admin after approval.
- Set `ADMIN_PHONE` if an admin login account is needed.
- Create open jobs in `841215` after customer registration.
- Rerun WA-6A worker flow only after manual registration and job creation are complete.
