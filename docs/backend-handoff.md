# Backend Handoff

Snapshot: November 15, 2026. Schema v4 is applied to Local only. No real reference
data has been imported. UI implementation and API integration are separate work;
an existing page does not imply its data API exists. No mock application data is
provided by this migration.

## Implemented interfaces

| Interface | Current responsibility |
| --- | --- |
| `POST /api/auth/signup` | Email/password signup |
| `POST /api/auth/login` | Email/password login |
| `POST /api/auth/logout` | Logout |
| `GET /api/auth/me` | Current identity and own profile |
| `GET /auth/callback` | Auth code exchange and safe internal redirect |
| `GET /api/health` | Application health response; not a database connectivity test |
| `GET /api/swagger` | API documentation |

Auth Server Actions also cover password recovery/reset, resend verification,
current user, logout and own-profile name/avatar updates. Existing Auth UI/session
integration is documented in [Frontend Integration](frontend-integration.md).
Google UI integration is deferred. Keep browser-readable cookie sessions and
server identity verification; do not implement a second password store.

## Pending API tasks

These are responsibilities, **not promises of existing endpoint URLs**. Agree
request/response contracts and update Swagger in each implementation task.

| Task | Main responsibility / boundary |
| --- | --- |
| BE-004 | Building search/list and selected-floor detail; search code/name/category/aliases, building hours derived from floors, floor capacity and metadata |
| BE-005 | Per-floor crowd summaries: 30-minute lookback, refresh every 10 minutes, unknown when empty; configurable timing |
| BE-006 | Approved floor QR generation and printable assets; needs real floor identifiers |
| BE-007 | QR resolution and verified check-in: Auth, active reference data, GPS, integer score 1–5, atomic independent 30-minute user/floor cooldown |
| BE-008 | Own check-in history only, retained logs, pagination ordered by created_at DESC then id DESC; no reward/badge responsibilities |
| BE-009 | Authorized profile-photo upload and avatar update |
| BE-010 | Rewards catalog, immediate atomic exchange and own voucher history; fixed reward deadline copied at issuance |
| BE-011 | Authorized voucher QR verification and single atomic consumption before deadline |
| BE-012 | Badge catalog, requirement evaluation and own earned badges |

Task numbers here follow the current remaining-work plan, not older PR numbering.
BE-003's floor migration already exists; this v4 alignment is maintenance, not a
new data-import ticket. CSV import is outside this task plan.

Check-in awarding **+10 points is deferred** for this round. BE-007 must not
introduce that award by copying an older task description. `users.points` remains
for existing balances and redemption eligibility; a separate approved earning
rule is needed. Reward exchange still deducts points and stock atomically.

## Before implementing v4 queries

1. Apply pending migrations to Local without resetting needed accounts.
2. Obtain approved reference records using [Reference Data](reference-data.md).
3. Type generation is explicitly deferred until that import. The checked-in
   `src/types/database.ts` still describes v3; generate/review it before new typed
   v4 queries. Do not manually patch generated types or use removed tables.
4. Read [Database Design](database.md) and [Check-in Rules](check-in-rules.md).
   Preserve RLS and server-only business writes. Define public catalog reads and
   own-history authorization with their API tasks; no broad client-write policy.
5. Add contract/error/concurrency tests appropriate to the implemented operation.
   Run the schema SQL checks and normal lint/typecheck/test/build checks.

Unresolved runtime decisions include GPS tolerance/accuracy, summary timestamp
boundaries, rounding/labels, storage/scheduler/admin settings, building-wide crowd
aggregation, badge requirement vocabulary, voucher consumption authorization,
point earning and retention. Do not infer these from schema defaults.

Local SQL validation covers schema replay/upgrade, constraints and access. It does
not establish real GPS/camera behavior, concurrency correctness of future APIs,
or Cloud readiness. Deploy and production configuration are separate work.
