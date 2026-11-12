# Database Design

The versioned SQL in `supabase/migrations/` is the schema source of truth.
The current model has **ten application tables** in PostgreSQL; Supabase's
managed `auth.users` is separate. BE-003 introduces building floors and repairs
legacy profile permissions with a forward migration. It has been applied and
verified locally; this does not imply a hosted database deployment.

## Current tables

| Table | Purpose | Columns |
| --- | --- | --- |
| `users` | Application profiles | `id`, `auth_id`, `name`, `email`, `avatar_url`, `points`, `created_at` |
| `locations` | Buildings and GPS reference coordinates | `id`, `name`, `category`, `building`, `gps_lat`, `gps_lng`, `image_url`, `is_active` |
| `floors` | Building floors and their printable QR identifiers | `id`, `location_id`, `floor_name`, `qr_code_id`, `is_active` |
| `location_hours` | Building opening hours | `id`, `location_id`, `day_of_week`, `open_time`, `close_time` |
| `location_profiles` | Flexible building details | `location_id`, `details` |
| `checkins` | Individual crowd reports and historical logs | `id`, `user_id`, `floor_id`, `crowd_level`, `created_at` |
| `badges` | Badge definitions | `id`, `name`, `description`, `requirement_type`, `requirement_value`, `icon_url`, `is_active` |
| `user_badges` | Earned badges | `user_id`, `badge_id`, `earned_at` |
| `rewards` | Reward definitions and available stock | `id`, `title`, `description`, `points_required`, `stock`, `image_url`, `status`, `starts_at`, `expires_at` |
| `redemptions` | Individual reward redemptions | `id`, `user_id`, `reward_id`, `used_points`, `status`, `redeemed_at` |

## Buildings, floors, and reports

`locations` represents buildings. The optional legacy `building` column remains
as a label/code; `locations.id` is the building identity. Each building has many
`floors`, and each floor has many `checkins`. Opening hours and flexible details
remain at building level. `location_profiles.details` is PostgreSQL `jsonb`,
not a separate NoSQL database, and can supply the Location Detail page.

- `floors.location_id` references `locations.id`.
- `floor_name` is non-empty text, supporting labels such as `B1`, `G`, and `2`.
  `(location_id, floor_name)` is unique within a building.
- `floors.qr_code_id` is unique and non-empty. It identifies the floor; a printed
  QR is not an authentication secret or proof of presence by itself.
- `checkins.floor_id` references `floors.id`; `checkins.user_id` references
  `users.id`. The building is obtained through the floor relationship.
- `floors.location_id` and `checkins.floor_id` use `ON DELETE RESTRICT`.
  A building with floors or a floor with check-ins cannot be deleted. Retire
  buildings/floors with `is_active = false` to preserve report history.
  Other foreign keys retain their existing cascade behavior, including
  `checkins.user_id`; account deletion and log retention remain separate decisions.

The intended flow is login → Quick Scan → camera permission → scan QR → show
the resolved building/floor → choose crowd level → submit. GPS verifies proximity
to the building before acceptance; it does not identify the floor. The floor
comes from QR resolution, never an unchecked client-supplied building/floor pair.
Request GPS in the check-in flow before submitting. Raw user coordinates and
verification-result flags are not stored in `checkins`.

The trusted server must validate authentication, active building/floor/QR, GPS,
and cooldown before inserting a report. **BE-003 supplies the schema and indexes;
QR provisioning/resolution and the verified submission path remain future work.**

## Identity and access

`users.id` is an integer identity used by application relations; `users.auth_id`
is a unique required UUID referencing `auth.users.id`. Auth owns credentials and
is the email source of truth. No application password, `trust_score`, or
`current_streak` column is present.

The Auth insert trigger invokes `private.handle_new_user()` to create a profile
from Auth metadata. It is `SECURITY DEFINER` with an empty `search_path` and
qualified object references. Client roles cannot use the private schema or call
this function. Existing profiles are not rewritten by the floor migration.
Email is copied when a profile is created; later Auth email synchronization is
not implemented by this trigger.

RLS is enabled on all ten tables. Authenticated clients can read only their own
profile and update only `name` and `avatar_url`. Both ownership policies and column
grants enforce this boundary; clients cannot change points, email, or identity.
Avatar URLs must be null or use HTTP/HTTPS. The other nine tables have no client
policies yet. In particular, direct client check-in writes must not bypass the
future GPS/QR/cooldown checks. Feature APIs will introduce reviewed read/write
policies as their operations are implemented.

## Constraints, defaults, and indexes

