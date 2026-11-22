# Rewards and vouchers — BE-011

Product rules confirmed November 17, 2026. Every route except `POST /api/vouchers/verify` needs the Supabase session
cookie, returns `Cache-Control: private, no-store`, accepts no query string and
never returns `auth_id`, `user_id` or `idempotency_key`. Voucher use and shop
verification were added by BE-012.

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
- Using a voucher (BE-012) marks it used immediately and returns a 32-character hex
  `use_code` for the one-time QR. Each tap on use sends a new `Idempotency-Key`;
  only a retry with the same key (lost response) returns the code again, and only
  within 30 minutes and before the shop verifies it. Closing the QR and tapping
  again does not, so the UI should confirm before calling use.
- The shop scans that QR and calls verify within 30 minutes of use and before the
  voucher expires (otherwise `expired`). The first verify marks the voucher
  verified; later scans report `already_verified` with the earlier time, so a
  screenshot cannot be accepted twice. Verify needs no login and never returns
  who owns the voucher.
- Points never go negative and stock never goes below 0.

## Endpoints

| Method | Path | Success `data` |
| --- | --- | --- |
| GET | `/api/rewards` | `{points, rewards: [...]}` |
| POST | `/api/rewards/{rewardId}/redeem` | `{replayed, points, voucher: {id, reward_id, used_points, redeemed_at, expires_at}}` |
| GET | `/api/vouchers` | `[{id, reward_id, title, image_url, used_points, redeemed_at, expires_at, used_at, status}]` |
| POST | `/api/vouchers/{voucherId}/use` + `Idempotency-Key` | `{id, used_at, use_code}` |
| POST | `/api/vouchers/verify` `{code}` (no login) | `{reward_title, used_points, used_at, verified_at}` |

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
| 404 | `not_found` — reward missing, voucher missing/not yours, or unknown verify code |
| 409 | `insufficient_points`, `out_of_stock`, `limit_reached`, `upcoming`, `expired`, `already_used`, `already_verified` (with `data`) |
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

`tests/voucher-use.integration.test.mjs` redeems, uses and verifies one voucher. Run it
with a second Local account so it does not change the balance the test above
checks: `VOUCHER_API_TEST_EMAIL`, `VOUCHER_API_TEST_PASSWORD` and
`VOUCHER_API_TEST_REWARD_ID` (a redeemable reward with stock and a high
`max_per_user`), plus `REWARDS_API_TEST_URL`.
