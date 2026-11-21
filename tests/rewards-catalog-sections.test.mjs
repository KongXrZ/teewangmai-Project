import assert from "node:assert/strict";
import test from "node:test";

import { groupRewardsForCatalog } from "../src/features/rewards/catalog-sections.ts";

const reward = (id, availability) => ({
  id,
  title: `reward ${id}`,
  pointsRequired: 50,
  imageUrl: null,
  availability,
});

const ids = (list) => list.map((item) => item.id);

test("only redeemable rewards go to the redeemable section", () => {
  const sections = groupRewardsForCatalog([
    reward(1, "redeemable"),
    reward(2, "insufficient_points"),
    reward(3, "out_of_stock"),
    reward(4, "limit_reached"),
    reward(5, "unavailable"),
    reward(6, "upcoming"),
    reward(7, "redeemable"),
  ]);
  assert.deepEqual(ids(sections.redeemable), [1, 7]);
  assert.deepEqual(ids(sections.locked), [2, 3, 4, 5]);
  assert.deepEqual(ids(sections.upcoming), [6]);
});

test("a zero-point user has no redeemable section", () => {
  const sections = groupRewardsForCatalog([
    reward(1, "insufficient_points"),
    reward(2, "insufficient_points"),
  ]);
  assert.equal(sections.redeemable.length, 0);
  assert.deepEqual(ids(sections.locked), [1, 2]);
});

test("empty catalog yields empty sections", () => {
  assert.deepEqual(groupRewardsForCatalog([]), {
    redeemable: [],
    locked: [],
    upcoming: [],
  });
});
