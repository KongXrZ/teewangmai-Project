import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BADGES_ENDPOINT,
  fetchBadges,
  parseBadgesResponse,
  toAchievementsState,
} from '../src/features/achievements/api/badges-adapter.ts';

const earnedAt = '2026-11-01T03:15:00+00:00';

function dto(overrides = {}) {
  return {
    id: 1,
    name: 'นักสำรวจ',
    description: 'สำรวจสถานที่ครบ',
    icon_url: null,
    requirement_type: 'checkin_count',
    requirement_value: 5,
    requirement_text: 'เช็กอิน 5 สถานที่',
    is_active: true,
    earned_at: null,
    ...overrides,
  };
}

function ok(badges) {
  return { success: true, data: { badges } };
}

test('maps DTOs to badge models with server earned_at', () => {
  assert.deepEqual(parseBadgesResponse(200, ok([dto({ earned_at: earnedAt })])), {
    kind: 'ok',
    badges: [
      {
        id: 1,
        name: 'นักสำรวจ',
        description: 'สำรวจสถานที่ครบ',
        iconUrl: null,
        requirement: { type: 'checkin_count', value: 5, description: 'เช็กอิน 5 สถานที่' },
        earnedAt,
      },
    ],
  });
});

test('keeps locked badges locked and does not evaluate requirement_type', () => {
  const result = parseBadgesResponse(
    200,
    ok([dto({ requirement_type: 'streak_days', requirement_value: 1, earned_at: null })]),
  );
  assert.equal(result.kind, 'ok');
  assert.equal(result.badges[0].earnedAt, null);
  assert.equal(result.badges[0].requirement.type, 'streak_days');
});

test('missing or blank requirement_text becomes null for UI fallback', () => {
  const result = parseBadgesResponse(
    200,
    ok([dto({ id: 1, requirement_text: undefined }), dto({ id: 2, requirement_text: '  ' })]),
  );
  assert.deepEqual(
    result.badges.map((badge) => badge.requirement.description),
    [null, null],
  );
});

test('hides inactive badges unless the user already earned them', () => {
  const result = parseBadgesResponse(
    200,
    ok([
      dto({ id: 1, is_active: false, earned_at: null }),
      dto({ id: 2, is_active: false, earned_at: earnedAt }),
      dto({ id: 3, is_active: true, earned_at: null }),
    ]),
  );
  assert.deepEqual(result.badges.map((badge) => badge.id), [2, 3]);
});

test('empty catalog is ready with no badges', () => {
  assert.deepEqual(parseBadgesResponse(200, ok([])), { kind: 'ok', badges: [] });
});

test('schema mismatch and invalid earned_at are errors, not empty', () => {
  assert.deepEqual(parseBadgesResponse(200, { success: true, data: {} }), { kind: 'error' });
  assert.deepEqual(parseBadgesResponse(200, ok([dto({ earned_at: 'yesterday' })])), {
    kind: 'error',
  });
});

test('API not opened yet maps to unavailable, not empty', () => {
  for (const status of [404, 501, 503]) {
    assert.deepEqual(parseBadgesResponse(status, null), { kind: 'unavailable' });
  }
});

test('401 is unauthenticated and other failures keep server message', () => {
  assert.deepEqual(parseBadgesResponse(401, null), { kind: 'unauthenticated' });
  assert.deepEqual(parseBadgesResponse(500, { error: 'ฐานข้อมูลขัดข้อง' }), {
    kind: 'error',
    message: 'ฐานข้อมูลขัดข้อง',
  });
});

test('fetchBadges calls the badges endpoint and parses JSON', async () => {
  let calledWith;
  const fetchImpl = async (url, init) => {
    calledWith = { url, init };
    return new Response(JSON.stringify(ok([dto()])), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  const result = await fetchBadges(fetchImpl);
  assert.equal(calledWith.url, BADGES_ENDPOINT);
  assert.equal(calledWith.init.cache, 'no-store');
  assert.equal(result.kind, 'ok');
});

test('network failure becomes a retryable error state', async () => {
  const result = await fetchBadges(async () => {
    throw new TypeError('offline');
  });
  assert.deepEqual(result, { kind: 'error' });

  let retried = false;
  const state = toAchievementsState(result, () => {
    retried = true;
  });
  assert.equal(state.status, 'error');
  state.onRetry();
  assert.equal(retried, true);
});

test('unauthenticated state has no retry', () => {
  const state = toAchievementsState({ kind: 'unauthenticated' }, () => {});
  assert.equal(state.status, 'error');
  assert.equal(state.onRetry, undefined);
});
