# PostgreSQL / Supabase

This folder prepares the repository for PostgreSQL hosted by Supabase.
It does not initialize a Supabase project or create database tables.

- `migrations/`: versioned SQL schema changes, indexes, constraints, and RLS
  policies. Use timestamped files such as `YYYYMMDDHHMMSS_create_locations.sql`.
- `seed.sql`: local development sample data once the schema is defined.

When database development begins, initialize the Supabase CLI configuration
here from the repository root. The CLI will create `supabase/config.toml`.
Local Supabase development also requires a compatible container runtime.

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

The Supabase SDK and SSR library are installed. The CLI, connection, SQL
migrations, authentication flows, and local database are not set up yet.
No remote database changes have been made.

See [database migrations](https://supabase.com/docs/guides/local-development/database-migrations)
and [the project architecture](../docs/architecture.md).
