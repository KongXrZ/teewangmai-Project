# Floor check-ins and crowd summaries

Product decisions confirmed on November 8, updated November 16, 2026. The v4
model has nine application tables: QR identifiers belong to `floors`, and
`checkins.floor_id` identifies the reported floor. BE-008 implements QR
resolution and GPS/QR/cooldown submission validation; administrative settings
remain future implementation. BE-006 implements scheduled summaries; see
[Crowd API](crowd-api.md).

## Buildings, floors, and reports

- A location represents a building. Each building has its own floors.
- Each floor has a distinct, printable QR identifier. The backend resolves it
  to a floor and its parent building; users do not enter or choose the floor.
- The implemented relationship is `locations -> floors -> checkins`, introduced
  by `20261109162340_add_floor_checkins_and_align_profile_security.sql`.
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

Check-in point awarding is deferred. Do not add +10 points or an awarding trigger
in this round. The point balance remains available for reward eligibility.

BE-007 owns printable QR provisioning, BE-008 owns QR resolution and trusted
submission, BE-006 owns summaries, and BE-009 owns personal check-in history.
These IDs follow the current plan; schema availability alone does not implement
those APIs. See [Backend Handoff](backend-handoff.md).

GPS verifies proximity to the building; QR identifies the floor. Validate GPS
on the server against building coordinates and an allowed distance. BE-008
(owner decision, November 18, 2026) rejects fixes whose reported accuracy is
above 100 m and accepts a distance of at most 100 m plus min(accuracy, 50 m)
from the building point, so never more than 150 m. Reason: one coordinate per
building, 34 active buildings, nearest neighbours 17–97 m apart (median 37 m);
100 m covers a large building's footprint and a good fix, and the allowance
tolerates indoor GPS error without accepting reports from across campus.
Permission-request timing remains a frontend decision. Personal GPS
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

- Keep each floor's summary independent. The building card uses the floor with
  the highest report count, with natural floor order and ID breaking ties.
  Building detail starts at floor 1, independently of the card's selected floor.
- The mean remains fractional. Map scores below 2.5 to low, from 2.5 to below
  3.5 to medium, and from 3.5 to high (rounding 1–2 / 3 / 4–5 for display labels).
- All viewers may read the aggregate without submitting a check-in. Viewing
  or deciding not to visit contributes no score and creates no check-in log.
- Recalculate even when no new reports arrive, so old reports leave the window.
  Excluding an old report from calculation does not delete its historical log.
- With no reports in the window, the mean is `null` and the state is unknown.
  Do not carry an old score forward indefinitely or interpret no data as 0/low.
- Show report count, latest included report time, and calculation time alongside
  the summary. Per the November 16 decision, estimated people equals report count;
  density percentage equals count / floor capacity * 100. This is an estimate,
  not a measured headcount; null capacity gives null percentage.
- Show an unknown state such as “ยังไม่มีข้อมูลความหนาแน่นล่าสุด” in a neutral
  color. Users can still view details and start check-in when eligible. This FE
  state still needs implementation.
- Public aggregate reads must not expose reporter identities or individual logs.
  BE-006 exposes a restricted aggregate RPC; snapshots and refresh remain private.

This is a periodically refreshed estimate of reported conditions, not a forecast
of future attendance. A live query over a moving window alone would not enforce
the agreed 10-minute update cadence. The scheduler and summary storage/cache
strategy use a private snapshot table and pg_cron in BE-006. Refresh includes
timestamps in (T − 30 minutes, T], never deletes reports, and runs every 10 minutes.

## Configurable timing

| Setting | Agreed default | Administration requirement |
| --- | --- | --- |
| Summary lookback | 30 minutes | Owner can adjust through the backend/admin interface |
| Summary refresh interval | 10 minutes | Owner can adjust through the backend/admin interface |
| Per-user/per-floor cooldown | 30 minutes | Confirm whether this is also editable in admin |

The November 16 scope decision fixes lookback/refresh at 30/10 minutes for BE-006.
Admin configuration is deferred to a separate task; CSV updates are also separate.
Keep these settings distinct: refresh interval controls when a summary changes;
lookback controls which reports it uses. The settings store, admin authorization,
and the effect of changing settings on existing cooldowns are not defined yet.

## Initial data and operational data

The team supplies building/floor/QR records, per-floor opening hours, location details,
reward definitions, and badge definitions. User profiles, check-ins, earned
badges, and redemptions arise from use. Reward stock and user point balances
also change during use even though reward definitions start as team data.

Keep schema changes in migrations and initial records in seeds. Make repeated
data imports preserve identities and history, and avoid resetting live balances
or consumed stock. The approved building seed upserts by canonical building code
and preserves IDs. The 224 floor rows and their UUID identifiers are provisioned;
QR images and floor hours remain future work. Floor reimports preserve IDs and
QR identifiers. Schema deployment can happen before all reference data is ready.
The current reference-data format is in [Reference Data](reference-data.md).
Floor schedules use Monday=1 through Sunday=7, Bangkok time, with 08:00–16:00
defaults and `is_active` for closed weekdays. Full day is 00:00:00–23:59:59.

## Remaining implementation decisions

- Timing configuration storage and admin UI; cooldown editability (separate task).
- Display rounding and history-retention/deletion policy.
- Feature access policies, point earning, and reward/badge business rules.

See [Database Design](database.md) for the schema represented by the current
migrations and [Project Structure](architecture.md) for code ownership.
