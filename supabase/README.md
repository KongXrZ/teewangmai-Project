# PostgreSQL / Supabase

This folder contains the shared local setup for PostgreSQL and Supabase.
Its migrations define nine application tables; local commands do not provision
or deploy a hosted project.

- `config.toml`: CLI-generated local settings, using project ID `teewangmai`
  and the Next.js development URL. Remaining Auth settings are development defaults.
- `migrations/`: versioned SQL schema changes, indexes, constraints, and RLS
  policies. Use timestamped files such as `YYYYMMDDHHMMSS_create_locations.sql`.
- `tests/`: SQL assertions for the floor model and profile permissions.
- `seed.sql`: approved 35 buildings and 224 floors, preserving IDs/QR identifiers.

Supabase CLI is pinned in `devDependencies`. Run `npm ci` and start Docker, then
use `npm run db:start` from the repository root. Do not initialize the project
again. See [Backend Development Setup](../docs/backend-setup.md) for the complete
startup, migration, type-generation, and review workflow.

The current model has nine application tables: `users`, `locations`, `floors`,
`floor_hours`, `checkins`, `badges`, `user_badges`,
`rewards`, and `redemptions`. Use [the database guide](../docs/database.md)
for the current columns and constraints, including:

- Integer application user IDs and UUID `auth_id` references to Supabase
  `auth.users`, the email source of truth.
- Buildings in `locations`, QR identifiers in `floors`, and individual reports
  linked through `checkins.floor_id`.
- No `trust_score` or `current_streak` columns in `users`.
- Required unique canonical building codes, category arrays, search aliases and `locations.details`
  JSON preserved from the removed `location_profiles` table.
- Per-floor `floor_hours` with unique floor/day pairs, Monday=1 through Sunday=7,
  08:00–16:00 defaults and an active switch. Optional positive floor capacity.
- Required stock (default zero), upcoming/active/expired reward availability and
  fixed voucher deadlines. Successful exchanges have separate expiry/use fields.
- Composite `(user_id, badge_id)` ownership keys, separate from badge definitions.
- Crowd levels from 1 to 5; insert check-ins only after GPS AND QR validation,
  without verification-result columns.

Keep shared migrations immutable. The BE-003 forward migration maps legacy
location floor/QR data into `floors`, then moves reports to `floor_id`; ambiguous
legacy mappings abort instead of creating invented values. Separate follow-up
migrations repair legacy Auth/profile permissions and restrict building/floor
deletion to preserve report history. Back up existing data and verify
on a separate database before applying with `supabase migration up --local`.
The v4 migration also validates legacy reference mappings before replacing old
hours/details tables. See [Database Design](../docs/database.md) for blockers.
`src/types/database.ts` has been regenerated after importing the 35 approved
buildings and applying the category-array migration. The seed defaults blank
categories to อาคารเรียน and sets S7 inactive. The 224 floor rows expand approved
totals with blank counts defaulting to one; new rows receive UUID identifiers.
Hours/rewards/badges await
approved data. [Reference Data](../docs/reference-data.md) defines CSV inputs.

RLS is enabled on all nine tables. Authenticated users can read their own profile
and update only name/avatar; the other eight tables have no client policies yet.
The private Auth trigger, browser/server clients, and Auth endpoints exist.
Trusted check-in submission (GPS/QR and 30-minute user/floor cooldown) and crowd
aggregation (30-minute lookback, 10-minute refresh) remain separate tasks.
This migration adds their data relationships/indexes, not runtime enforcement.
No check-in +10 point awarding is added in this round. No remote database changes
have been made. See [Backend Handoff](../docs/backend-handoff.md) for pending APIs.

See [database migrations](https://supabase.com/docs/guides/local-development/database-migrations)
and [the project architecture](../docs/architecture.md).
