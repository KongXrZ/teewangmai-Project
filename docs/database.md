# Database Design

The latest ER/DBML design contains **nine entities**. This supersedes the older
presentation's eight-table description. The project owner confirmed that
`Users.trust_score` may be a **float**.

PostgreSQL hosted by Supabase is the planned primary database. This document
records the model; it is not an executable migration or a deployed schema.

## Current entities

| Entity | Purpose | Fields in the current DBML |
| --- | --- | --- |
| `Users` | User profile and participation statistics | `id`, `name`, `email`, `points`, `current_streak`, `trust_score` (float) |
| `Locations` | Campus locations and verification references | `id`, `name`, `category`, `building`, `floor`, `gps_lat`, `gps_lng`, `qr_code_id` |
| `Location_Hours` | Opening and closing times for a location | `id`, `location_id`, `day_of_week`, `open_time`, `close_time` |
| `Checkins` | User-submitted crowd reports and check-in history | `id`, `user_id`, `location_id`, `crowd_level`, `verification_method`, `created_at` |
| `Badges` | Catalog of available badges | `id`, `name`, `description` |
| `User_Badges` | Records of badges earned by users | `id`, `user_id`, `badge_id`, `earned_at` |
| `Rewards` | Catalog of rewards available for points | `id`, `title`, `description`, `points_required`, `status` |
| `Redemptions` | History of individual reward redemptions | `id`, `user_id`, `reward_id`, `used_points`, `redeemed_at` |
| `Location_Profiles` | Flexible location details such as menus and charging facilities | `_id` (same logical location ID), `details` (JSON) |

The DBML uses incrementing integer primary keys for the first eight entities.
`Location_Profiles._id` references the corresponding location ID.

## Relationships

- A user has many check-ins; a location receives many check-ins.
- A location has many opening-hours records. The foreign key in the DBML makes
  this a one-to-many relationship despite the older diagram's N:N label.
- Users and badge definitions are linked through `User_Badges`.
- Users and rewards are linked through individual `Redemptions` records, which
  preserve the points spent and the redemption time.
- A location is associated with one profile in the ER/DBML design. Whether a
  profile is mandatory for every location remains to be defined.

The latest DBML separates `Badges` and `User_Badges` and gives `Location_Hours`
its own `id`. Use these definitions rather than the older slide tables that
combine badge ownership and use a composite key for opening hours.

## Check-in and participation requirements

The wireframes describe GPS plus QR verification, followed by a crowd-level
report on a **1–5 scale**, from empty to very crowded. GPS verifies presence;
the campus mockup map is a separate display layer.

The presentation proposes summarizing the last **10–15 minutes** of check-ins,
with at least **two agreeing reports**. The exact window, meaning of agreement,
independent-reporter requirement, and handling of conflicting or insufficient
reports still need precise rules before implementation.

Keep only the outcome of the user's location verification, not raw personal
coordinates. `Locations.gps_lat` and `gps_lng` describe the location itself.
Define how both GPS and QR results are represented before implementing the
current `verification_method` field.

The planned profile includes points, current streak, trust score, badges,
check-in history, and redemption history. The presentation calls for
transactional point updates and redemptions. Earning rules, streak boundaries,
trust-score range, and duplicate-redemption handling are not finalized.

## Flexible location details

The current DBML labels `Location_Profiles` as NoSQL and stores a JSON `details`
document keyed by location ID. Its intended purpose is to accommodate different
attributes for different locations, such as food menus or charging facilities.

The physical storage choice remains open. The current nine-entity model does
not itself settle whether this data will live alongside the relational tables
or in a separate document store. No NoSQL service or ORM is selected yet.

## Before creating migrations

- Decide authentication integration and its relationship to `Users.id`.
- Confirm the physical storage for `Location_Profiles`.
- Specify required fields, uniqueness rules, defaults, numeric ranges,
  timestamp/timezone handling, and foreign-key deletion behavior.
- Define database access policies, verification rules, aggregation, and
  transactional point/redemption behavior.
- Create versioned SQL migrations and generate `src/types/database.ts` from the
  implemented database. Do not substitute hand-written types for a live schema.

The source presentations, ER image, and DBML remain local reference files and
are excluded from commits. This summary records their current interpretation
and the project owner's corrections; it does not add working database features.