- Standalone `id` columns are integer `GENERATED ALWAYS AS IDENTITY` primary keys.
  `location_profiles.location_id` is its shared primary/foreign key;
  `user_badges` uses `(user_id, badge_id)` as its primary key.
- `users` requires Auth identity, name, unique email, nonnegative points
  (default `0`), and creation time.
- Buildings require name, category, reference latitude/longitude (`double
  precision`), and active status. Floors require building, name, QR, and active
  status. Building/floor/badge active status defaults to `true`.
- `location_hours` requires building, day number `1–7`, and opening/closing
  times. `(location_id, day_of_week)` is unique. Weekday numbering and timezone
  interpretation still need agreement before hours logic is implemented.
- `location_profiles.details` is **NOT NULL**, defaulting to `'{}'::jsonb`.
  A building may have at most one such record; creation is not automatic.
- A check-in requires user, floor, integer `crowd_level` **1–5**, and creation
  time. Creation/earning/redemption timestamps use `timestamptz`, default `now()`.
  The future submission path must use server time, not a client timestamp.
- Badge requirement values must be positive; requirement types/evaluation rules
  remain undecided.
- Reward points and non-null stock must be nonnegative. Reward status defaults
  to `active` and permits `active`/`inactive`. Nullable expiry must follow start
  when both are supplied; null-stock semantics remain undecided.
- Redemptions preserve nonnegative spent points, status, and timestamp. Status
  defaults to `pending` and permits `pending`/`completed`/`cancelled`.
- Check-in indexes support `(floor_id, created_at DESC)` for summaries,
  `(user_id, floor_id, created_at DESC)` for cooldown checks, and
  `(user_id, created_at DESC)` for history. Redemption indexes support user/time
  and reward/time lookups. An index alone does not enforce cooldown.

## Derived crowd level and cooldown

`checkins.crowd_level` is one user's observation. The agreed
`current_crowd_level` is the arithmetic mean of accepted reports for that floor
in the **latest 30 minutes**, recalculated **every 10 minutes**. With no reports,
show null/unknown. Expired contributions remain in historical logs. A viewer
does not need to check in to read the aggregate.

Cooldown is **30 minutes per user per floor**. Checking in elsewhere creates an
independent cooldown and does not reset earlier ones. Summary lookback and
refresh interval should be adjustable through the backend/admin interface.

These runtime rules are agreed but **not implemented by this migration**.
BE-006 owns aggregation/scheduling; BE-008 owns trusted submission and atomic
cooldown enforcement. No `floors.current_crowd_level` column, summary table,
scheduler, or settings table is added here. See [Check-in Rules](check-in-rules.md).

## Migration and initial data

`20261109162340_add_floor_checkins_and_align_profile_security.sql` moves legacy
floor/QR fields from `locations` to `floors`, maps each existing check-in, then
removes `checkins.location_id` and the moved building columns. Existing building
IDs and QR identifiers are preserved. Separate legacy locations are not merged
automatically. If a legacy building has a missing/blank floor or blank QR, the
transaction aborts rather than inventing reference data. Resolve that mapping
before retrying. Its historical filename retains `align_profile_security`, but
the SQL now covers only the building/floor model.

`20261112073148_repair_legacy_profile_security.sql` separately repairs older
installations. The pre-BE-003 Local inspection found an Auth insert trigger
calling `public.handle_new_user` with `search_path=public`, a remaining
`public.protect_user_points` trigger/function, and broader profile update grants.
That database had already recorded the initial migration. Editing its SQL in
the repository could not update the installed objects. This idempotent forward
repair installs the private trigger function, removes legacy functions, and
restricts authenticated updates to name/avatar_url. It is also safe on a fresh
database whose baseline already contains those restrictions.

`20261112073150_restrict_building_floor_deletion.sql` changes both history-path
foreign keys to `RESTRICT`. Databases that already applied the original BE-003
migration run these two new migrations in order; they do not replay the floor
mapping or reset their data.

Back up existing data and test on a separate database before applying a forward
migration; do not reset a database containing data you need. Keep shared migration
files immutable and regenerate `src/types/database.ts` from the applied schema.
See [Backend Development Setup](backend-setup.md) for commands and SQL checks.

The team supplies buildings, floors, QR identifiers, opening hours/details, reward
definitions, and badge definitions. Users produce profiles, reports, earned
badges, and redemptions; points and reward stock also change during operation.
Seeds/imports must preserve stable identities and avoid resetting balances or
consumed stock. No mock application data is included; `supabase/seed.sql` remains
empty until approved reference data is ready.

Outstanding decisions include GPS tolerance/accuracy, summary storage and time
boundaries, label thresholds/rounding, building-wide aggregation, admin timing
settings, retention, points, badges, and transactional reward redemption.
