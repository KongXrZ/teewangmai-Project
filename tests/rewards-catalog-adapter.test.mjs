import assert from 'node:assert/strict';
import test from 'node:test';

import {
  fetchRewardsCatalog,
  parseRewardsCatalogResponse,
  toRewardsCatalogState,
} from '../src/features/rewards/api/rewards-catalog-adapter.ts';

const reward = {
  id: 1,
  title: 'กาแฟ',
  description: 'ignored',
  image_url: null,
  points_required: 50,
  stock: 10,
  starts_at: null,
  expires_at: '2026-12-31T16:59:59+00:00',
  valid_days: 7,
  max_per_user: 1,
  redeemed_count: 0,
  availability: 'redeemable',
};

function ok(rewards, points = 120) {
  return { success: true, data: { points, rewards } };
}

test('maps server DTOs to card view models', () => {
  assert.deepEqual(parseRewardsCatalogResponse(200, ok([reward])), {
    kind: 'ok',
    points: 120,
    rewards: [
      { id: 1, title: 'กาแฟ', pointsRequired: 50, imageUrl: null, availability: 'redeemable' },
    ],
  });
});

test('keeps server availability and does not recompute from points', () => {
  const result = parseRewardsCatalogResponse(
    200,
    ok([{ ...reward, points_required: 999, availability: 'redeemable' }], 0),
  );
  assert.equal(result.rewards[0].availability, 'redeemable');

  const locked = parseRewardsCatalogResponse(
    200,
    ok([{ ...reward, points_required: 0, availability: 'out_of_stock' }], 500),
  );
  assert.equal(locked.rewards[0].availability, 'out_of_stock');
});

test('keeps limit_reached from the server', () => {
  const result = parseRewardsCatalogResponse(
    200,
    ok([{ ...reward, redeemed_count: 1, availability: 'limit_reached' }]),
  );
  assert.equal(result.rewards[0].availability, 'limit_reached');
});

test('blank image_url falls back to null without failing the catalog', () => {
  const result = parseRewardsCatalogResponse(
    200,
    ok([
      { ...reward, id: 1, image_url: '' },
      { ...reward, id: 2, image_url: '   ' },
      { ...reward, id: 3, image_url: ' /rewards/coffee.png ' },
    ]),
  );
  assert.equal(result.kind, 'ok');
  assert.deepEqual(
    result.rewards.map((item) => item.imageUrl),
    [null, null, '/rewards/coffee.png'],
  );
});

test('unknown availability falls back to unavailable', () => {
  const result = parseRewardsCatalogResponse(200, ok([{ ...reward, availability: 'maybe' }]));
  assert.equal(result.rewards[0].availability, 'unavailable');
});

test('empty catalog is a real empty ready state', () => {
  const result = parseRewardsCatalogResponse(200, ok([]));
  assert.deepEqual(toRewardsCatalogState(result, () => {}), {
    status: 'ready',
    points: 120,
    rewards: [],
  });
});

test('503 is a retryable error that keeps the server message', () => {
  const body = { success: false, code: 'unavailable', error: 'ระบบรางวัลไม่พร้อมใช้งาน' };
  const parsed = parseRewardsCatalogResponse(503, body);
  assert.deepEqual(parsed, { kind: 'error', message: 'ระบบรางวัลไม่พร้อมใช้งาน' });
  let retried = false;
  const state = toRewardsCatalogState(parsed, () => {
    retried = true;
  });
  assert.equal(state.status, 'error');
  assert.equal(state.message, 'ระบบรางวัลไม่พร้อมใช้งาน');
  state.onRetry();
  assert.equal(retried, true);
});

test('401 maps to unauthenticated', () => {
  assert.deepEqual(parseRewardsCatalogResponse(401, { success: false }), {
    kind: 'unauthenticated',
  });
});

test('malformed payload and server errors map to error with retry', () => {
  assert.deepEqual(parseRewardsCatalogResponse(200, { success: true, data: {} }), {
    kind: 'error',
  });
  const failed = parseRewardsCatalogResponse(500, { success: false, error: 'boom' });
  assert.deepEqual(failed, { kind: 'error', message: 'boom' });

  const onRetry = () => {};
  assert.deepEqual(toRewardsCatalogState(failed, onRetry), {
    status: 'error',
    message: 'boom',
    onRetry,
  });
});

test('fetch handles network failure and non-JSON error pages', async () => {
  const offline = await fetchRewardsCatalog(async () => {
    throw new TypeError('offline');
  });
  assert.deepEqual(offline, { kind: 'error' });

  const missing = await fetchRewardsCatalog(
    async () => new Response('<html></html>', { status: 404, headers: { 'content-type': 'text/html' } }),
  );
  assert.equal(missing.kind, 'error');

  const ready = await fetchRewardsCatalog(
    async (url) => {
      assert.equal(url, '/api/rewards');
      return Response.json(ok([reward]));
    },
  );
  assert.equal(ready.kind, 'ok');
});

test('401 keeps an unauthenticated state instead of a generic load error', () => {
  const result = parseRewardsCatalogResponse(401, null);
  assert.deepEqual(result, { kind: 'unauthenticated' });
  assert.deepEqual(toRewardsCatalogState(result, () => {}), { status: 'unauthenticated' });
});
