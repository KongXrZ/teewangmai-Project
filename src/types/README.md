# Shared Types

Place types used by multiple features here. Types used by a single feature
belong in that feature's directory.

The Local PostgreSQL schema is v4. `database.ts` currently reflects v3 because
the owner deferred regeneration until approved real-data import. Existing Auth
columns are unchanged; this file is not evidence that v4 columns are typed yet.

When that step is ready, run `npm run db:types` against the running Local database
after applying migrations, then review and commit the output before adding new
typed v4 queries. The command preserves existing types on CLI failure and
writes UTF-8 on every platform. Do not add a placeholder schema or hand-edit
generated types. See [Backend Development Setup](../../docs/backend-setup.md).
