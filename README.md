# TeeWangMai? — KMUTT Student Density Map

เว็บแอปพลิเคชันสำหรับดูระดับความหนาแน่นของนักศึกษาในสถานที่ต่าง ๆ ของมหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี (มจธ.)

**TeeWangMai? (ที่ว่างไหม?)** helps users answer a practical question: **"How crowded is this location at KMUTT?"** The name reflects the decision to visit a campus location, while the application's main purpose is to show estimated student density at each monitored location.

A web application for monitoring and visualizing student density across locations at **King Mongkut's University of Technology Thonburi (KMUTT)**, including cafeterias, libraries, study spaces, and common areas.

The system collects crowd-level reports through user check-ins and summarizes them by location on a custom campus mockup map. The map will be supplied as an image or a 3D model, with selectable zones representing campus locations. The check-in flow verifies presence with GPS and a QR code before users report a crowd level from 1 to 5.

The product is a **mobile-first web application**. Smartphone browsers are the primary target; tablet and desktop layouts will adapt from the mobile experience.

## Mobile-First Design

- Design the main flows for narrow portrait screens first, with a single-column layout. Check widths of 320, 360, 390, and 430 CSS pixels, plus landscape and larger screens.
- Keep body text readable, allow browser zoom, and avoid horizontal page scrolling.
- Respect screen safe areas and changes in the mobile browser's visible height.
- Make future buttons and map location targets at least 44 × 44 CSS pixels, with space between actions. Essential actions must work by tapping and keyboard, without depending on hover.
- Make viewing a location and reporting its crowd level easy to complete on a phone. Plan compact location details and short report forms.
- Keep map assets lightweight. If a 3D map is chosen, plan a lightweight image or location-list fallback for devices that cannot render it smoothly.

The app uses a mobile shell with a maximum width of 476 CSS pixels and viewport
height that follows the device, including safe-area handling. Home with the
campus map, Auth, Location List/Detail, Scan, Profile, Rewards/Vouchers and
Achievements UI exist. Orange `#FF5815`, dark `#081828` and MUI icons are already
used by shared navigation. Follow the supplied Figma for each UI task.

## Development Setup

The project uses **Next.js App Router, React, TypeScript, Tailwind CSS, and ESLint**.

The following supporting libraries are installed. They are ready for feature
development; Auth forms, validation schemas, and Supabase clients already exist.

| Library | Purpose |
| --- | --- |
| `zod` | Validate input and infer TypeScript types from schemas |
| `react-hook-form` | Manage interactive form state and errors |
| `@hookform/resolvers` | Connect Zod schemas to React Hook Form |
| `@supabase/supabase-js` | Access Supabase database and Auth APIs |
| `@supabase/ssr` | Support cookie-based Supabase clients for Next.js |
| `zustand` | Manage client-side global state (selected zone, map filters) |
| `@mui/material` & `@mui/icons-material` | Material UI component library and icons |
| `@mui/material-nextjs` | App Router integration cache provider for MUI |

See `package.json` for version requirements and `package-lock.json` for resolved
versions. Use `npm ci` for a reproducible install from the committed lockfile.

ESLint is kept on version 9 for compatibility with the React/import/accessibility plugins bundled by `eslint-config-next`. npm currently marks ESLint 9 as unsupported; upgrade it when those plugins support ESLint 10.

Use **Node.js 24** and npm. The shared development version is **24.14.0**, recorded in `.nvmrc`. Check `node --version` before installing dependencies; `package.json` and the lockfile both target Node.js 24.

```sh
npm install
npm run dev
```

