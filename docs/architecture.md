# Project Structure

TeeWangMai? is a mobile-first Next.js application. Its database is
PostgreSQL hosted by Supabase. The current migration model has nine application
tables, including flexible `locations.details` stored as PostgreSQL `jsonb`.

```text
src/
├── app/                        Next.js routes, layouts, and global styles
│   └── api/                    Route Handlers, including existing Auth endpoints
├── components/
│   ├── ui/                     Shared buttons, inputs, dialogs, etc.
│   └── layout/                 Shared mobile navigation and page shells
├── features/
│   ├── auth/                   Auth schemas, forms, and server operations
│   ├── home/                   Home UI and blank map placeholder
│   ├── campus-map/
│   │   └── components/         Custom image/3D map and interactive zones
│   ├── locations/
│   │   └── components/         Location cards and location details
│   ├── rewards/                Catalog UI, redemption dialog and view types
│   ├── achievements/           Badge UI, adapter, hook and view models
│   └── reports/                Reserved for the future verified check-in flow
├── hooks/                      Hooks reused across multiple features
├── lib/
│   └── supabase/               Browser/server clients and session helpers
└── types/                      Shared types and generated database types
public/
└── maps/
    ├── images/                 Custom map images
    └── models/                 3D map assets, if selected
supabase/
├── config.toml                Shared local Supabase configuration
├── migrations/                Versioned PostgreSQL schema and RLS changes
├── tests/                     SQL schema and access assertions
└── seed.sql                   Approved 35 buildings and 224 floors, preserving IDs/QRs
scripts/
└── generate-database-types.mjs Safe local database type generation
docs/
└── architecture.md            Structure and implementation conventions
.env.example                   Documented environment variables, without values
```

Folders containing `.gitkeep` are reserved for future implementation. They do
not create routes, API endpoints, or working product features.

## Where code belongs

- Keep `app/` focused on routing and page composition. Put reusable feature
  behavior in `features/`.
- Keep feature-specific types, validation, hooks, and data access next to their
  feature. Add `types.ts`, `schemas.ts`, `hooks/`, or `server/` there as needed.
- Move a component or hook to the shared folders when multiple features use it.
- Put database reads and writes behind feature-level server functions or Route
  Handlers. Keep server-only modules out of browser imports.
- Use the existing `@/*` alias for imports from `src/`.
- Start with Server Components. Use Client Components for interactions such as
  tapping a map zone or filling out a report form.

### Shared mobile components

