# Building and Floor API — BE-005

Public reference-data reads for Home, Location List and Location Detail. No login
is required. Requests use the existing publishable-key server client and RLS;
no service-role key is needed. FE integration remains a separate task.

## Start locally

Follow [Local DB/API Quickstart](local-db-api-quickstart.md), apply the new
`add_public_building_catalog` migration and run the existing seed. The migration
adds SELECT policies/column grants and a parameterized search function. It does
not add tables, alter reference records or reset accounts.

```sh
npm run supabase -- migration up --local
npm run dev
```

Windows PowerShell can use `npm.cmd` instead of `npm`. Open
`http://localhost:3000/api/swagger` for the executable contract.

## Endpoints

| Request | Result |
| --- | --- |
| `GET /api/locations` | Paginated active buildings, derived building availability |
| `GET /api/locations/{locationId}` | Active building metadata, active floors and weekly hours |
| `GET /api/locations/{locationId}/floors/{floorId}` | Selected active floor belonging to that active building |

IDs are positive PostgreSQL integers, not building codes. Resolve N16 through
search and use the returned numeric `id` for detail requests. Inactive resources
behave like missing resources (404). An active building with no active floors
still exists: detail returns `floors: []` and unknown availability.

### Search and pagination

| Query | Default | Rules |
| --- | --- | --- |
| `q` | empty string | Trimmed, maximum 200 characters; case-insensitive literal substring across building code, name, alias members and category members |
| `category` | absent | Trimmed, nonempty, maximum 100 characters; case-insensitive exact category member |
| `page` | 1 | Integer 1–100000 |
| `limit` | 20 | Integer 1–50 |

Examples: `/api/locations?q=lx`, `/api/locations?q=N16`,
`/api/locations?page=2&limit=10`. URL-encode Thai keywords/category values.
Search terms are function arguments, not concatenated SQL/PostgREST filters.
`%`, `_`, commas and parentheses are literal search characters, not wildcards.
Unknown or repeated query keys return 400. Search uses AND with category filtering.

Ordering is always `id ASC`; each building appears once even if several aliases
match. Response envelope:

- `success: true`
- `data`: array of building objects
- `pagination`: `page`, `limit`, exact `total`, `total_pages`
- `meta`: `timezone: "Asia/Bangkok"`, `day_of_week`, `evaluated_at` (ISO timestamp)

No matches and pages beyond the last page return 200 with `data: []`. The latter
preserves the exact matching total. An empty result has `total_pages: 0`.
This is offset pagination; concurrent reference-data changes can move page boundaries.

### Building and floor fields

Building objects contain `id`, `building`, `name`, `category` and `aliases` as
arrays, nullable `image_url`, JSON object `details`, `floor_count`, and
`availability`. `floor_count` counts active visible floors only. Detail additionally
includes `floors`, sorted naturally by `floor_name` then ID (1, 2, …, 10).

Floor objects contain `id`, `location_id`, `floor_name`, nullable `capacity`,
`hours` and `availability`. Weekly `hours` are ordered by day and contain
`day_of_week`, `open_time`, `close_time`, `is_active`. Monday=1, Sunday=7.
Disabled day rows are included so FE can distinguish a closed day from an
unknown schedule. Building `details` remain building metadata, not per-floor metadata.

Successful detail/floor responses use `{ success: true, data, meta }`.
QR identifiers, GPS coordinates, user information and activity logs are not part
of these DTOs. Floor QR identifiers also have no SELECT grant for public readers.
No crowd average, density percentage, estimated people or check-in eligibility is
invented here; crowd summaries belong to BE-006.

## Availability and display hours

All evaluations use one server timestamp per request in Asia/Bangkok. There is
no client-supplied time override. Availability contains:

- `status`: `open`, `closed` or `unknown` at the evaluation time.
- `today_intervals`: known calendar-day coverage as `open_time`/`close_time` pairs.
- `display_hours`: merged interval text for display, or `null` if none is known.

Rules:

1. Today's enabled schedule opens at `open_time` inclusive and closes at
   `close_time` exclusive. `00:00:00–23:59:59` explicitly represents the entire day,
   including the final second. Equal open/close times represent no opening interval.
2. If closing is earlier than opening, the schedule continues into tomorrow.
   An enabled previous-day overnight schedule is also checked, including Sunday
   into Monday. Disabling a day prevents openings starting on that day; it does
   not cancel a valid carry-over from the previous day.
3. Without today's row, status is unknown unless a known previous-day overnight
   opening is currently active. A disabled row means closed outside any carry-over.
   Missing days are never silently filled using SQL column defaults.
4. Building status is open if any visible floor is open. Otherwise it is unknown
   if any floor is unknown or there are no active floors, and closed otherwise.
5. Building display coverage is the union of visible floors' known opening
   intervals, preserving gaps. Label it as hours when **at least one floor** is
   scheduled open; it is not the schedule of every floor. If one floor opens
   08:00–22:00 and another 08:00–16:00, building coverage is 08:00–22:00.
6. Display coverage is clipped to the current calendar day. `24:00:00` means the
   end of today in derived output; stored full-day rows remain
   `00:00:00–23:59:59`. Overlapping or adjacent intervals merge. For uncertain
   schedules, intervals describe only known coverage; always display status separately.

Current seed hours are temporary Mon–Fri 08:00–17:00. Saturday/Sunday rows do not
exist, so a weekend request correctly returns unknown rather than asserting closed.
Replacing those schedules with approved hours requires no API change.

## Errors and caching

Errors use `{ success: false, code, error }`:

| HTTP | Code | Meaning |
| --- | --- | --- |
| 400 | `validation` | Invalid ID/query, duplicate or unknown query key |
| 404 | `not_found` | Resource missing/inactive, or floor does not belong to building |
| 503 | `unavailable` | Configuration, database or upstream service failure |

Database/internal error messages never appear in responses. An upstream failure
does not become an empty list. All responses use `Cache-Control: private, no-store`
so availability is not served from a stale response cache.

## Verification

Unit checks run with `npm test`; hour-boundary fixtures are test inputs only,
not application seed data. Native Node tests import pure TypeScript helpers using
`.ts`; `allowImportingTsExtensions` is enabled with the existing `noEmit` setup.

With the app running against the approved Local dataset, run the read-only HTTP
contract test explicitly. Normal unit runs skip this integration test.

PowerShell:

```powershell
$env:LOCATION_API_TEST_URL='http://localhost:3000'
node --test tests/location-catalog.integration.test.mjs
Remove-Item Env:LOCATION_API_TEST_URL
```

macOS:

```sh
LOCATION_API_TEST_URL=http://localhost:3000 node --test tests/location-catalog.integration.test.mjs
```

Run database permissions/visibility checks against the existing seed. The script
temporarily disables existing reference rows inside a rolled-back transaction;
it never inserts application fixtures or leaves changed records.

```sh
docker cp supabase/tests/building_catalog.sql supabase_db_teewangmai:/tmp/building_catalog.sql
docker exec supabase_db_teewangmai psql -U postgres -d postgres -X -v ON_ERROR_STOP=1 -f /tmp/building_catalog.sql
```

The HTTP check covers real code/name/alias/category search, deterministic pages,
an out-of-range page, detail, selected-floor ownership, invalid IDs, missing
resources and output exclusions. SQL checks cover anon/authenticated visibility,
inactive parent/child filtering, no catalog writes and no QR-column access.