Open [localhost:3000](http://localhost:3000).

On Windows PowerShell, use `npm.cmd` instead of `npm` if script execution is disabled.

```sh
npm run lint
npm run typecheck
npm run build
npm start
```

`npm start` serves the production build after `npm run build` completes.

For BE work, follow [Backend Development Setup](docs/backend-setup.md). Supabase
CLI is pinned as a dev dependency and local configuration is included. With
Docker running, use `npm run db:start`; stop it with `npm run db:stop`.

## Project Structure

```text
src/
├── app/           Next.js pages, layouts, and API routes
├── components/    Shared UI and mobile layout components
├── features/      Feature modules: auth, home, campus-map, locations,
│                  crowd, crowd-report, quick-scan, checkins, profile,
│                  rewards, achievements (reports/ is a reserved placeholder)
├── hooks/         Shared React hooks
├── lib/supabase/  Browser/server Supabase connection layer
└── types/         Shared and generated database types
public/maps/
├── images/        Custom map images
└── models/        Optional 3D map assets
supabase/
├── migrations/    Versioned PostgreSQL schema and access policies
├── tests/         SQL schema and access assertions (13 files)
└── seed.sql       Approved building and floor reference data
scripts/
├── generate-database-types.mjs  Local database type generation
└── generate-floor-qr.mjs        Floor QR print assets (npm run qr:generate)
docs/              Architecture, API contracts, database and setup guides
```

See [the architecture guide](docs/architecture.md) for folder responsibilities and conventions. Empty folders are tracked with `.gitkeep`; they are preparation for future implementation.

Pages present and connected to their APIs: Home with the SVG campus map and crowd
summaries, Location List/Detail with crowd levels and a crowd filter, Scan (QR resolve and verified check-in), Profile (edit, avatar
upload/delete, report history), Rewards (catalog, redemption, vouchers and voucher
QR) and Achievements, plus Login/Signup. Protected pages show
a guest state when signed out. BE-005 to BE-015 provide the building, crowd,
check-in, history, avatar, reward, voucher and badge APIs; see
[Backend Handoff](docs/backend-handoff.md). No mock application data is included.

## Database

The primary database is **PostgreSQL hosted by Supabase**. See [Supabase's database documentation](https://supabase.com/docs/guides/database/overview).

The current migrations define **nine application tables**: `users`, `locations`,
`floors`, `floor_hours`, `checkins`, `badges`, `user_badges`,
`rewards`, and `redemptions`. Locations represent buildings; each floor has its
own QR identifier, and reports reference `checkins.floor_id`. `users.id` is an
integer application key; `users.auth_id` links to Supabase `auth.users` by UUID.
Auth owns credentials and is the email source of truth. The model has no
`trust_score` or `current_streak` fields.

Buildings have required unique N/S codes, category arrays, search aliases and `locations.details`
JSON. `floor_hours` has a unique `(floor_id, day_of_week)` pair; Monday is 1 and
Sunday is 7. Rewards have a last redemption time (`expires_at`) and a per-user
limit (`max_per_user`); each voucher expires `valid_days` (default 7) after its own
redemption. Redemptions record successful exchanges separately from use. See [Database Design](docs/database.md),
[Reference Data](docs/reference-data.md) and [Backend Handoff](docs/backend-handoff.md).

`.env.example` lists the planned connection variables. When a Supabase project is available, copy it to `.env.local` and fill in the project URL and publishable key. The current landing page runs without these values. Keep database passwords and Supabase secret/service-role keys out of browser code and `NEXT_PUBLIC_` variables.

Supabase clients, Auth endpoints, versioned migrations and RLS policies exist:
six tables have client SELECT policies and `checkins`, `rewards` and
`redemptions` are reached only through `SECURITY DEFINER` RPCs. Migrations are
applied locally; nothing is deployed to Cloud. See [Backend Development Setup](docs/backend-setup.md)
for local startup, migrations, SQL assertions, and generated types. Local reference
files in `*LocalDocs-dont-commit/` are excluded from Git.

Local contains 35 approved buildings and 224 floors, with S7 inactive and blank source categories
set to อาคารเรียน. Database types have been regenerated for the current schema,
including `locations.category: string[]`. Floor rows have stable QR identifiers.
Hours/rewards/badges await their
reference records. Check-in +10 point awarding is deferred for this round.

Setup references: [Next.js installation](https://nextjs.org/docs/app/getting-started/installation) and [Tailwind CSS with Next.js](https://tailwindcss.com/docs/installation/framework-guides/nextjs).

---

## Problem

Students often travel to locations such as cafeterias, libraries, study spaces, or common areas without knowing how crowded those places currently are.

This can result in:

- Traveling to an already crowded location
- Difficulty comparing crowd levels across study or activity spaces
- Uneven distribution of people across campus
- Lack of information about peak usage periods

This project aims to make student density information across KMUTT locations easy to access and understand.

---

## Objective

The primary objective is to let users view and compare estimated student density across different locations at KMUTT.

The system aims to:

- Collect user reports of student density at selected KMUTT locations through GPS- and QR-verified check-ins
- Display each location's reported density level on a custom interactive campus map
- Update density information periodically and show the last update time
- Help users understand how crowded a location is before visiting
- Retain individual check-in history; historical summary charts are a future extension
- Encourage participation through points, badges, and reward redemption
- Support future analysis of campus usage patterns

Prediction and location recommendations are possible future extensions of this core purpose.

---

## System Concept

```text
User Logs In and Scans a Floor QR
    │
    ▼
Verify Presence with GPS + QR
    │
    ▼
User Reports Crowd Level (1–5)
    │
    ▼
Validate and Store Report
    │
    ▼
Aggregate Recent Reports by Floor
    │
    ▼
Location Density Summary
    │
    ▼
Web Application
    │
    ▼
Custom Campus Map (Image or 3D)
```

Each monitored building is a `location`, with individual `floors` beneath it.
Map zones are a presentation layer connected to these records.

For example:

```text
Campus
├── Library
│   ├── Floor 1
│   ├── Floor 2
│   └── Floor 3
├── Canteen
├── Learning Space
├── Sports Complex
└── Common Area
```

The system will summarize recent reports into a density level for each zone. These levels reflect users' observations; they do not provide measured headcounts or occupancy percentages.

Example:

```text
🟢 Low       Few people
🟡 Moderate  Moderately crowded
🔴 High      Very crowded
⚪ Unknown   No recent reports
```

Reports use a confirmed 1–5 scale. Each floor's current summary is the arithmetic
mean of reports from the **latest 30 minutes**, recalculated **every 10 minutes**.
No reports means null/unknown. BE-006 implements scheduled snapshots, score-based
labels and check-in-count/capacity percentages; building cards use the busiest
floor by count. See [Crowd API](docs/crowd-api.md) and [Check-in Rules](docs/check-in-rules.md).

---

## Data Collection

The primary data source is **reports submitted by users** about conditions at a selected campus location.

Users scan a floor QR, see its building/floor, select a crowd level from
**1 (empty) to 5 (very crowded)**, and submit. GPS verifies building proximity;
QR identifies the floor. The backend must accept the report only after **GPS AND
QR verification both succeed**, using a server timestamp. Raw user coordinates
and verification flags are not stored. The agreed cooldown is **30 minutes per
user per floor**, independent across floors/buildings. BE-008 implements this
in `POST /api/checkins/resolve` and `POST /api/checkins`.

The stored report contains `user_id`, resolved `floor_id`, `crowd_level`, and
server-assigned `created_at`. See [Check-in Rules](docs/check-in-rules.md) for the
GPS limits and error contract.

---

## Planned Core Features

### Interactive Campus Map

Users will view and compare KMUTT locations on a custom map supplied as an image or a 3D model. Selectable zones will link the map to location details and user reports.

Each zone will display a density summary based on recent reports.

```text
Library        🟡 Moderate
Canteen        🔴 High
Learning Space 🟢 Low
Sports Complex ⚪ No recent reports
```

### Accounts and Verified Check-ins

Supabase Auth endpoints and own-profile policies are implemented. Verified floor
check-ins (BE-008) validate the QR, GPS accuracy and distance, and enforce the
30-minute user/floor cooldown on the server before a report is accepted.

### Search and Filters

Users can search buildings by code, name, category or alias and view them on the map or as a list. Both the map and the list filter by crowd level. Filtering by whether a location is currently open is not implemented yet.

### Periodic Updates

The map will periodically fetch report summaries and show when a location was last reported. Freshness depends on users submitting new reports.

### Location Details

Selecting a location can display additional information such as:

- Reported density level
- Number of recent reports
- Time of the latest report
- Historical density summaries, if implemented in a later extension
- Building, floor, category, and opening hours
- Flexible details such as Wi-Fi, charging facilities, and food menus

### Profile, Participation, and Rewards

Profile shows points, report count, earned badges and report history, and
supports name and avatar edits. Rewards, vouchers and badges are
connected to their APIs. Exchange is an immediate atomic deduction of points and
stock with a completed redemption, limited by `max_per_user`. Each voucher expires
`valid_days` (default 7) after its own redemption; actual use is recorded separately.
Check-in +10 point awarding is deferred, and no earning mechanism is introduced
in this round. Streak/trust-score behavior from older wireframes remains outside
the current schema. Partner-store database integration is outside this scope.
See [Database Design](docs/database.md) and [Backend Handoff](docs/backend-handoff.md).

### Historical Data

Individual check-ins remain as historical logs after leaving the summary window,
and users can read their own history (BE-009). BE-006 keeps only the current
per-floor snapshot, refreshed by pg_cron every 10 minutes; a summary-history table
and density charts are future extensions.

Illustration of a possible future history display:

```text
Canteen

08:00  Low
10:00  Moderate
12:00  High
14:00  Moderate
16:00  No reports
```

---

## Future Features

Possible future improvements include:

**Crowd Prediction**

Use historical reports to estimate future crowd levels, once enough reliable data is available.

```text
Current
Canteen: High

Prediction
+30 min → Moderate
+60 min → Low
```

**Alternative Location Recommendation**

If a location is crowded, the system could recommend nearby alternatives.

```text
Canteen A
🔴 High

Alternative:
Canteen B
🟢 Low
```

**Peak-Time Analysis**

Analyze historical data to identify when locations are usually crowded.

**Notification System**

Users could receive notifications when a selected location becomes less crowded.

---

## Privacy

Privacy is an important consideration for this project.

The map should display aggregate crowd-level summaries without exposing individual reporters' identities.

The goal is to answer:

> "How crowded is this location?"

rather than:

> "Who is currently at this location?"

Any account information used for report validation should be kept separate from
public map data. Store a check-in only after both verification steps pass; do not
add verification-result columns or raw personal GPS coordinates. Reference
coordinates belong to the building. Reports are read and written only through
`SECURITY DEFINER` RPCs that return the caller's own data (`get_my_checkins`,
`submit_checkin`); a retention policy still needs agreement.

---

## Challenges

Several technical challenges need to be investigated during development:

- Handling subjective or conflicting reports
- Preventing spam and duplicate submissions
- Verifying GPS and QR check-ins while handling unavailable device permissions
- Defining point earning and badge requirements; implementing the agreed reward transactions
- Defining selectable zones on the custom map
- Choosing an image or 3D representation that works on mobile devices
- Implementing the 30-minute lookback, 10-minute refresh and unknown/empty state
- Deciding summary boundaries, labels/rounding and showing report freshness
- Collecting enough reports for useful summaries
- Scaling to many campus locations
- Privacy and data protection

---

## MVP Scope

The first version will focus on displaying user-reported student density for 3–5 selected locations at KMUTT on a custom map, with the main viewing and reporting flows designed for smartphone browsers.

Example MVP:

```text
3–5 Campus Zones
        ↓
Collect User Reports
        ↓
Summarize Recent Reports
        ↓
Store Report History
        ↓
Display on Custom Campus Map
```

Planned feature scope for these locations:

- Custom KMUTT map with selectable zones
- Zone management
- Search, filters, and location details with opening hours
- Sign-up/login and GPS + QR check-in verification
- Crowd-level report form using a 1–5 scale
- Reported density level per location
- Recent report count and last reported timestamp
- Unknown status for locations without recent reports
- Basic report history
- Profile, points, badges, and reward redemption

The implementation order and release boundary for participation and reward features still need to be agreed. Streak and trust-score behavior remains TBD outside the current schema. Advanced prediction and recommendation features will be considered after enough reliable user reports can be collected.

---

## Project Status

**Status:** The core journey works locally: Auth, the campus map and location
pages with crowd summaries, verified QR check-in, profile with history and
avatar, rewards and vouchers, and badges. The nine-table schema is verified
locally with 35 approved buildings, 224 floors and regenerated types. Real floor
hours and approved reward/badge records are still pending. Local verification
does not imply a Cloud deployment.

Current priorities:

1. Import real floor hours and approved reward/badge reference data
2. Fix open bugs and keep docs in step with the code
3. Verify the core journey, mobile permissions, transactions and error handling
   on real devices (FE-024/FE-025)
4. Plan the Cloud deployment and production configuration

These priorities describe work streams, not a requirement to wait for every
earlier item. UI work and APIs with independent inputs can proceed in parallel.

---

## Project Vision

The long-term goal is to make **TeeWangMai?** a useful source of student density information across KMUTT, built from community reports and presented on a custom campus map. Future analysis and prediction features will support this purpose as report coverage and quality improve.