| Component          | Import                                  | Usage                                                                                                                                                                           |
| ------------------ | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MobileShell`      | `@/components/layout/mobile-shell`      | Full-height page shell with a 476px maximum width; `variant="app"` applies the app background and lets each screen supply its own padding.                                      |
| `BottomNavigation` | `@/components/layout/bottom-navigation` | Five-item navigation UI. Use `selected` and `onChange` to control selection, or `defaultSelected` for local state. Home, locations and rewards route internally; scan/profile currently have no destination. |
| `SearchInput`      | `@/components/ui/search-input`          | Labeled search input accepting native input props, including `value`, `defaultValue`, and `onChange`. Supply `label`; an accessible input ID is generated when `id` is omitted. |
| `CrowdLevelFilter` | `@/components/ui/crowd-level-filter`    | Density filter with `selected`, `defaultSelected`, and `onChange`. It adapts to its own available width, so it can also be used outside the map.                                |

These controls own presentation and optional local state. Their callers handle
data fetching and filtering; `BottomNavigation` also routes its configured items.
`HomePage` and its blank
`MapPlaceholder` remain in `features/home/components` and compose these shared
controls. Filter values (`all`, `low`, `medium`, `high`) describe UI choices;
mapping reports on the 1–5 scale to these groups belongs to a later integration task.

The wireframes also include sign-up/login, a user profile with check-in history,
points and badges, and reward redemption. Trust/streak behavior remains TBD and
has no columns in the current `users` model. Auth is implemented in `features/auth`.
Rewards UI lives in `features/rewards`; badge displays, the adapter and view models
live in `features/achievements`. Profile UI remains future work; add its feature
folder when implementation begins rather than creating empty feature folders.

The reports feature owns the check-in flow: insert a row only after GPS AND QR
verification both succeed, with a crowd-level submission from 1 to 5. No separate
verification-result columns are needed. Map rendering consumes location summaries
without depending on the image or 3D format used to display them.

## Database boundary

Use `src/lib/supabase/` for connection infrastructure and `supabase/migrations/`
for schema changes. `client.ts` serves browser code and `server.ts` creates
request-scoped server clients; both already exist.

Generate `src/types/database.ts` from the actual database
and use it to type the clients. Keep UI/view types separate from generated rows.
Types have been regenerated after the approved building import, including
category arrays and v4 fields. Regenerate/review after subsequent migrations.

The current model consists of `users`, `locations`, `floors`, `floor_hours`,
`checkins`, `badges`, `user_badges`, `rewards`, and
`redemptions`. `users.id` is an integer application key; `users.auth_id` is a UUID
linked to Supabase `auth.users`. Auth owns authentication and is the source of
truth for email. `locations` represents buildings, `floors.location_id` belongs
to a building, and `checkins.floor_id` belongs to a floor. QR identifiers live
on floors. Buildings have unique canonical N/S codes, category arrays, search aliases and JSON
details. `floor_hours` has its own primary key and a unique floor/day pair.
Rewards have a last redemption time; each voucher expires `valid_days` after
its redemption, and successful exchanges and actual voucher use are separate. Check-in point awarding is deferred.
Keep badge definitions separate from ownership, whose primary key is
`(user_id, badge_id)`. See [the database baseline](database.md) for constraints
and decisions still awaiting agreement.

RLS is enabled on all nine tables. Only own-profile read/update policies are
currently open to clients; column grants restrict updates to name/avatar.
Auth uses browser-readable cookie sessions and request-scoped server clients.
Before enabling reports, implement trusted GPS/QR checks and the independent
30-minute user/floor cooldown. Floor summaries use the latest 30 minutes of
reports and refresh every 10 minutes using the BE-006 private snapshot and
pg_cron. See [Check-in Rules](check-in-rules.md) and [Crowd API](crowd-api.md).

Zod, React Hook Form, and its Zod resolver are already used by Auth forms and
validation. Keep schemas in each feature's `schemas.ts` and validate untrusted
input on the server as well. Zustand is available for client-side state management.
Material UI (`@mui/material`, `@mui/icons-material`, `@mui/material-nextjs`) is
integrated with App Router via `AppRouterCacheProvider`. The Supabase SDK and SSR
library are integrated with the existing Auth backend. Current generated database
types reflect the applied nine-table schema, including category arrays.

## Mobile and map assets

Build for narrow screens and touch first, following the mobile requirements in
the root README. Keep map rendering separate from report storage: the same
building/floor identity should connect a zone in an image or model to its report summary.

Files in `public/` are publicly accessible. Use `public/maps/images/` for map
images and `public/maps/models/` for models. The rendering format is still open;
only install a 3D library when it is needed.

## Current scope

Home, Location List/Detail, Rewards catalog/redemption dialog and Achievements
UI exist, alongside Auth UI/backend, Supabase clients and own-profile RLS.
Home's map remains blank pending its SVG. Location/reward routes currently pass
unavailable states; the Achievements adapter targets a badge API not yet implemented.
These pages do not demonstrate completed data integration or successful exchanges.
The nine-table v4 schema and category-array migration are applied locally. The 35
approved buildings and 224 floors are imported, with S7 inactive. Hours/reward/badge data
remains pending. Temporary weekday schedules are seeded. Building/floor catalog
APIs are implemented in BE-005, with public active-only RLS reads and no public
QR-column access; see [Location API](location-api.md). BE-006 implements
scheduled crowd snapshots and public `/api/crowd/...` APIs; frontend wiring is
separate. See [Crowd API](crowd-api.md). Other product APIs, verified check-ins,
reward transactions and badge awarding remain separate work.
Check-in +10 awarding is deferred. No hosted deployment is made by these changes.
See [Backend Handoff](backend-handoff.md) and [Backend Setup](backend-setup.md). Local
source presentations and diagrams are excluded from Git; their confirmed
requirements are summarized in the repository documentation.

References: [Supabase PostgreSQL database](https://supabase.com/docs/guides/database/overview),
[Next.js Supabase clients](https://supabase.com/docs/guides/auth/server-side/nextjs),
and [database migrations](https://supabase.com/docs/guides/local-development/database-migrations).
