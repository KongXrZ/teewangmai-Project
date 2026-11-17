# Database Design

Versioned SQL in `supabase/migrations/` is the schema source of truth. The v4
forward migration defines **nine public application tables**. BE-006 adds the
private `floor_crowd_summaries` snapshot table. Supabase-managed
`auth.users` is separate. Local validation does not imply Cloud deployment.

## Current tables

| Table | Purpose | Columns |
| --- | --- | --- |
| `users` | Application profiles | `id`, `auth_id`, `name`, `email`, `avatar_url`, `points`, `created_at` |
| `locations` | Buildings, search terms and GPS | `id`, `name`, `category`, `building`, `aliases`, `gps_lat`, `gps_lng`, `image_url`, `details`, `is_active` |
| `floors` | Floors and printable QR identifiers | `id`, `location_id`, `floor_name`, `capacity`, `qr_code_id`, `is_active` |
| `floor_hours` | Per-floor weekday schedules | `id`, `floor_id`, `day_of_week`, `open_time`, `close_time`, `is_active` |
| `checkins` | Individual crowd reports and history | `id`, `user_id`, `floor_id`, `crowd_level`, `created_at` |
| `badges` | Badge definitions | `id`, `name`, `description`, `requirement_type`, `requirement_value`, `icon_url`, `is_active` |
| `user_badges` | Earned badges | `user_id`, `badge_id`, `earned_at` |
| `rewards` | Catalog and stock | `id`, `title`, `description`, `points_required`, `stock`, `image_url`, `status`, `starts_at`, `expires_at` |
| `redemptions` | Successful exchanges and vouchers | `id`, `user_id`, `reward_id`, `used_points`, `status`, `redeemed_at`, `expires_at`, `used_at` |

## Buildings, floors and schedules

`locations.id` is the integer relational key. Required unique `building` codes
match `^[NS][0-9]+$`, e.g. `N16`/`S14`. Importers trim and uppercase codes.
`category` is a required `text[]` supporting multiple categories per building.
Blank categories in the approved import become `["อาคารเรียน"]`.
`aliases` is a non-null `text[]`, default empty. Search should match code, name,
category members and aliases case-insensitively and return each building once. Shared
aliases such as KFC are allowed; trim/deduplicate terms during import.

Building details live in `locations.details` (`jsonb`, not null, default `{}`).
There is no separate `location_profiles` table. Coordinates describe the
building, not a user/floor. `image_url` remains optional.

Each floor references a building. Non-empty floor names (including `G`/`B1`)
are unique within a building; `qr_code_id` is unique and non-empty. Optional
`capacity` must be positive; null means unknown. It is not measured attendance
or a formula for converting scores to occupancy percentages. BE-006 uses
check-in count / capacity * 100 independently of the mean reported score.

`floor_hours` replaces `location_hours`; `(floor_id, day_of_week)` is unique.

- `1` = Monday through `7` = Sunday, interpreted in `Asia/Bangkok`.
- Required times default to `08:00:00` and `16:00:00`.
- `is_active = false` means closed that weekday; stored times are ignored.
  Missing rows mean unknown hours. Building and floor must also be active.
- Full day = `00:00:00` through `23:59:59`. No special closed/full-day status.
- Opening later than closing means an overnight interval ending next day.
  There is no `open_time < close_time` constraint.

The future building-card API derives earliest opening through latest closing
from applicable active floors. A full-day floor yields a full-day building
label. This broad span does not promise all floors stay open throughout.
Location Detail shows the selected floor's own schedule. Overnight comparisons
must use intervals extending into the following day. Do not persist a second
building schedule.

`floors.location_id` and `checkins.floor_id` use `ON DELETE RESTRICT`. Retire
buildings/floors with `is_active = false` to preserve history. Other cascade
actions remain, including `floor_hours.floor_id`, `checkins.user_id` and
`redemptions.reward_id`. Account/reward deletion and retention still need product
decisions before exposing deletion operations.

