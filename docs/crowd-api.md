# Crowd summaries — BE-006

Product rules confirmed November 16, 2026. This branch starts from `development`,
independently of BE-005. Its additive `/api/crowd/...` routes leave catalog routes
to BE-005. Frontend API wiring is a separate integration task.

## Calculation

- A single database job refreshes all active floors every 10 minutes (`*/10 * * * *`).
- For calculation time T, include accepted check-ins in **(T − 30 minutes, T]**.
  The lower boundary is excluded so reports exactly 30 minutes apart do not both
  contribute at a cooldown boundary. Future timestamps are excluded.
- `estimated_people` and `report_count` both equal COUNT(checkins), as requested.
  This counts reports, not distinct users. Trusted acceptance/cooldown is BE-008.
- `density_percent = report_count / capacity * 100`. For 250 reports and capacity
  500, return 50. Preserve fractional percentages and values above 100; UI rounding
  must not change the source value. Null capacity gives a null percentage.
- `current_crowd_level` is the unrounded arithmetic mean of reported 1–5 scores.
  `level` is low for scores below 2.5, medium from 2.5 to below 3.5, high from 3.5.
  Thus percentage and label describe separate measurements.
- With no reports, count/estimated people are 0; score, label, percentage and
  latest report time are null (`status: unknown`). Zero reports does not prove empty.
- A building card copies the summary of the floor with the **greatest count**,
  not the greatest percentage or score. Ties use natural floor order, then ID.
  Detail returns `default_floor_id` for floor_name `1`, falling back to the first
  naturally sorted active floor. The existing detail component also prefers floor 1.
- Snapshot fields update together; capacity changes apply at the next refresh.
  CSV imports must preserve floor/building identities. Timing stays fixed; admin
  configuration and updated CSV imports are separate tasks.

## Public API

| GET | data |
| --- | --- |
| `/api/crowd/locations` | Building cards with `location_id`, `default_floor_id`, `busiest_floor` |
| `/api/crowd/locations/{locationId}` | Same building fields plus naturally sorted `floors` |
| `/api/crowd/locations/{locationId}/floors/{floorId}` | Selected floor summary, enforcing building ownership |

Each floor exposes floor ID/name, snapshot capacity, status, counts, mean score,
level, percentage, latest included report timestamp, `calculated_at` and
`window_start`. Success uses `{success:true,data,meta}`. Meta declares the fixed
30-minute lookback, 10-minute refresh and 20-minute stale threshold.

All responses are `private, no-store`. Invalid positive-integer IDs, unknown or
repeated query parameters return 400 (these endpoints accept no query parameters).
Missing/inactive resources and buildings without active floors return 404 on detail;
the list only includes buildings with active floors. Upstream failures return 503
without internal error details. Empty lists return 200.

New floors awaiting their first refresh return `pending`. Snapshots at least
20 minutes old return `stale`, suppressing counts/score/percentage while preserving
the calculation timestamp. Inspect `cron.job_run_details` for failures, then retry
the private refresh as the database owner. A failed refresh rolls back as a unit;
the next scheduled run retries normally. History is never deleted by refresh.

## Database and verification

The private RLS-enabled snapshot table has no browser access. A narrowly scoped
`SECURITY DEFINER` RPC exposes only aggregate fields of currently active floors
and parents; it has an empty search path and no dynamic SQL. Anonymous and signed-in
readers may call it. They cannot run refresh, write snapshots, or read check-in
identities, QR identifiers, GPS or individual reports through this API.

Apply the migration locally using the repository migration workflow. It enables
`pg_cron`, populates the first snapshot and registers the job. No seed reports or
mock operational data are added. Existing `(floor_id, created_at)` report index
supports the rolling-window query. Keep the job under the database owner;
Supabase Local/hosted Postgres must support pg_cron.

Run `npm test`, `npm run lint`, `npm run typecheck` and `npm run build` on Node 24.
For the read-only HTTP integration check against a configured running app, set
`CROWD_API_TEST_URL=http://localhost:3000` and run
`node --test tests/crowd-api.integration.test.mjs`. Normal unit runs skip it.
Run SQL integration assertions (synthetic fixtures roll back):

```powershell
Get-Content supabase/tests/crowd_summaries.sql -Raw | docker exec -i supabase_db_teewangmai psql -U postgres -d postgres -X -v ON_ERROR_STOP=1
```

Open `/api/swagger` for executable API documentation. For manual job inspection:

```sql
select jobname, schedule, active from cron.job
where jobname = 'refresh-floor-crowd-summaries';
select status, return_message, start_time, end_time from cron.job_run_details
where jobid = (select jobid from cron.job where jobname = 'refresh-floor-crowd-summaries')
order by runid desc limit 5;
```

Scheduler reference: [Supabase Cron](https://supabase.com/docs/guides/cron/quickstart).
