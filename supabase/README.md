# PostgreSQL / Supabase

This folder contains the shared local setup for PostgreSQL and Supabase.
Its migrations define ten application tables; local commands do not provision
or deploy a hosted project.

- `config.toml`: CLI-generated local settings, using project ID `teewangmai`
  and the Next.js development URL. Remaining Auth settings are development defaults.
- `migrations/`: versioned SQL schema changes, indexes, constraints, and RLS
  policies. Use timestamped files such as `YYYYMMDDHHMMSS_create_locations.sql`.
- `tests/`: SQL assertions for the floor model and profile permissions.
- `seed.sql`: intentionally empty until approved reference data is supplied.

Supabase CLI is pinned in `devDependencies`. Run `npm ci` and start Docker, then
use `npm run db:start` from the repository root. Do not initialize the project
again. See [Backend Development Setup](../docs/backend-setup.md) for the complete
startup, migration, type-generation, and review workflow.

The current model has ten application tables: `users`, `locations`, `floors`,
`location_hours`, `location_profiles`, `checkins`, `badges`, `user_badges`,
`rewards`, and `redemptions`. Use [the database guide](../docs/database.md)
for the current columns and constraints, including:

- Integer application user IDs and UUID `auth_id` references to Supabase
  `auth.users`, the email source of truth.
- Buildings in `locations`, QR identifiers in `floors`, and individual reports
  linked through `checkins.floor_id`.
- No `trust_score` or `current_streak` columns in `users`.
- A weak/dependent `location_profiles` table with `location_id` as primary/foreign
  key and `jsonb` details in PostgreSQL.
- A strong `location_hours` entity with its own `id` and unique location/day pair.
- Composite `(user_id, badge_id)` ownership keys, separate from badge definitions.
- Crowd levels from 1 to 5; insert check-ins only after GPS AND QR validation,
  without verification-result columns.

Keep shared migrations immutable. The BE-003 forward migration maps legacy
location floor/QR data into `floors`, then moves reports to `floor_id`; ambiguous
legacy mappings abort instead of creating invented values. It also repairs old
public Auth triggers and broad profile grants. Back up existing data and verify
on a separate database before applying with `supabase migration up --local`.
Generate TypeScript types from the applied schema into `src/types/database.ts`.

RLS is enabled on all ten tables. Authenticated users can read their own profile
and update only name/avatar; the other nine tables have no client policies yet.
The private Auth trigger, browser/server clients, and Auth endpoints exist.
Trusted check-in submission (GPS/QR and 30-minute user/floor cooldown) and crowd
aggregation (30-minute lookback, 10-minute refresh) remain separate tasks.
This migration adds their data relationships/indexes, not runtime enforcement.
No remote database changes have been made by BE-003.

See [database migrations](https://supabase.com/docs/guides/local-development/database-migrations)
and [the project architecture](../docs/architecture.md).
