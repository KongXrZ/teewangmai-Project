# TeeWangMai? — KMUTT Student Density Map

เว็บแอปพลิเคชันสำหรับดูระดับความหนาแน่นของนักศึกษาในสถานที่ต่าง ๆ ของมหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี (มจธ.)

**TeeWangMai? (ที่ว่างไหม?)** helps users answer a practical question: **"How crowded is this location at KMUTT?"** The name reflects the decision to visit a campus location, while the application's main purpose is to show estimated student density at each monitored location.

A web application for monitoring and visualizing student density across locations at **King Mongkut's University of Technology Thonburi (KMUTT)**, including cafeterias, libraries, study spaces, and common areas.

The system collects crowd-level reports through user check-ins and summarizes them by location on a custom campus mockup map. The map will be supplied as an image or a 3D model, with selectable zones representing campus locations. The planned check-in flow verifies presence with GPS and a QR code before users report a crowd level from 1 to 5.

The product is a **mobile-first web application**. Smartphone browsers are the primary target; tablet and desktop layouts will adapt from the mobile experience.

## Mobile-First Design

- Design the main flows for narrow portrait screens first, with a single-column layout. Check widths of 320, 360, 390, and 430 CSS pixels, plus landscape and larger screens.
- Keep body text readable, allow browser zoom, and avoid horizontal page scrolling.
- Respect screen safe areas and changes in the mobile browser's visible height.
- Make future buttons and map location targets at least 44 × 44 CSS pixels, with space between actions. Essential actions must work by tapping and keyboard, without depending on hover.
- Make viewing a location and reporting its crowd level easy to complete on a phone. Plan compact location details and short report forms.
- Keep map assets lightweight. If a 3D map is chosen, plan a lightweight image or location-list fallback for devices that cannot render it smoothly.

The starter includes a responsive landing page, viewport configuration, and a reusable safe-area padding utility. Map interactions and reporting flows will be implemented with these mobile requirements in mind. The existing wireframes are mid-fidelity references; final colors and icons are not defined yet.

## Development Setup

The project uses **Next.js App Router, React, TypeScript, Tailwind CSS, and ESLint**.

ESLint is kept on version 9 for compatibility with the React/import/accessibility plugins bundled by `eslint-config-next`. npm currently marks ESLint 9 as unsupported; upgrade it when those plugins support ESLint 10.

Use Node.js 22 or newer (Node.js 24 is used for local development) and npm:

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

## Project Structure

```text
src/
├── app/           Next.js pages, layouts, and future API routes
├── components/    Shared UI and mobile layout components
├── features/      Campus map, locations, and crowd reports
├── hooks/         Shared React hooks
├── lib/supabase/  Planned Supabase connection layer
└── types/         Shared and future generated database types
public/maps/
├── images/        Custom map images
└── models/        Optional 3D map assets
supabase/
├── migrations/    Future PostgreSQL schema and access policies
└── seed.sql       Future local development sample data
docs/              Architecture and development notes
```

See [the architecture guide](docs/architecture.md) for folder responsibilities and conventions. Empty folders are tracked with `.gitkeep`; they are preparation for future implementation.

The starter currently contains a landing page only. Sign-up/login, verified check-ins, database integration, report aggregation, the interactive map, and participation/reward features are planned. Add their feature folders when implementation starts. The map format is still undecided; a 3D renderer can be added when a model format is selected.

## Planned Database

