# Backend Development Setup

Use this guide before starting a BE task. The repository pins Supabase CLI
`2.118.0` as a development dependency and includes `supabase/config.toml`.
The application SDK and SSR library are already installed.

The migrations now define nine application tables, including per-floor hours.
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
if Docker reports that binding a port is forbidden. Excluded ranges can change;
verify current ports with `docker ps` instead of assuming an old local override.
If using an ignored workdir/config with different ports, pass
`--workdir <local-workdir>` consistently and use the same reviewed migrations.
Do not start a second stack with the same project ID. November 15 Local
verification used the shared ports listed above.

## App environment

Copy `.env.example` to `.env.local` without overwriting an existing local file.
Run `npm run db:status` on your machine and copy the local API URL and publishable
key into `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
Set `NEXT_PUBLIC_SITE_URL=http://localhost:3000` for Local signup callbacks.
The signup action requires this value. For the shared Local configuration:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=replace-with-your-local-publishable-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Replace the key with the publishable key from your own `db:status` output.
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

## Team database and API check

Use a checkout that includes BE-004. During its review, select the BE-004 branch
to verify this dataset. After it merges, use the updated development branch as
the base for new tickets. Complete first start and App environment above, then
apply pending Local migrations, load reference data and start Next.js:

```powershell
npm run supabase -- migration up --local
docker cp supabase/seed.sql supabase_db_teewangmai:/tmp/teewangmai-seed.sql
docker exec supabase_db_teewangmai psql -U postgres -d postgres --no-psqlrc -v ON_ERROR_STOP=1 -f /tmp/teewangmai-seed.sql
npm run dev
```

On a fresh Local database, expected reference counts are 35 locations, 224 floors
and 1,120 floor-hours rows. The hours currently cover Monday–Friday 08:00–17:00
as temporary schedules pending the actual per-floor CSV. Inspect these counts in
Studio (`http://127.0.0.1:54323`) or Dataflare using the PostgreSQL connection
from your own Local status output. Each developer's accounts are stored in their
own Local database. Create a Local account through `/signup` or the signup API.

Open `http://localhost:3000/api/swagger` in the same browser used for login.
Keep `localhost:3000` as the app origin throughout the test. JSON POST requests
use `Content-Type: application/json`. Auth routes manage the session through
browser cookies. In Postman or another API client, enable its cookie jar.

| Step | Request | Expected result |
| --- | --- | --- |
| 1 | `GET /api/health` | 200 and service status |
| 2 | `GET /api/auth/me` in a signed-out browser | 401 |
| 3 | `POST /api/auth/signup` with own `name`, `email`, `password` | 200 and `requiresEmailConfirmation` |
| 4 | `POST /api/auth/login` with that `email`, `password` | 200 and a browser session cookie |
| 5 | `GET /api/auth/me` | 200 with the signed-in user and own profile |
| 6 | `POST /api/auth/logout` | 200 |
| 7 | `GET /api/auth/me` | 401 |

Names use 2–50 characters and passwords 8–100. The shared Local configuration
currently has email confirmation disabled. If a developer enables confirmation,
complete the email link in the Local inbox (`http://127.0.0.1:54324`) before login.
Use the same browser for signup and its PKCE confirmation link.

`/api/health` reports application availability. Verify DB connectivity through
reference queries and authenticated profile reads. A 503 from Auth routes means
the Auth/profile service or configuration needs inspection. Check Docker, the
three environment values and the server terminal. Signup/login responses are
documented in [Frontend Integration](frontend-integration.md).

Available product APIs are listed in [Backend Handoff](backend-handoff.md).
Building/floor reads are implemented in BE-005; see [Location API](location-api.md)
for contracts and verification. Summaries remain BE-006. The catalog uses seeded
reference data while real schedules are being collected.

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
databases apply only those pending versions. `supabase/seed.sql` contains 35
approved real buildings, 224 expanded floors, and 1,120 temporary dummy weekday
`floor_hours` rows (Mon–Fri `08:00:00`–`17:00:00`, active); real floor hours
from CSV, rewards, and badges await approved data.

The v4 forward migration adds building codes/aliases/details, floor capacity,
floor hours and voucher expiry/use fields. It rejects ambiguous codes, building
hours without floors, missing reward deadlines and any unmapped legacy
redemptions. See [Database Design](database.md) for exact migration mappings.
November 15 Local migration ran without a backup by explicit owner instruction;
no reset was performed. That one-time decision is not a shared deployment rule.

The following migration makes building `category` a required `text[]`. The
approved seed fills blank categories with อาคารเรียน and sets S7 inactive.
The floor dataset expands total counts to one row per floor, defaulting blank
totals to one. New floors receive UUID QR identifiers, and existing IDs/QRs are
preserved. To load/update the approved reference data on an existing Local database:

```powershell
npm run supabase -- migration up --local
docker cp supabase/seed.sql supabase_db_teewangmai:/tmp/teewangmai-seed.sql
docker exec supabase_db_teewangmai psql -U postgres -d postgres --no-psqlrc -v ON_ERROR_STOP=1 -f /tmp/teewangmai-seed.sql
npm run db:types
```

