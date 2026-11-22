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
│   ├── auth/                   Auth schemas, forms, guest state and server operations
│   ├── home/                   Home page and map container
│   ├── campus-map/             SVG campus map, building shapes and map state
│   ├── locations/              Location list, building detail and their APIs
│   ├── crowd/                  Crowd summary API (server side)
│   ├── quick-scan/             Camera QR scanner
│   ├── crowd-report/           Check-in flow and crowd report form
│   ├── checkins/               Check-in API (server side)
│   ├── profile/                Profile, edit, avatar and report history
│   ├── rewards/                Catalog, redemption, vouchers and their APIs
│   ├── achievements/           Badge UI, adapter, hook and badge API
│   └── reports/                Empty placeholder (.gitkeep)
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
├── generate-database-types.mjs Safe local database type generation
└── generate-floor-qr.mjs      Floor QR print assets (npm run qr:generate)
docs/                          Architecture, API contracts, database and setup guides
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
| `BottomNavigation` | `@/components/layout/bottom-navigation` | Five-item navigation UI. Use `selected` and `onChange` to control selection, or `defaultSelected` for local state. All five items (home, places, scan, rewards, profile) route internally. |
| `SearchInput`      | `@/components/ui/search-input`          | Labeled search input accepting native input props, including `value`, `defaultValue`, and `onChange`. Supply `label`; an accessible input ID is generated when `id` is omitted. |
| `CrowdLevelFilter` | `@/components/ui/crowd-level-filter`    | Density filter with `selected`, `defaultSelected`, and `onChange`. It adapts to its own available width, so it can also be used outside the map.                                |

These controls own presentation and optional local state. Their callers handle
data fetching and filtering; `BottomNavigation` also routes its configured items.
`HomePage` in `features/home/components` composes these shared controls with the
`CampusMap` SVG map from `features/campus-map`. Filter values (`all`, `low`,
`medium`, `high`) map the 1–5 crowd score to groups as described in
[Crowd API](crowd-api.md).

The wireframes also include sign-up/login, a user profile with check-in history,
points and badges, and reward redemption. Trust/streak behavior remains TBD and
has no columns in the current `users` model. Auth is implemented in `features/auth`.
Rewards and vouchers live in `features/rewards`; badges live in
`features/achievements`; profile, avatar and report history live in
`features/profile`. Add a feature folder when its implementation begins rather
than creating empty feature folders.

`features/crowd-report` owns the check-in flow and `features/checkins` its API:
a row is inserted only after GPS AND QR verification both succeed, with a
crowd-level submission from 1 to 5. No separate
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

RLS is enabled on all nine tables. Six tables have client SELECT policies:
`users` (own profile, plus an own-profile UPDATE limited to name/avatar by column
grants), `locations`, `floors` and `floor_hours` (active catalog, anon and
authenticated), and `badges` and `user_badges` (active or own earned badges,
authenticated). Storage bucket `avatars` has own-folder SELECT/INSERT/DELETE
policies on `storage.objects`. The other three tables (`checkins`, `rewards`,
`redemptions`) have no client policies; they are reached only through
`SECURITY DEFINER` RPCs that check the caller.
Auth uses browser-readable cookie sessions and request-scoped server clients.
Check-ins pass trusted GPS/QR checks and the independent 30-minute user/floor
cooldown in BE-008's `submit_checkin`. Floor summaries use the latest 30 minutes of
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

Home (SVG campus map with crowd summaries), Location List/Detail, Scan, Profile,
Rewards/Vouchers and Achievements pages exist with Auth and are connected to
their APIs. The Location List shows crowd levels and filters by them (FE-029). The 35
approved buildings and 224 floors are imported, with S7 inactive; temporary
weekday schedules are seeded and real hours and reward/badge records are pending.
BE-005 provides the building/floor catalog with public active-only RLS reads and no
public QR-column access ([Location API](location-api.md)); BE-006 the scheduled
crowd snapshots and `/api/crowd/...` ([Crowd API](crowd-api.md)); BE-008/BE-009
verified check-ins and own history; BE-010/BE-015 avatars; BE-011/BE-012 reward
redemption and vouchers ([Rewards API](rewards-api.md)); BE-013 badge awarding.
Check-in +10 awarding is deferred. No hosted deployment is made by these changes.
See [Backend Handoff](backend-handoff.md) and [Backend Setup](backend-setup.md). Local
source presentations and diagrams are excluded from Git; their confirmed
requirements are summarized in the repository documentation.

References: [Supabase PostgreSQL database](https://supabase.com/docs/guides/database/overview),
[Next.js Supabase clients](https://supabase.com/docs/guides/auth/server-side/nextjs),
and [database migrations](https://supabase.com/docs/guides/local-development/database-migrations).
