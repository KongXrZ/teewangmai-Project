# Database Design

Baseline: the September 30, 2026 handoff report, updated ER/DBML, and the project
owner's subsequent confirmations. There are **nine application tables** in
PostgreSQL hosted by Supabase; Supabase's managed `auth.users` is separate.
This is a design reference, not an executable migration or a deployed schema.

The owner confirmed **`crowd_level` is 1–5** and that `users` must follow the
latest DBML **without `trust_score` or `current_streak`**. Earlier documents and
wireframes mentioning those columns do not override this baseline.

## Current tables

Table and column names below match the lowercase names in the DBML.

| Table | Purpose | Columns |
| --- | --- | --- |
| `users` | Application profile linked to Supabase Auth | `id`, `name`, `email`, `avatar_url`, `points`, `created_at` |
| `locations` | Campus locations and verification references | `id`, `name`, `category`, `building`, `floor`, `gps_lat`, `gps_lng`, `qr_code_id`, `image_url`, `is_active` |
| `location_hours` | Location opening hours | `id`, `location_id`, `day_of_week`, `open_time`, `close_time` |
| `location_profiles` | Flexible location details in PostgreSQL | `location_id`, `details` |
| `checkins` | Verified crowd reports and check-in history | `id`, `user_id`, `location_id`, `crowd_level`, `created_at` |
| `badges` | Configurable badge definitions | `id`, `name`, `description`, `requirement_type`, `requirement_value`, `icon_url`, `is_active` |
| `user_badges` | Badges earned by users | `user_id`, `badge_id`, `earned_at` |
| `rewards` | Reward catalog | `id`, `title`, `description`, `points_required`, `stock`, `image_url`, `status`, `starts_at`, `expires_at` |
| `redemptions` | Individual reward redemptions | `id`, `user_id`, `reward_id`, `used_points`, `status`, `redeemed_at` |

## Keys, relationships, and authentication

- `users.id` is a UUID linked to `auth.users.id`. Supabase Auth is responsible
  for authentication and is the source of truth for email. `users.email`
  remains in the academic/logical DBML as required and unique; the implementation
  must define how that representation stays consistent with Auth. Do not add
  a password column to the application table.
- `locations`, `location_hours`, `checkins`, `badges`, `rewards`, and
  `redemptions` have incrementing integer `id` primary keys.
- `location_hours` is a **strong entity** with its own primary key and a
  `location_id` foreign key. A location has many hours records;
  `UNIQUE (location_id, day_of_week)` allows at most one record per day.
  The stale DBML header calling it weak is superseded by the handoff report.
- `location_profiles` is a **weak/dependent entity** owned by `locations`.
  Its `location_id` is both primary key and foreign key, giving at most one
  profile per location. The ER models this as 1:1; mandatory profile creation
  for every location still needs an implementation rule. `details` is `jsonb`
  in PostgreSQL, not a separate NoSQL database.
- A user has many check-ins; a location receives many check-ins. The corresponding
  foreign keys are `checkins.user_id` (UUID) and `checkins.location_id` (integer).
- `user_badges` joins users and badge definitions using the composite primary
  key `(user_id, badge_id)`. It has no separate `id`; each badge can be owned
  once per user. Badge definitions and badge ownership remain separate tables.
- `redemptions.user_id` and `redemptions.reward_id` reference users and rewards.
  Each redemption preserves its spent points, status, and timestamp.

## Types, defaults, and constraints

All primary keys are non-null. Other required fields are:

| Table | Required non-key fields |
| --- | --- |
| `users` | `name`, `email`, `points`, `created_at` |
| `locations` | `name`, `category`, `gps_lat`, `gps_lng`, `qr_code_id`, `is_active` |
| `location_hours` | `location_id`, `day_of_week`, `open_time`, `close_time` |
| `location_profiles` | None beyond its primary key; `details` is nullable |
| `checkins` | `user_id`, `location_id`, `crowd_level`, `created_at` |
| `badges` | `name`, `requirement_type`, `requirement_value`, `is_active` |
| `user_badges` | `earned_at` (both foreign keys form its primary key) |
| `rewards` | `title`, `points_required`, `status` |
| `redemptions` | `user_id`, `reward_id`, `used_points`, `status`, `redeemed_at` |

- Counts, points, stock, crowd levels, day numbers, and badge requirement values
  use integers. Location reference coordinates use `float` in the DBML.
- `created_at`, `earned_at`, and `redeemed_at` use `timestamptz`, defaulting to
  `now()`. Reward `starts_at` and `expires_at` are nullable `timestamptz`.
  Opening and closing times use `time`.
- `users.points` defaults to `0`; location and badge `is_active` default to
  `true`. `locations.qr_code_id` is unique.
- `crowd_level` must be between **1 and 5**, inclusive. `day_of_week` is 1–7;
  weekday numbering and campus timezone interpretation must be agreed before
  implementing hours logic.
- `badges.requirement_value` must be greater than zero. The allowed
  `requirement_type` values and evaluation mechanism remain TBD.
- `rewards.points_required` must be nonnegative. `stock` must be nonnegative
  when present; the meaning of null stock remains a business-rule decision.
  `expires_at` must be later than `starts_at` when both are set.
- Reward status is `active` or `inactive`, defaulting to `active`.
  Redemption status is `pending`, `completed`, or `cancelled`, defaulting to
  `pending`; `used_points` must be nonnegative.
- The DBML includes indexes on check-ins by `(location_id, created_at)` and
  `(user_id, created_at)`, and redemptions by `(user_id, redeemed_at)` and
  `(reward_id, redeemed_at)`.

DBML notes are requirements, not implemented SQL checks. Future migrations must
explicitly encode the agreed constraints, defaults, and indexes.

## Check-in verification and reporting

Create a `checkins` row **only after GPS AND QR verification both succeed**.
The row itself represents a verified check-in. Do not add `verification_method`,
`gps_verified`, or `qr_verified` columns. The trusted write path and access
policies must enforce this invariant; client-side form validation is insufficient.

`locations.gps_lat`, `gps_lng`, and `qr_code_id` are location reference data.
Raw personal GPS coordinates are not fields in the check-in model. The custom
image/3D campus map is a separate presentation layer.

The input scale of 1–5 is confirmed. Aggregation windows, report agreement,
conflict handling, expiry, and mapping summaries to map labels remain TBD;
the older presentation's timing and report-count examples are not fixed rules.

## Decisions before implementation

- RLS/access policies, server-side GPS/QR verification, and check-in cooldown.
- Aggregation, expiry, and historical summary storage/query strategy.
- Point earning, trust/streak behavior, and badge evaluation/trigger strategy.
  Do not reintroduce removed user columns while these rules are undecided.
- Transactional point/stock updates, reward eligibility, cancellation,
  and duplicate-redemption handling.
- Auth profile lifecycle/email synchronization, foreign-key deletion/cascade
  behavior, and any additional indexes based on actual access patterns.

Create versioned SQL migrations when these implementation decisions are ready,
then generate `src/types/database.ts` from the implemented PostgreSQL schema.
The report, ER image, and DBML stay in the ignored local reference folder;
this tracked guide carries the confirmed baseline for contributors.
