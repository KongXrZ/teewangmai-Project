# PostgreSQL / Supabase

This folder prepares the repository for PostgreSQL hosted by Supabase.
It does not initialize a Supabase project or create database tables.

- `migrations/`: versioned SQL schema changes, indexes, constraints, and RLS
  policies. Use timestamped files such as `YYYYMMDDHHMMSS_create_locations.sql`.
- `seed.sql`: local development sample data once the schema is defined.

When database development begins, initialize the Supabase CLI configuration
here from the repository root. The CLI will create `supabase/config.toml`.
Local Supabase development also requires a compatible container runtime.

The latest ER/DBML design has nine entities: `Users`, `Locations`,
`Location_Hours`, `Checkins`, `Badges`, `User_Badges`, `Rewards`, `Redemptions`,
and `Location_Profiles`. `Users.trust_score` is a floating-point value.

Confirm the physical schema, authentication integration, and access policies
before adding the first migration. The DBML still marks `Location_Profiles` as
NoSQL with JSON details; its storage choice is not finalized. Keep migrations
in Git and generate TypeScript types from the implemented PostgreSQL schema
into `src/types/database.ts`.

The CLI, connection, SQL migrations, authentication, and local database are not
set up yet. No remote database changes have been made.

See [database migrations](https://supabase.com/docs/guides/local-development/database-migrations)
and [the project architecture](../docs/architecture.md).
