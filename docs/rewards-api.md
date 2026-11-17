# Rewards and vouchers — BE-011

Product rules confirmed November 17, 2026. Every route needs the Supabase session
cookie, returns `Cache-Control: private, no-store`, accepts no query string and
never returns `auth_id`, `user_id` or `idempotency_key`. Using a voucher and its
QR belong to BE-012.

## Rules

- A reward can be redeemed only while `status` is `active`, the time is between
  `starts_at` (if set) and `expires_at` inclusive, and `stock` is above 0. Both the
  status and the time window must allow it, so a stale `active` status past the
  deadline is still expired.
- `max_per_user` limits how many vouchers one user may ever redeem for the reward.
  Used and expired vouchers still count. A user may hold several vouchers of the
  same reward up to that limit.
- Each voucher expires `valid_days` after its own `redeemed_at`, not at the reward
  deadline. Defaults: `max_per_user` 1, `valid_days` 7.
- Points never go negative and stock never goes below 0.

## Endpoints

| Method | Path | Success `data` |
| --- | --- | --- |
| GET | `/api/rewards` | `{points, rewards: [...]}` |
| POST | `/api/rewards/{rewardId}/redeem` | `{replayed, points, voucher: {id, reward_id, used_points, redeemed_at, expires_at}}` |
| GET | `/api/vouchers` | `[{id, reward_id, title, image_url, used_points, redeemed_at, expires_at, used_at, status}]` |

Catalog rows contain `id, title, description, image_url, points_required, stock,
starts_at, expires_at, valid_days, max_per_user, redeemed_count, availability`,
sorted by `points_required` then `id`. Rewards past their deadline (or with status
`expired`) are hidden. `availability` is decided by the server in this order:

| Value | Meaning |
| --- | --- |
| `upcoming` | Not open yet (status `upcoming` or before `starts_at`) |
| `out_of_stock` | `stock` is 0 |
| `limit_reached` | `redeemed_count >= max_per_user` |
| `insufficient_points` | Locked: balance below `points_required` |
| `redeemable` | Can be redeemed now |

Voucher `status` is `used` when `used_at` is set, else `expired` at/after
`expires_at`, else `available`. Vouchers are sorted newest first.

## Idempotency

`POST /api/rewards/{rewardId}/redeem` requires the header `Idempotency-Key: <uuid>`.
Create a new UUID for each redemption attempt and send the same UUID again only
when retrying that attempt (timeout, lost connection). A repeated key returns
the original voucher with `replayed: true` and charges nothing. Only successful
redemptions are stored, so after a rejection (e.g. `insufficient_points`) the same
key may be retried later. A key already used for another reward returns 422.

## Errors

Body: `{success: false, code, error}` with a Thai `error` message.

| HTTP | `code` |
| --- | --- |
| 400 | `validation` — bad ID, missing/non-UUID `Idempotency-Key`, query string |
| 401 | `unauthorized` — no session, expired session or no profile |
| 404 | `not_found` — reward missing |
| 409 | `insufficient_points`, `out_of_stock`, `limit_reached`, `upcoming`, `expired` |
| 422 | `key_conflict` |
| 503 | `unavailable` — database or Auth service failure (not a lost session) |

## Concurrency

`redeem_reward` locks the user's row, then the reward's row, before checking.
Concurrent redemptions by one user run one at a time, and users racing for the
last item get exactly one success; the rest receive `out_of_stock`.

The automated HTTP race uses one account. The cross-user race (two accounts,
last item) was checked manually with two `psql` sessions: the second session
waits for the first to commit and then gets `out_of_stock` with its points intact.
Repeat it after changing the lock order.

## Verification

```powershell
docker cp supabase/tests/rewards_redemption.sql supabase_db_teewangmai:/tmp/rewards_redemption.sql
docker exec supabase_db_teewangmai psql -U postgres -d postgres --no-psqlrc -v ON_ERROR_STOP=1 -f /tmp/rewards_redemption.sql
```

The HTTP test runs against a local dev server. The anonymous part needs only
`REWARDS_API_TEST_URL`. The write part also needs a Local account with enough
points and two fresh rewards: one with `stock` 1 and `max_per_user` above 1
(`REWARDS_API_TEST_LAST_ONE_ID`), one with `max_per_user` 2 and no vouchers for the
account (`REWARDS_API_TEST_STACK_ID`). It fires 10 parallel redemptions at each.

```powershell
$env:REWARDS_API_TEST_URL = "http://localhost:3000"
$env:REWARDS_API_TEST_EMAIL = "<local account>"
$env:REWARDS_API_TEST_PASSWORD = "<local password>"
$env:REWARDS_API_TEST_LAST_ONE_ID = "<reward id>"
$env:REWARDS_API_TEST_STACK_ID = "<reward id>"
node --test tests/rewards-api.integration.test.mjs
```