## Check-ins and crowd summaries

Flow: login → Quick Scan → camera permission → scan QR → show building/floor →
choose crowd level → explicitly submit. The trusted backend must verify Auth,
active building/floor/QR, building GPS proximity and cooldown. QR identifies the
floor; GPS verifies building proximity. Never trust an unchecked client-supplied
building/floor pair. Personal GPS is not stored in logs. GPS radius/accuracy
configuration remains an implementation decision.

`checkins.crowd_level` is one user's integer observation **1–5**, with server
`created_at`. Cooldown is **30 minutes per user per floor**, independently across
floors/buildings and enforced atomically, including concurrent submissions.

`current_crowd_level` is the arithmetic mean of accepted reports per floor in
the **latest 30 minutes**, recalculated **every 10 minutes**. No reports means
null/unknown, never zero or a stale score kept indefinitely. Retain old reports
as history. BE-006 includes timestamps in (T − 30 minutes, T], uses pg_cron and a
private snapshot, and maps mean scores to low (<2.5), medium (<3.5), high (>=3.5).
The building card uses the floor with greatest check-in count; detail defaults
to floor 1. Estimated people equals count, and density equals count / capacity *
100. Timing configuration is deferred per the November 16 decision.

Indexes cover floor/time summaries, user/floor/time cooldown and user/time
history. Indexes alone do not enforce cooldown. Snapshots and refresh are private;
an aggregate-only RPC provides public reads. No admin settings are added.
See [Crowd API](crowd-api.md). **Check-in point awarding is deferred; this
round does not add +10 points.** See [Check-in Rules](check-in-rules.md).

## Rewards, vouchers and badges

Required nonnegative `rewards.stock` defaults to `0` (unavailable, never
unlimited). `points_required` is nonnegative. Catalog `status` defaults to
`active`, allowing `upcoming`, `active`, `expired`. An individual's exchange
does not change this shared status.

Every reward requires one fixed `expires_at`; optional `starts_at` must precede
it. All users acquiring the same reward share its deadline. Interpret entered
local dates in `Asia/Bangkok`, storing absolute `timestamptz` values. Future APIs
must enforce time bounds even if the stored catalog status is stale.

The future trusted exchange transaction checks eligibility, points and stock,
deducts points/stock and inserts a redemption atomically. Only successful
exchanges are stored: `status = 'completed'` is the sole allowed value, not
pending/cancelled. `used_points` preserves the price. Copy the reward deadline
into `redemptions.expires_at` at issuance, never issuance plus a duration.
The copied expiry must be later than `redeemed_at`.

Completed exchange and voucher use differ. Authorized consumption sets `used_at`
once, atomically, before expiry. The constraint requires
`redeemed_at <= used_at < expires_at` when present. Personal display derives:

| Condition | Display |
| --- | --- |
| `used_at` present | Used, including after expiry |
| Unused, current time at/after expiry | Expired |
| Unused, before expiry | Redeemed / available to use |

Checks alone cannot copy expiry, debit balances, enforce current-time deadlines
or prevent double use. Those operations and voucher QR verification need trusted
APIs. Direct clients cannot issue/consume vouchers.

`badges.requirement_value` is a positive threshold interpreted together with
`requirement_type`. BE-013 restricts types to `checkin_count` (accepted check-ins)
and `distinct_building_count` (distinct buildings via `checkins.floor_id`); both
await owner confirmation. An `after insert` trigger on `checkins` evaluates active
badges under a per-user advisory lock and inserts `user_badges` with
`on conflict do nothing`; `earned_at` is the crossing check-in's `created_at`.
`private.award_all_user_badges()` backfills after imports or reactivation and is
idempotent. Earned badges use composite primary key `(user_id, badge_id)`.
Authenticated users read active badges plus their own earned ones through RLS and
`public.get_my_badges()`; clients have no badge write grants.

## Identity and access

