# Shared Types

Place types used by multiple features here. Types used by a single feature
belong in that feature's directory.

After the PostgreSQL schema is created, generate `database.ts` using Supabase's
type generator: run `npm run db:types` against the running local database after
applying migrations. The command preserves existing types on CLI failure and
writes UTF-8 on every platform. Do not add a placeholder schema or hand-edit
generated types. See [Backend Development Setup](../../docs/backend-setup.md).
