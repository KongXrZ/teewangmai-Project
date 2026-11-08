# Database Design

Baseline: the September 30, 2026 handoff report, updated ER/DBML, and the project
owner's subsequent confirmations. There are **nine application tables** in
PostgreSQL hosted by Supabase; Supabase's managed `auth.users` is separate.
The current tables below describe the repository migrations, not a claim that
they have been applied to a local or hosted database. The agreed floor-based
check-in model is documented separately in
[Floor check-ins and crowd summaries](check-in-rules.md) and is not migrated yet.

The owner confirmed **`crowd_level` is 1–5** and that `users` must follow the
latest DBML **without `trust_score` or `current_streak`**. Earlier documents and
wireframes mentioning those columns do not override this baseline.

## Current tables

Table and column names below match the lowercase names in the DBML.

| Table | Purpose | Columns |
| --- | --- | --- |
| `users` | Application profile linked to Supabase Auth | `id`, `auth_id`, `name`, `email`, `avatar_url`, `points`, `created_at` |
| `locations` | Campus locations and verification references | `id`, `name`, `category`, `building`, `floor`, `gps_lat`, `gps_lng`, `qr_code_id`, `image_url`, `is_active` |
| `location_hours` | Location opening hours | `id`, `location_id`, `day_of_week`, `open_time`, `close_time` |
| `location_profiles` | Flexible location details in PostgreSQL | `location_id`, `details` |
| `checkins` | Verified crowd reports and check-in history | `id`, `user_id`, `location_id`, `crowd_level`, `created_at` |
| `badges` | Configurable badge definitions | `id`, `name`, `description`, `requirement_type`, `requirement_value`, `icon_url`, `is_active` |
| `user_badges` | Badges earned by users | `user_id`, `badge_id`, `earned_at` |
| `rewards` | Reward catalog | `id`, `title`, `description`, `points_required`, `stock`, `image_url`, `status`, `starts_at`, `expires_at` |
| `redemptions` | Individual reward redemptions | `id`, `user_id`, `reward_id`, `used_points`, `status`, `redeemed_at` |

## Keys, relationships, and authentication

- `users.id` is an incrementing integer primary key (1, 2, 3...).
- `users.auth_id` is a UUID linked to `auth.users.id` (`UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`).
  Supabase Auth is responsible for authentication credentials and is the source of truth for email.
  Do not add a password column to the application table.
- Authenticated users can read only their own profile (auth.uid() = users.auth_id) and
  can update only their own name and avatar_url; database column grants enforce
  the editable-field boundary. RLS is enabled on all nine application tables. The
  other eight tables currently have no policies, so client roles cannot access their
  rows until feature-specific access rules are defined. The database also permits
  avatar URLs only when they use HTTP or HTTPS.
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
  foreign keys are `checkins.user_id` (integer) and `checkins.location_id` (integer).
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
| `location_profiles` | `details` (non-null, defaults to an empty JSON object) |
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

The agreed next model treats `locations` as buildings, adds `floors` with one
QR identifier per floor, and records `checkins.floor_id` instead of
`checkins.location_id`. QR resolves the building and floor; users do not select
the floor manually. These changes still need a migration.

Confirmed behavior as of November 8, 2026:

- Each check-in is one user's 1–5 report and its activity log.
- `current_crowd_level` is a per-floor arithmetic mean over reports from the
  latest **30 minutes**, recalculated **every 10 minutes**. These two timing
  settings should be adjustable through the backend/admin interface.
- Check-in cooldown is **30 minutes per user per floor**. Other floors/buildings
  have independent cooldowns and do not clear an existing one.
- Everyone may read the aggregate without checking in. No recent reports means
  `null`/unknown, not 0 or low crowding. Old logs remain stored when they leave
  the calculation window.

See [the check-in rules](check-in-rules.md) for the full flow, examples, unknown
UI state, configuration requirements, and remaining implementation decisions.
Current migrations do not implement these aggregation or cooldown rules.

## Decisions before implementation

- Floor schema migration, feature RLS/access policies, server-side GPS/QR
  verification, and atomic enforcement of the agreed cooldown.
- Scheduled aggregation, configurable timing, exact window boundaries,
  label/color thresholds, and summary storage/query strategy.
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