The planned primary database is **PostgreSQL hosted by Supabase**. See [Supabase's database documentation](https://supabase.com/docs/guides/database/overview).

The latest ER/DBML design has **nine entities**: `Users`, `Locations`, `Location_Hours`, `Checkins`, `Badges`, `User_Badges`, `Rewards`, `Redemptions`, and `Location_Profiles`. `Users.trust_score` is a **float**. This replaces the older presentation's eight-table description.

The DBML still labels `Location_Profiles` as NoSQL for flexible JSON details such as menus and charging facilities. Its physical storage has not been finalized. See [the database design](docs/database.md) for the fields, relationships, and remaining decisions.

`.env.example` lists the planned connection variables. When a Supabase project is available, copy it to `.env.local` and fill in the project URL and publishable key. The current landing page runs without these values. Keep database passwords and Supabase secret/service-role keys out of browser code and `NEXT_PUBLIC_` variables.

An ER/DBML design exists, but the Supabase SDK, CLI configuration, SQL migrations, and authentication are not installed or configured yet. See [the database folder](supabase/README.md) for the next steps. Local reference files in `*LocalDocs-dont-commit/` are excluded from Git.

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
- Store historical report summaries to show how density changes over time
- Encourage participation through points, streaks, badges, and reward redemption
- Support future analysis of campus usage patterns

Prediction and location recommendations are possible future extensions of this core purpose.

---

## System Concept

```text
User Selects a Location
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
Aggregate Recent Reports by Zone
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

Each monitored location at KMUTT is represented as a **Zone**.

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

Reports use a 1–5 scale; the labels above illustrate map summaries, with the exact mapping still to be defined. The presentation proposes a 10–15 minute reporting window and at least two agreeing reports. The precise aggregation, agreement, and expiry rules will be defined before implementation. Zones without sufficient recent reports should show an unknown status.

---

## Data Collection

The primary data source is **reports submitted by users** about conditions at a selected campus location.

Users will select a location, complete GPS and QR verification, and report a crowd level from **1 (empty) to 5 (very crowded)**. The wireframe includes QR scanning and manual code entry. The backend will validate and timestamp each report, then summarize recent reports for display on the map. Verification and aggregation rules are still being designed.

Example:

```json
{
  "location_id": 2,
  "crowd_level": 3,
  "created_at": "2026-09-28T14:30:00+07:00"
}
```

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

The wireframes include sign-up and login. Users will select a location, complete GPS and QR verification, and submit its observed crowd level from 1 to 5. The authentication provider and detailed verification rules remain to be selected.

### Search and Filters

Users will be able to search locations, view them as a list, and filter by building, category, and whether a location is currently open.

### Periodic Updates

The map will periodically fetch report summaries and show when a location was last reported. Freshness depends on users submitting new reports.

### Location Details

Selecting a location can display additional information such as:

- Reported density level
- Number of recent reports
- Time of the latest report
- Historical density summaries
- Building, floor, category, and opening hours
- Flexible details such as Wi-Fi, charging facilities, and food menus

### Profile, Participation, and Rewards

The planned profile shows points, current streak, floating-point trust score, earned badges, check-in history, and redemption history. Separate screens show available rewards and earned or locked badges. Users will be able to spend points on rewards; detailed earning and redemption rules remain to be defined. Integration with real partner-store databases is outside the current scope.

### Historical Data

The system will store historical report summaries so users can explore how reported crowd levels change over time.

Example:

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

Any account information used for report validation should be kept separate from public map data. Keep the verification outcome instead of storing raw personal GPS coordinates. Location reference coordinates belong to the location record. Authentication implementation and report retention policies are still to be decided.

---

## Challenges

Several technical challenges need to be investigated during development:

- Handling subjective or conflicting reports
- Preventing spam and duplicate submissions
- Verifying GPS and QR check-ins while handling unavailable device permissions
- Defining consistent point, streak, trust-score, and reward rules
- Defining selectable zones on the custom map
- Choosing an image or 3D representation that works on mobile devices
- Setting report expiry and handling locations with no recent reports
- Defining aggregation rules and showing report freshness
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
- Profile, points, streaks, trust score, badges, and reward redemption

The implementation order and release boundary for participation and reward features still need to be agreed. Advanced prediction and recommendation features will be considered after enough reliable user reports can be collected.

---

## Project Status

**Status:** Project foundation set up; mid-fidelity wireframes and a nine-entity ER/DBML design are available. Product features and database integration are not implemented yet.

Current priorities:

1. Define campus zones and choose the custom map format
2. Prepare the map image or 3D model
3. Finalize authentication, GPS/QR verification, aggregation, and expiry rules
4. Map the nine-entity design to storage and define access policies
5. Build check-in, summary, participation, and reward operations
6. Connect location summaries to the interactive map
7. Test report quality, touch interactions, and map performance on mobile devices
8. Expand to additional campus locations

---

## Project Vision

The long-term goal is to make **TeeWangMai?** a useful source of student density information across KMUTT, built from community reports and presented on a custom campus map. Future analysis and prediction features will support this purpose as report coverage and quality improve.
