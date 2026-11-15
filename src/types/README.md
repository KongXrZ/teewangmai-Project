# Shared Types

Place types used by multiple features here. Types used by a single feature
belong in that feature's directory.

`database.ts` is generated from the current Local nine-table schema after the
approved building import. It includes v4 tables/fields and category arrays
(`locations.category` is `string[]`).

After schema changes, run `npm run db:types` against the running Local database
after applying migrations, then review and commit the output before adding new
typed v4 queries. The command preserves existing types on CLI failure and
writes UTF-8 on every platform. Do not add a placeholder schema or hand-edit
generated types. See [Backend Development Setup](../../docs/backend-setup.md).
