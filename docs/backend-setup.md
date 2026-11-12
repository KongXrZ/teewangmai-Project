# Backend Development Setup

Use this guide before starting a BE task. The repository pins Supabase CLI
`2.118.0` as a development dependency and includes `supabase/config.toml`.
The application SDK and SSR library are already installed.

The migrations now define ten application tables, including building floors.
Supabase clients, Auth endpoints, and own-profile policies already exist.
Feature APIs and report business logic remain separate work. Use
[Database Design](database.md) for the applied model and remaining decisions.

## Prerequisites and first start

1. Use Node.js `24.14.0` from `.nvmrc` and npm.
2. Install and start Docker Desktop with Linux containers (or a compatible
   container runtime). Verify `docker version` can reach the server.
3. Start a task branch from the team's current `development` baseline, following
   [CONTRIBUTING](../CONTRIBUTING.md). Task branches merge back into `development`.
4. Run these commands from the repository root:

```sh
npm ci
npm run supabase -- --version
npm run db:start
```

On Windows PowerShell, use `npm.cmd` when execution policy blocks `npm.ps1`.
The first start downloads Docker images and may take several minutes. Local
development does not require Supabase login, a cloud project, or `supabase link`.
Do not run `supabase init` again: the configuration is already tracked.

The stable local project ID is `teewangmai`; it identifies Docker resources,
not a hosted Supabase project. The checked-in local database uses PostgreSQL 17.
Confirm the hosted database major version before connecting a cloud project.

| Local service | Address |
| --- | --- |
| Next.js app | `http://localhost:3000` |
| Supabase API | `http://127.0.0.1:54321` |
| PostgreSQL | `127.0.0.1:54322` |
| Supabase Studio | `http://127.0.0.1:54323` |
| Test email inbox | `http://127.0.0.1:54324` |

The CLI template also reserves ports for other local services, including the
shadow database on `54320`. See `supabase/config.toml` if another project uses
the same ports. Avoid starting multiple copies of this project simultaneously.

On Windows, check `netsh interface ipv4 show excludedportrange protocol=tcp`
if Docker reports that binding a port is forbidden. This machine currently
reserves `54322–54421`; the local verification stack uses a separate ignored
workdir/config with DB `15422`, Studio `15423`, inbox `15424`, and API `54321`.
The shared config and project ID are unchanged. Pass `--workdir <local-workdir>`
to CLI commands for a stack started this way; use the same reviewed migration
files in that workdir. Do not start a second stack with the same project ID.

## App environment

Copy `.env.example` to `.env.local` without overwriting an existing local file.
Run `npm run db:status` on your machine and copy the local API URL and publishable
key into `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
Restart the Next.js dev server after changing the environment.

Status output contains credentials: do not commit it or paste it into PRs.
Secret/service-role keys and database passwords must never use `NEXT_PUBLIC_`
variables. The Home shell works without these values; Auth requires valid
configuration and a running Supabase service.

Local Auth uses `http://localhost:3000`, with `http://127.0.0.1:3000` as an
additional redirect. Keep exact callback URLs aligned with the existing Auth flow.
Other generated Auth settings are local development defaults, not agreed
production policies. Test email stays in the local inbox.

## Shared commands

| Command | Purpose |
| --- | --- |
| `npm run db:start` | Start this project's local stack |
| `npm run db:stop` | Stop this project's stack while retaining local data |
| `npm run db:status` | Inspect local services and connection values |
| `npm run db:reset` | Rebuild the local database from migrations and seed data |
| `npm run db:migration:new -- descriptive_name` | Create an empty timestamped migration through the CLI |
| `npm run db:migration:list` | Compare repository migrations with the local database |
| `npm run db:types` | Generate `src/types/database.ts` from the local `public` schema; accepts `-- --workdir <local-workdir>` |
| `npm run supabase -- <command> --help` | Check the pinned CLI's available options |

`db:reset` explicitly targets **local** and deletes its current data; preserve
any local work first. `db:stop` retains data. The project has no remote deployment
script; do not add `--linked` or a remote connection URL to these local workflows.

## Schema and migration workflow

Agree on the relevant TBD decisions in [Database Design](database.md) before
implementing the affected table, policy, or business operation. Do not infer
RLS, cascade behavior, cooldown, or reward rules from this tooling setup.

For local schema exploration, apply SQL to the local database (Studio SQL editor
or the CLI) without recording each attempt as a migration:

```sh
npm run supabase -- db query --local --file path/to/local-draft.sql
npm run supabase -- db advisors --local
npm run supabase -- db pull describe_schema_change --local --yes
npm run db:migration:list
```

The file path above is illustrative; supply your own reviewed draft.
`db pull --local` captures the difference from existing migrations. Review its
generated SQL for required fields, defaults, foreign keys, checks, indexes,
grants, RLS, and agreed deletion behavior. Never edit Supabase-managed Auth tables
to implement a separate application login system.

For a migration authored directly as SQL, create its filename using
`npm run db:migration:new -- descriptive_name`, then edit the generated file.
Use one approach for a change so the same schema change is not recorded twice.
Keep existing shared migrations immutable; add a new migration for later fixes.

Verify reproducibility on a separate disposable local database. Run
`npm run db:reset` only when that database's contents can be discarded. For an
existing database, back up and test restore first, then apply reviewed migrations
with `npm run supabase -- migration up --local` and check migration history.
The floor migration refuses missing/blank legacy floor or QR mappings rather
than creating invented records. Apply the separate legacy-profile repair and
building/floor deletion-restriction migrations afterward. Previously migrated
databases apply only those pending versions. Keep `supabase/seed.sql` empty until approved
reference data is supplied; do not add mock application records.

After applying migrations, run the SQL assertions (PowerShell):

```powershell
docker cp supabase/tests/floor_schema.sql supabase_db_teewangmai:/tmp/floor_schema.sql
docker exec supabase_db_teewangmai psql -U postgres -d postgres --no-psqlrc -v ON_ERROR_STOP=1 -f /tmp/floor_schema.sql
```

The assertions check relations, indexes, RLS, profile column grants, and the
private Auth trigger. They use an existing profile for own-profile access checks
when available and roll back the no-op update. No account or fixture is created.
A database without profiles skips that behavioral check and still runs catalog
assertions. This suite does not test future GPS, cooldown, or aggregation logic.

## Generated types and review

After implementing and applying the schema, run `npm run db:types`. It writes
UTF-8 consistently on Windows/macOS/Linux and preserves the previous output
when the CLI fails. Do not hand-write placeholder database types or commit types
from an empty database as though the ten-table design were implemented.

Commit the migration, relevant SQL checks, regenerated types, and any
changed design documentation together. Before a BE PR, verify:

- Migrations reproduce the intended schema on a disposable local database and
  upgrade existing data without resetting it.
- Constraints reject invalid inputs and RLS enforces the agreed roles/ownership.
- Relevant local queries and database advisors have been checked.
- `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` pass.
- No credentials, CLI cache, or local reference documents are staged.

Stop the stack with `npm run db:stop` when finished. Starting or stopping this
local stack does not provision or deploy a hosted Supabase project.

References: [CLI setup](https://supabase.com/docs/guides/local-development/cli/getting-started),
[database migrations](https://supabase.com/docs/guides/local-development/database-migrations),
and [TypeScript generation](https://supabase.com/docs/guides/api/rest/generating-types).
