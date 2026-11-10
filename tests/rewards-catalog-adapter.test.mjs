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
  points_required: 50,
  image_url: null,
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

test('pending API statuses map to unavailable, not empty', () => {
  for (const status of [404, 501, 503]) {
    assert.deepEqual(parseRewardsCatalogResponse(status, null), { kind: 'unavailable' });
  }
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

test('fetch handles network failure and non-JSON 404 pages', async () => {
  const offline = await fetchRewardsCatalog(async () => {
    throw new TypeError('offline');
  });
  assert.deepEqual(offline, { kind: 'error' });

  const missing = await fetchRewardsCatalog(
    async () => new Response('<html></html>', { status: 404, headers: { 'content-type': 'text/html' } }),
  );
  assert.deepEqual(missing, { kind: 'unavailable' });

  const ready = await fetchRewardsCatalog(
    async (url) => {
      assert.equal(url, '/api/rewards');
      return Response.json(ok([reward]));
    },
  );
  assert.equal(ready.kind, 'ok');
});