`users.id` is an integer identity. Required unique `auth_id` references
`auth.users.id` (UUID). Supabase Auth owns email/password credentials even without
Google login. Application profiles have no password, `trust_score` or
`current_streak`. Points default to zero and cannot be negative.

The existing Auth insert trigger calls `private.handle_new_user()`, using
`SECURITY DEFINER`, empty `search_path` and qualified objects. Initial name comes
from metadata `name`, then `full_name`, then email prefix. Email is copied at
creation; later Auth email synchronization is not implemented. Avatar URLs are
null or HTTP(S). This migration does not modify Auth. BE-010 adds the public
Storage bucket `avatars` (JPEG/PNG, 2 MB) with per-user folder policies; uploads
go through `POST /api/profile/avatar` (see `frontend-integration.md`).

All nine tables have RLS. Clients can read only their own user profile and update
only name/avatar. Ownership policies and column grants protect points/email/
identity. BE-005 additionally permits anon/authenticated SELECT on active
buildings, active floors of active buildings, and their schedules (including
disabled schedule rows so closed differs from unknown). Floor reads are limited
to catalog columns; `qr_code_id` is not granted. There are no public catalog
writes or sequence grants. The other five application tables still have no
client policies. `search_locations` is a parameterized SECURITY INVOKER function
subject to the caller's RLS, not a privileged bypass. See [Location API](location-api.md).
Trusted server access can use `service_role`; never expose that key in browser
code. Future access rules must not let direct writes bypass business checks.

## Forward migration and handoff

`20261115000130_align_reference_data_and_voucher_schema.sql` follows the existing
five migrations, keeping them immutable. In a single transaction it:

1. Validates codes after trim/uppercase; rejects missing, invalid or duplicate
   normalized codes. Existing building/floor IDs stay unchanged.
2. Copies profile JSON into buildings before removing `location_profiles`.
3. Copies each old building/day schedule to all existing floors with identical
   day/time values and new schedule IDs. No missing weekdays are invented.
   A building with hours but no floor aborts rather than lose its schedules.
4. Maps null stock to zero and inactive catalog status to upcoming, keeping both
   unavailable. Missing reward expiry requires owner-approved data before retry.
5. Rejects any legacy redemption until historical status, expiry and use have an
   explicitly reviewed mapping. Do not invent dates or historical outcomes.

This does not reset or seed data. Initial Local inspection found two profiles
and no building/floor/reward/redemption records. Local v4 was applied without a
backup at the owner's explicit request. Hosted databases have not been changed.

Team data: buildings, floors, hours, reward/badge definitions. Activity data:
profiles, check-ins, earned badges and vouchers. Balances and stock change during
operation. Reimports must preserve identities, history, balances and consumed
stock. `supabase/seed.sql` contains 35 approved buildings and 224 floors. See the
[Reference Data Contract](reference-data.md).

`20261115063746_support_multiple_location_categories.sql` converts `category`
from text to required text[]. Existing nonblank values become a single member;
blank legacy values use the approved อาคารเรียน fallback. The approved seed
splits CSV multi-value categories/aliases and stores text details in
`details.description`. Local now has 35 buildings, with S7 inactive, and retains
the existing profiles. The approved floor totals expand to 224 rows, defaulting
blank totals to one floor. New rows receive UUID QR identifiers; repeated imports
preserve IDs/QRs. Capacity 100 applies per floor as supplied. Temporary dummy weekday `floor_hours` rows (Monday–Friday `08:00:00`–`17:00:00`,
active) are seeded across all 224 floors (1,120 rows; Saturday–Sunday omitted)
until the real CSV dump arrives. Approved floor hours, reward and badge
reference records remain pending.

`src/types/database.ts` has been regenerated from the applied Local schema,
including category arrays and the v4 tables/fields. Regenerate and review it
after subsequent migrations with `npm run db:types`.

See [Backend Setup](backend-setup.md) for validation commands and
[Backend Handoff](backend-handoff.md) for implemented versus pending APIs/tasks.
