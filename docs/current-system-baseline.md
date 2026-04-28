# Current System Baseline

This document records the behavior that Phase 0 tests protect before the
engagement, OTP, pincode, and structured-skill changes begin.

## Backend shape

- Framework: FastAPI.
- Database: MongoDB through Motor.
- Collections currently used by product flows:
  - `users`
  - `workers`
  - `jobs`
  - `bookings`
  - `bot_sessions`
  - `waitlist`
- Authentication: JWT token returned in the API response and also set as an
  `access_token` cookie.

## Feature flags

The following flags are available in `backend.config.settings` and default to
`False`:

- `FEATURE_ENGAGEMENT_FLOW`
- `FEATURE_OTP_AUTH`
- `FEATURE_WHATSAPP_NOTIFICATIONS`

They are switches for later phases only. Phase 0 does not change runtime
behavior.

## Users collection

Current fields written by `/api/auth/register`:

- `id`
- `email`
- `password_hash`
- `name`
- `role`: `worker` or `customer`
- `village`
- `phone`
- `phone_verified`
- `address`: optional structured address with `village`, `post`, `block`,
  `district`, `state`, `pincode`
- `photo_url`
- `preferred_language`
- `created_at`

Legacy behavior for older rows still present in `bookings`:

- Email is mandatory and lowercased.
- Password is mandatory and must be at least 6 characters at schema level.
- Phone is optional and not verified.
- `phone_verified` is created as `False`.
- If a structured address is supplied, `village` is mirrored from
  `address.village` for old clients.
- Duplicate email registration is rejected.
- Login is email/password only.

## Workers collection

Current fields written by `/api/workers/profile`:

- `id`
- `user_id`
- `name`
- `skills`: flat string list
- `structured_skills`: `{ category, skill }` list
- `daily_rate`
- `bio`
- `village`
- `district`
- `state`
- `address`: optional structured address with `village`, `post`, `block`,
  `district`, `state`, `pincode`
- `lat`
- `lng`
- `available`
- `availability_status`
- `last_active_at`
- `trust_tier`
- `avg_rating`
- `total_jobs`
- `photo_url`
- `created_at`

Current behavior:

- Only users with role `worker` can create or update a worker profile.
- Skills are comma-separated in the web UI, then sent as a flat list.
- If no structured skills are sent, the backend mirrors flat skills to
  `structured_skills` with category `Legacy`.
- If an address is sent, the backend mirrors `address.village`,
  `address.district`, and `address.state` back to old top-level fields.
- `lat` and `lng` are required by the API and currently entered in the UI.
- `/api/workers` supports optional `skill`, `q`, and `available_only` filters.
- Worker list sorting favors higher `avg_rating`, then higher `trust_tier`.
- `/api/workers/search` supports `pincode`, comma-separated `skills`, and
  `available_only`.
- Worker search ranks:
  - skill match + same pincode
  - skill match + other pincode
  - same pincode without selected skill match
  - other workers
- Worker search response includes matching helpers:
  - `wage`
  - `wage_amount`
  - `wage_unit`
  - `matched_skills`
  - `skill_match`
  - `same_pincode`
  - `match_rank`

## Jobs collection

Current fields written by `POST /api/jobs`:

- `id`
- `customer_id`
- `customer_name`
- `title`
- `category`
- `description`
- `workers_needed`
- `daily_rate`
- `job_date`
- `village`
- `address`: optional structured address with `village`, `post`, `block`,
  `district`, `state`, `pincode`
- `lat`
- `lng`
- `required_skills`: `{ category, skill }` list
- `urgency`: `normal` or `urgent`
- `filled_count`
- `accepted_worker_ids`
- `status`: created as `open`
- `created_at`

Current behavior:

- Any authenticated user can currently call `POST /api/jobs`; the frontend hides
  this from workers, but the backend does not enforce customer-only posting.
- If no required skills are sent, the backend mirrors the old `category` field
  into `required_skills`.
- If an address is sent, the backend mirrors `address.village` back to the old
  top-level `village` field.
- `/api/jobs` supports optional `category` and `status` filters.
- `/api/jobs/mine` returns jobs for the current customer ID.
- `/api/jobs/feed` supports `pincode` and comma-separated `skills`.
- If the caller is a worker and does not pass pincode/skills, the backend uses
  the worker profile pincode and skills where available.
- Job feed ranks:
  - skill match + same pincode
  - skill match + other pincode
  - same pincode without selected skill match
  - other jobs
- Urgent jobs sort before normal jobs inside the same rank bucket.
- Job feed response includes matching helpers:
  - `wage`
  - `wage_amount`
  - `wage_unit`
  - `matched_skills`
  - `skill_match`
  - `same_pincode`
  - `match_rank`

## Bookings collection

Legacy booking fields:

