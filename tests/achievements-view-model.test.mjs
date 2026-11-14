import assert from 'node:assert/strict';
import test from 'node:test';

import {
  REQUIREMENT_FALLBACK,
  formatEarnedDate,
  getBadgeCollectionView,
  getRequirementText,
} from '../src/features/achievements/view-model.ts';

function badge(id, earnedAt = null, requirementDescription = null) {
  return {
    id,
    name: `badge-${id}`,
    description: null,
    iconUrl: null,
    requirement: { type: 'x', value: 1, description: requirementDescription },
    earnedAt,
  };
}

const badges = [
  badge(1, '2026-11-01T00:00:00Z'),
  badge(2),
  badge(3, '2026-11-02T00:00:00Z'),
];

test('splits earned and locked by server earnedAt, keeping order', () => {
  const view = getBadgeCollectionView(badges, 'all');
  assert.deepEqual(view.earned.map((b) => b.id), [1, 3]);
  assert.deepEqual(view.locked.map((b) => b.id), [2]);
  assert.equal(view.total, 3);
  assert.equal(view.showEarned, true);
  assert.equal(view.showLocked, true);
});

test('filters toggle which sections are shown', () => {
  assert.deepEqual(
    [getBadgeCollectionView(badges, 'earned')].map((v) => [v.showEarned, v.showLocked]),
    [[true, false]],
  );
  assert.deepEqual(
    [getBadgeCollectionView(badges, 'locked')].map((v) => [v.showEarned, v.showLocked]),
    [[false, true]],
  );
});

test('requirement text uses DTO text or a fallback', () => {
  assert.equal(getRequirementText(badge(1, null, 'เช็กอิน 3 ครั้ง')), 'เช็กอิน 3 ครั้ง');
  assert.equal(getRequirementText(badge(1)), REQUIREMENT_FALLBACK);
});

test('earned date renders only for a valid server timestamp', () => {
  assert.equal(formatEarnedDate(null), null);
  assert.equal(formatEarnedDate('not-a-date'), null);
  assert.match(formatEarnedDate('2026-11-01T03:00:00Z'), /2569/);
});
