# Floor check-ins and crowd summaries

Product decisions confirmed on November 8, 2026. These are requirements for
future implementation. The current migrations still contain nine application
tables, with `locations.floor`, `locations.qr_code_id`, and
`checkins.location_id`. They do not yet implement the floor model, cooldown,
summary calculation, or administrative settings described here.

## Buildings, floors, and reports

- A location represents a building. Each building has its own floors.
- Each floor has a distinct, printable QR identifier. The backend resolves it
  to a floor and its parent building; users do not enter or choose the floor.
- The intended relationship is `locations -> floors -> checkins`. The floor
  model needs a new migration before use; changing a design document does not
  change the database.
- A successful check-in is both an individual crowd report and an activity log:
  authenticated `user_id`, resolved `floor_id`, reported `crowd_level`, and
  server-assigned `created_at`. The building is resolved through the floor.
- `checkins.crowd_level` is one user's observation on the integer scale 1–5.
  It is not the current crowd summary and is not a measured headcount.
- The same check-in supplies history and summary input. A second activity-log
  row is not required just to duplicate it.

## Submission flow

1. The user logs in, opens Quick Scan, permits camera use, and scans the QR.
2. The backend resolves the QR; the check-in page shows its building and floor.
   Scanning alone does not create a report or start a cooldown.
3. The user selects a crowd level and explicitly submits the check-in.
4. Before accepting it, the backend validates authentication, the active floor
   and building/QR, building-level GPS proximity, the crowd level, and cooldown.
5. A successful submission creates the check-in log. It becomes input to the
   next scheduled crowd-summary calculation, rather than replacing the summary
   directly with this user's score.

GPS verifies proximity to the building; QR identifies the floor. Validate GPS
on the server against building coordinates and an allowed distance. The radius
and exact permission-request timing remain to be decided. Personal GPS
coordinates are used for verification and are not stored in check-in logs.
Do not add `gps_verified`, `qr_verified`, or `verification_method` columns.

## Independent cooldown per user and floor

The default cooldown is **30 minutes**, keyed by **`user_id + floor_id`**.
It begins at a successful check-in. Reading a summary, scanning a QR, or a
rejected submission does not start or extend it.

| Action by the same user | Result |
| --- | --- |
| N7 floor 1 at 10:00 | Accepted; this floor is locked until 10:30 |
| N10 floor 1 at 10:05 | Accepted; its own lock ends at 10:35 |
| N7 floor 2 at 10:10 | Accepted; its own lock ends at 10:40 |
| N7 floor 1 at 10:20 | Rejected; the original lock still ends at 10:30 |
| N7 floor 1 at 10:30 | Accepted; its next cooldown begins |

Moving to another building or floor does not clear previous cooldowns. Enforce
the rule atomically on the backend, including concurrent requests. The FE may
display the next eligible time, but its timer is not the enforcement mechanism.
Key the lock by floor identity rather than the printable QR text, so changing
a QR does not bypass the same floor's cooldown.

## Current crowd level

`current_crowd_level` is the **arithmetic mean of accepted report scores for
one floor in the latest 30 minutes**, recalculated **every 10 minutes**. Each
accepted report in that window has equal weight; no time weighting is agreed.
The 30-minute per-user/per-floor cooldown limits repeat contributions.

For a calculation at time `T`, use the preceding 30 minutes relative to `T`,
not a fixed half-hour bucket. Define exact timestamp boundary inclusion during
implementation to avoid counting both reports at a cooldown boundary for the
same user and floor.

| Calculation time | Lookback period |
| --- | --- |
| 10:00 | 09:30–10:00 |
| 10:10 | 09:40–10:10 |
| 10:20 | 09:50–10:20 |

- Keep each floor's summary independent. A building-wide combination is not
  defined by these rules.
- The mean may be fractional even though individual scores are integers.
  Rounding and mapping it to labels/colors remain to be decided.
- All viewers may read the aggregate without submitting a check-in. Viewing
  or deciding not to visit contributes no score and creates no check-in log.
- Recalculate even when no new reports arrive, so old reports leave the window.
  Excluding an old report from calculation does not delete its historical log.
- With no reports in the window, the mean is `null` and the state is unknown.
  Do not carry an old score forward indefinitely or interpret no data as 0/low.
- Show report count, latest included report time, and calculation time alongside
  the summary. Report count is not the number of people currently present.
- Show an unknown state such as “ยังไม่มีข้อมูลความหนาแน่นล่าสุด” in a neutral
  color. Users can still view details and start check-in when eligible. This FE
  state still needs implementation.
- Public aggregate reads must not expose reporter identities or individual logs.
  The required access policies are not implemented yet.

This is a periodically refreshed estimate of reported conditions, not a forecast
of future attendance. A live query over a moving window alone would not enforce
the agreed 10-minute update cadence. The scheduler and summary storage/cache
strategy remain implementation decisions; no summary table or
`floors.current_crowd_level` column is prescribed yet.

## Configurable timing

| Setting | Agreed default | Administration requirement |
| --- | --- | --- |
| Summary lookback | 30 minutes | Owner can adjust through the backend/admin interface |
| Summary refresh interval | 10 minutes | Owner can adjust through the backend/admin interface |
| Per-user/per-floor cooldown | 30 minutes | Confirm whether this is also editable in admin |

Keep these settings distinct: refresh interval controls when a summary changes;
lookback controls which reports it uses. The settings store, admin authorization,
and the effect of changing settings on existing cooldowns are not defined yet.

## Initial data and operational data

The team supplies building/floor/QR records, opening hours, location details,
reward definitions, and badge definitions. User profiles, check-ins, earned
badges, and redemptions arise from use. Reward stock and user point balances
also change during use even though reward definitions start as team data.

Keep schema changes in migrations and initial records in seeds. Make repeated
data imports preserve identities and history, and avoid resetting live balances
or consumed stock. Stable import keys and the import/update mechanism still
need implementation. Schema deployment can happen before all seed data is ready.

## Remaining implementation decisions

- Floor migration and transition from `checkins.location_id` to `floor_id`.
- Server-side GPS radius/accuracy rules and atomic cooldown enforcement.
- Timing configuration storage and admin UI; cooldown editability.
- Scheduled calculation mechanism, summary persistence/cache, and failure handling.
- Exact time-window boundaries, label thresholds, and display rounding.
- Building-level summaries, if needed, and history-retention/deletion policy.
- Feature access policies, point earning, and reward/badge business rules.

See [Database Design](database.md) for the schema represented by the current
migrations and [Project Structure](architecture.md) for code ownership.
