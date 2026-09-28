# Project Structure

TeeWangMai? is a mobile-first Next.js application. The planned database is
PostgreSQL hosted by Supabase. The current ER/DBML design has nine entities;
the storage choice for the flexible `Location_Profiles` data remains open.

```text
src/
├── app/                        Next.js routes, layouts, and global styles
│   └── api/                    Future Route Handlers
├── components/
│   ├── ui/                     Shared buttons, inputs, dialogs, etc.
│   └── layout/                 Shared mobile navigation and page shells
├── features/
│   ├── campus-map/
│   │   └── components/         Custom image/3D map and interactive zones
│   ├── locations/
│   │   └── components/         Location cards and location details
│   └── reports/
│       └── components/         Crowd-level report forms and summaries
├── hooks/                      Hooks reused across multiple features
├── lib/
│   └── supabase/               Future Supabase clients and connection helpers
└── types/                      Shared types and future generated database types
public/
└── maps/
    ├── images/                 Custom map images
    └── models/                 3D map assets, if selected
supabase/
├── migrations/                Versioned PostgreSQL schema and RLS changes
└── seed.sql                   Future local development sample data
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

The wireframes also include sign-up/login, a user profile with check-in history,
points, streaks and badges, and reward redemption. Add `auth/`, `profile/`, and
`rewards/` under `features/` when implementation begins. Keep badge displays with
the profile feature initially; new empty feature folders are not needed yet.

The reports feature owns the check-in flow: GPS and QR verification followed by
a crowd-level submission from 1 to 5. Map rendering consumes location summaries
without depending on the image or 3D format used to display them.

## Database boundary

Use `src/lib/supabase/` for connection infrastructure and `supabase/migrations/`
for schema changes. The planned client files are `client.ts` for browser code
and `server.ts` for request-scoped server code; these are not implemented yet.

When the schema exists, generate `src/types/database.ts` from the actual database
and use it to type the clients. Keep UI/view types separate from generated rows.

The current model consists of `Users`, `Locations`, `Location_Hours`, `Checkins`,
`Badges`, `User_Badges`, `Rewards`, `Redemptions`, and `Location_Profiles`.
`Users.trust_score` supports floating-point values. Keep badge definitions and
the records of badges earned by users separate.

Before enabling reports, define database access policies, report validation,
and the precise rules for aggregation and expiry. Account sign-up and login are
planned; the authentication implementation remains undecided.
If Supabase Auth is selected, include cookie-based server clients and Next.js
session refresh handling as part of that implementation.

## Mobile and map assets

Build for narrow screens and touch first, following the mobile requirements in
the root README. Keep map rendering separate from report storage: the same
location ID should connect a zone in an image or model to its report summary.

Files in `public/` are publicly accessible. Use `public/maps/images/` for map
images and `public/maps/models/` for models. The rendering format is still open;
only install a 3D library when it is needed.

## Current scope

The landing page is functional. The feature folders, database connection,
and API folders are scaffolding. An ER/DBML design exists, but no SQL migration,
database, or authentication service is configured. The app still starts without
Supabase credentials. Local source presentations and diagrams are excluded from
Git; their confirmed requirements are summarized in the repository documentation.

References: [Supabase PostgreSQL database](https://supabase.com/docs/guides/database/overview),
[Next.js Supabase clients](https://supabase.com/docs/guides/auth/server-side/nextjs),
and [database migrations](https://supabase.com/docs/guides/local-development/database-migrations).
