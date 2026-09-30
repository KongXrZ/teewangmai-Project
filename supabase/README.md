# PostgreSQL / Supabase

This folder contains the shared local setup for PostgreSQL and Supabase.
It does not provision a hosted project or create the nine application tables.

- `config.toml`: CLI-generated local settings, using project ID `teewangmai`
  and the Next.js development URL. Remaining Auth settings are development defaults.
- `migrations/`: versioned SQL schema changes, indexes, constraints, and RLS
  policies. Use timestamped files such as `YYYYMMDDHHMMSS_create_locations.sql`.
- `seed.sql`: local development sample data once the schema is defined.

Supabase CLI is pinned in `devDependencies`. Run `npm ci` and start Docker, then
use `npm run db:start` from the repository root. Do not initialize the project
again. See [Backend Development Setup](../docs/backend-setup.md) for the complete
startup, migration, type-generation, and review workflow.

The September 30 baseline has nine application tables: `users`, `locations`,
`location_hours`, `location_profiles`, `checkins`, `badges`, `user_badges`,
`rewards`, and `redemptions`. Use [the database guide](../docs/database.md)
for the current columns and constraints, including:

- UUID user identities linked to Supabase `auth.users`, the email source of truth.
- No `trust_score` or `current_streak` columns in `users`.
- A weak/dependent `location_profiles` table with `location_id` as primary/foreign
  key and `jsonb` details in PostgreSQL.
- A strong `location_hours` entity with its own `id` and unique location/day pair.
- Composite `(user_id, badge_id)` ownership keys, separate from badge definitions.
- Crowd levels from 1 to 5; insert check-ins only after GPS AND QR validation,
  without verification-result columns.

Agree on the outstanding authentication lifecycle, access policies, cascade
behavior, and business rules before adding the first migration. Encode the
DBML's required fields, defaults, checks, and indexes explicitly in SQL.
Keep migrations in Git and generate TypeScript types from the implemented
PostgreSQL schema into `src/types/database.ts`.

The SDK, SSR library, CLI, and local configuration are ready. Application
migrations, RLS, connection modules, and authentication flows remain to be built.
No remote database changes have been made.

See [database migrations](https://supabase.com/docs/guides/local-development/database-migrations)
and [the project architecture](../docs/architecture.md).