- `id`
- `job_id`
- `worker_id`
- `customer_id`
- `worker_name`
- `customer_name`
- `job_title`
- `job_date`
- `daily_rate`
- `status`: starts as `pending`
- `rating`
- `comment`
- `created_at`

Current behavior:

- Booking creation is customer-driven only.
- Customer can book a worker only for one of their own open jobs.
- Worker must exist and be available.
- Worker accepts a pending booking, moving it to `confirmed`.
- Customer completes a confirmed booking, moving it to `completed`.
- Only the customer can rate a completed booking.
- Rating writes `rating` and `comment` onto the booking.
- Worker `avg_rating` and `total_jobs` are recomputed from rated bookings.
- Older rows in `bookings` do not have duplicate or job-capacity guards.

Phase 2 note:

- `POST /api/bookings` now creates an engagement with source
  `customer_booking` and returns a legacy booking-shaped response.
- Legacy `/api/bookings` maps engagement statuses for current web/mobile UI:
  - `requested` -> `pending`
  - `accepted` -> `confirmed`
  - `completed` -> `completed`
  - `rejected`/`cancelled` -> `cancelled`
- `/api/bookings/mine` returns engagement-backed booking rows first, then any
  older rows still present in the `bookings` collection.
- `/api/bookings/{id}/accept` and `/api/bookings/{id}/complete` work with both
  engagement IDs and older booking IDs.
- Duplicate active requests, job capacity, worker availability, worker date
  conflicts, and active request limits are now enforced for engagement-backed
  requests.

## Engagements collection

Current fields written by engagement creation:

- `id`
- `job_id`
- `worker_id`
- `customer_id`
- `source`: `worker_interest` or `customer_booking`
- `status`: `requested`, `accepted`, `rejected`, `completed`, `cancelled`
- `worker_name`
- `customer_name`
- `job_title`
- `job_date`
- `daily_rate`
- `worker_rating`
- `customer_rating`
- `created_by`
- `created_at`
- `updated_at`

Current behavior:

- Customer-driven requests are available through `/api/bookings` and
  `/api/engagements/customer-booking`.
- Worker-driven requests are available through `/api/jobs/{job_id}/interest`
  and `/api/engagements/worker-interest/{job_id}`.
- Only the receiving side can accept or reject:
  - worker accepts/rejects `customer_booking`
  - customer accepts/rejects `worker_interest`
- Customer completes accepted engagements.
- Active duplicate means same `job_id + worker_id` with status `requested` or
  `accepted`.
- Worker active request limit is currently 5.
- Customer active request limit is currently 10.
- A worker cannot accept or receive a new request for a date where they already
  have an accepted engagement or confirmed legacy booking.

## Index baseline

Phase 1 declares indexes for both legacy and upcoming marketplace flows:

- `users.email` unique
- `users.phone` unique sparse
- `workers.user_id`
- `workers.skills`
- `workers.structured_skills.skill`
- `workers.address.pincode`
- `jobs.customer_id`
- `jobs.status`
- `jobs.address.pincode`
- `jobs.required_skills.skill`
- `bookings.worker_id`
- `bookings.customer_id`
- `engagements.worker_id`
- `engagements.customer_id`
- `engagements.job_id`
- `engagements.job_id + engagements.worker_id` unique
- `engagements.worker_id + engagements.status`
- `engagements.customer_id + engagements.status`

## WhatsApp bot

Current routes:

- `POST /api/whatsapp/message`: simulated chat session.
- `GET /api/whatsapp/gupshup`: provider verification.
- `POST /api/whatsapp/gupshup`: inbound Gupshup webhook.

Current behavior:

- Bot state is stored in `bot_sessions`.
- The bot can guide a basic customer booking conversation.
- Booking lifecycle routes do not currently trigger WhatsApp notifications.
- WhatsApp replies do not currently accept or reject bookings.

## Frontend behavior

Current web routes:

- `/signup`: email/password registration with optional phone and village.
- `/login`: email/password login.
- `/worker/setup`: single long worker profile form.
- `/marketplace`: customer-oriented worker search.
- `/worker/:id`: worker profile and customer booking panel.
- `/post-job`: basic customer job form.
- `/dashboard`: bookings and jobs tabs.
- `/whatsapp-demo`: simulated WhatsApp chat.

Current worker setup UX:

- One long form.
- Flat skills input plus suggestion chips.
- Manual latitude and longitude fields.
- Village required; district and state are optional.
- No pincode, post, block, profile photo upload, or structured skill category UI.

## Mobile behavior

Current Expo app mirrors most web flows:

- Email/password login and signup.
- Customer-oriented worker marketplace.
- Worker profile screen with customer booking panel.
- Customer post-job screen.
- Dashboard for bookings and jobs.
- WhatsApp simulated chat.

Current mobile gap:

- There is no dedicated mobile worker onboarding/setup screen yet.