The seed is transactional and matches buildings by code and floors by
`(location_id, floor_name)`, preserving IDs, QR identifiers and
operational records. It refreshes approved metadata including the active switch
and description, preserving other detail keys. Source row numbers are not IDs.

After applying migrations, run the SQL assertions (PowerShell):

```powershell
docker cp supabase/tests/floor_schema.sql supabase_db_teewangmai:/tmp/floor_schema.sql
docker exec supabase_db_teewangmai psql -U postgres -d postgres --no-psqlrc -v ON_ERROR_STOP=1 -f /tmp/floor_schema.sql
docker cp supabase/tests/reference_v4.sql supabase_db_teewangmai:/tmp/reference_v4.sql
docker exec supabase_db_teewangmai psql -U postgres -d postgres --no-psqlrc -v ON_ERROR_STOP=1 -f /tmp/reference_v4.sql
docker cp supabase/tests/location_seed.sql supabase_db_teewangmai:/tmp/location_seed.sql
docker exec supabase_db_teewangmai psql -U postgres -d postgres --no-psqlrc -v ON_ERROR_STOP=1 -f /tmp/location_seed.sql
docker cp supabase/tests/floor_seed.sql supabase_db_teewangmai:/tmp/floor_seed.sql
docker exec supabase_db_teewangmai psql -U postgres -d postgres --no-psqlrc -v ON_ERROR_STOP=1 -f /tmp/floor_seed.sql
docker cp supabase/tests/floor_hours_seed.sql supabase_db_teewangmai:/tmp/floor_hours_seed.sql
docker exec supabase_db_teewangmai psql -U postgres -d postgres --no-psqlrc -v ON_ERROR_STOP=1 -f /tmp/floor_hours_seed.sql
docker cp supabase/tests/rewards_redemption.sql supabase_db_teewangmai:/tmp/rewards_redemption.sql
docker exec supabase_db_teewangmai psql -U postgres -d postgres --no-psqlrc -v ON_ERROR_STOP=1 -f /tmp/rewards_redemption.sql
docker cp supabase/tests/checkin_history.sql supabase_db_teewangmai:/tmp/checkin_history.sql
docker exec supabase_db_teewangmai psql -U postgres -d postgres --no-psqlrc -v ON_ERROR_STOP=1 -f /tmp/checkin_history.sql
docker cp supabase/tests/verified_checkin.sql supabase_db_teewangmai:/tmp/verified_checkin.sql
docker exec supabase_db_teewangmai psql -U postgres -d postgres --no-psqlrc -v ON_ERROR_STOP=1 -f /tmp/verified_checkin.sql
```

`floor_schema.sql` checks relations, indexes, RLS, profile column grants, and the
private Auth trigger. They use an existing profile for own-profile access checks
when available and roll back the no-op update. No account or fixture is created.
A database without profiles skips that behavioral check and still runs catalog
assertions. This suite does not test future GPS, cooldown, or aggregation logic.
`reference_v4.sql` exercises defaults, constraints and new-table grants using
transactional SQL fixtures that roll back. These are not application seed/mock
data. Identity sequences may advance despite rollback; IDs need not be gapless.
Voucher-row assertions need an existing account and are explicitly skipped if
none exists. Disposable fresh replay uses minimal managed-Auth dependencies;
real Local checks verify the existing profile trigger/access against Supabase.
`location_seed.sql` checks the category array type and approved building records,
including multiple categories, default category, parsed aliases and inactive S7.
`floor_seed.sql` checks the approved 224-floor expansion, blank-total fallback,
per-floor capacity/activity and generated QR identifier format.
`rewards_redemption.sql` creates two throwaway accounts and rewards inside a
rolled-back transaction and checks catalog availability, redemption, replay,
per-user limits, stock, voucher status and that anon cannot call the functions.
`checkin_history.sql` creates throwaway accounts and reports inside a rolled-back
transaction and checks own-only history, paging over equal timestamps, old
reports, empty history, the bounded limit and that anon cannot call it.
`verified_checkin.sql` creates throwaway accounts, a building and floors inside a
rolled-back transaction and checks input validation, unknown/inactive QR, GPS
accuracy and distance limits, the per-user/per-floor 30-minute cooldown and its
exact boundary, and that rejected submissions write nothing.
`floor_hours_seed.sql` checks the 1,120 weekday `floor_hours` rows
(Monday–Friday `08:00:00`–`17:00:00`, active, with Saturday–Sunday omitted). Fresh replay and
existing-data import verification also check repeated imports preserve IDs,
QR identifiers and sequences, and failed imports roll back as a batch.

## Generated types and review

Normally, after applying the schema, run `npm run db:types`. It writes
UTF-8 consistently on Windows/macOS/Linux and preserves the previous output
when the CLI fails. Do not hand-write placeholder database types or commit types
from an empty database as though the nine-table design were implemented.

The deferred v4 generation step is complete after the approved building import.
`src/types/database.ts` now includes category arrays and the current nine-table
schema. Regenerate after future schema changes and review the resulting diff.

Commit migration/SQL checks and relevant docs in reviewable changes. Include
regenerated types after schema changes. Before a BE PR, verify:

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
