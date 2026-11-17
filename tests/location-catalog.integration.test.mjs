import assert from 'node:assert/strict';
import test from 'node:test';

// Opt in against a running app and its real Local reference dataset. No writes.
const base = process.env.LOCATION_API_TEST_URL;

test('building catalog HTTP contract against real Local data', { skip: !base }, async () => {
  async function get(path, status = 200) {
    const response = await fetch(new URL(path, base));
    assert.equal(response.status, status, path);
    assert.match(response.headers.get('cache-control'), /no-store/);
    const body = await response.json();
    assert.equal(body.success, status === 200, path);
    return body;
  }

  const all = await get('/api/locations?limit=50');
  assert.ok(all.data.length, 'Import approved reference data before this test');
  assert.equal(all.data.length, all.pagination.total);
  assert.equal(all.meta.timezone, 'Asia/Bangkok');
  assert.equal(new Set(all.data.map((b) => b.id)).size, all.data.length);
  assert.deepEqual(all.data.map((b) => b.id), all.data.map((b) => b.id).sort((a, b) => a - b));
  assert.equal(JSON.stringify(all).includes('qr_code_id'), false);

  const building = all.data.find((b) => b.aliases.length && b.floor_count);
  assert.ok(building, 'Approved dataset should contain an alias and floors');
  for (const term of [building.building.toLowerCase(), building.name, building.aliases[0].toLowerCase(),
    building.category[0]]) {
    const result = await get(`/api/locations?limit=50&q=${encodeURIComponent(term)}`);
    assert.ok(result.data.some((b) => b.id === building.id), term);
  }
  const category = building.category[0];
  const filtered = await get(`/api/locations?limit=50&category=${encodeURIComponent(category)}`);
  assert.ok(filtered.data.length);
  assert.ok(filtered.data.every((b) => b.category.some((c) => c.toLowerCase() === category.toLowerCase())));

  const first = await get('/api/locations?limit=2');
  const second = await get('/api/locations?limit=2&page=2');
  assert.deepEqual([...first.data, ...second.data].map((b) => b.id), all.data.slice(0, 4).map((b) => b.id));
  const beyond = await get('/api/locations?page=100000');
  assert.deepEqual(beyond.data, []);
  assert.equal(beyond.pagination.total, all.pagination.total);
  assert.deepEqual((await get('/api/locations?q=%25_%2C%28')).data, []);
  assert.equal((await get('/api/locations?q=__no_matching_building__')).pagination.total, 0);

  const detail = await get(`/api/locations/${building.id}`);
  assert.ok(detail.data.floors.length);
  assert.deepEqual(detail.data.aliases, building.aliases);
  const floor = detail.data.floors[0];
  const selected = await get(`/api/locations/${building.id}/floors/${floor.id}`);
  assert.equal(selected.data.id, floor.id);
  assert.equal(JSON.stringify(detail).includes('qr_code_id'), false);
  assert.equal(JSON.stringify(selected).includes('gps_lat'), false);
  const otherBuilding = all.data.find((b) => b.id !== building.id);
  await get(`/api/locations/${otherBuilding.id}/floors/${floor.id}`, 404);
  await get('/api/locations/2147483647', 404);
  // S7 is inactive in the approved seed.
  assert.equal(all.data.some((b) => b.building === 'S7'), false);
  for (const path of ['/api/locations/0', '/api/locations/abc', '/api/locations?limit=51',
    '/api/locations?page=0', '/api/locations?q=a&q=b']) {
    assert.equal((await get(path, 400)).code, 'validation');
  }
});
