import assert from 'node:assert/strict';
import test from 'node:test';
import { bangkokClock, buildingAvailability, floorAvailability } from '../src/features/locations/api/hours.ts';
import { parseLocationQuery, locationIdSchema } from '../src/features/locations/api/schemas.ts';
import { buildingDto } from '../src/features/locations/api/models.ts';

const monday = new Date('2026-11-16T02:00:00Z'); // 09:00 Bangkok
const hours = (day, open = '08:00:00', close = '16:00:00', active = true) => ({
  day_of_week: day, open_time: open, close_time: close, is_active: active,
});

test('Bangkok calendar changes on Sunday at 17:00 UTC; Monday is 1', () => {
  assert.equal(bangkokClock(new Date('2026-11-15T16:59:59Z')).day, 7);
  assert.deepEqual(bangkokClock(new Date('2026-11-15T17:00:00Z')), { day: 1, seconds: 0 });
});

test('floor hours distinguish open, closed, missing and disabled schedules', () => {
  assert.equal(floorAvailability([hours(1)], monday).status, 'open');
  assert.equal(floorAvailability([hours(1)], new Date('2026-11-16T09:00:00Z')).status, 'closed');
  assert.equal(floorAvailability([], monday).status, 'unknown');
  assert.equal(floorAvailability([hours(1, '08:00:00', '16:00:00', false)], monday).status, 'closed');
});

test('overnight hours carry from Sunday into Monday, then close exactly on time', () => {
  const schedule = [hours(7, '22:00:00', '02:00:00'), hours(1, '08:00:00', '16:00:00')];
  assert.equal(floorAvailability(schedule, new Date('2026-11-15T18:00:00Z')).status, 'open');
  assert.equal(floorAvailability(schedule, new Date('2026-11-15T19:00:00Z')).status, 'closed');
  assert.deepEqual(floorAvailability(schedule, monday).today_intervals, [
    { open_time: '00:00:00', close_time: '02:00:00' },
    { open_time: '08:00:00', close_time: '16:00:00' },
  ]);
  // A disabled start day cannot create an overnight carry-over.
  assert.equal(floorAvailability([hours(7, '22:00:00', '02:00:00', false)],
    new Date('2026-11-15T18:00:00Z')).status, 'unknown');
});

test('explicit full-day schedule includes the final second; equal times are not 24 hours', () => {
  assert.equal(floorAvailability([hours(1, '00:00:00', '23:59:59')],
    new Date('2026-11-16T16:59:59.999Z')).status, 'open');
  assert.equal(floorAvailability([hours(1, '00:00:00', '00:00:00')], monday).status, 'closed');
});

test('building hours merge overlapping floors, preserve gaps and distinguish unknown floors', () => {
  const first = floorAvailability([hours(1, '08:00:00', '12:00:00')], monday);
  const second = floorAvailability([hours(1, '10:00:00', '16:00:00')], monday);
  const evening = floorAvailability([hours(1, '18:00:00', '20:00:00')], monday);
  const summary = buildingAvailability([first, second, evening]);
  assert.equal(summary.status, 'open');
  assert.equal(summary.display_hours, '08:00:00–16:00:00, 18:00:00–20:00:00');
  assert.equal(buildingAvailability([]).status, 'unknown');
  assert.equal(buildingAvailability([
    floorAvailability([hours(1)], new Date('2026-11-16T10:00:00Z')),
    floorAvailability([], monday),
  ]).status, 'unknown');
});

test('query parsing validates bounds, duplicate parameters and treats search punctuation as text', () => {
  assert.deepEqual(parseLocationQuery(new URLSearchParams()), { q: '', page: 1, limit: 20 });
  assert.equal(parseLocationQuery(new URLSearchParams('q=%25_%2C%28')).q, '%_,(');
  for (const query of ['page=0', 'page=1.5', 'limit=51', 'page=100001', 'page=1&page=2',
    'q=a&q=b', 'category=', 'unknown=1', `q=${'x'.repeat(201)}`]) {
    assert.equal(parseLocationQuery(new URLSearchParams(query)), null, query);
  }
  for (const id of ['0', '-1', '01', '1.0', 'abc', '2147483648']) {
    assert.equal(locationIdSchema.safeParse(id).success, false, id);
  }
  assert.equal(locationIdSchema.parse('1'), 1);
});

test('DTO keeps array metadata, orders floors naturally and omits internal fields', () => {
  const floor = (id, name) => ({ id, floor_name: name, location_id: 1, capacity: null,
    floor_hours: [], qr_code_id: 'must-not-be-returned' });
  const source = { id: 1, building: 'N16', name: 'Learning Exchange', category: ['อาคารเรียน'],
    aliases: ['LX'], details: {}, image_url: null, gps_lat: 13,
    floors: [floor(10, '10'), floor(2, '2'), floor(1, '1')] };
  const result = buildingDto(source, monday, true);
  assert.deepEqual(result.floors.map((f) => f.floor_name), ['1', '2', '10']);
  assert.deepEqual(result.aliases, ['LX']);
  assert.deepEqual(result.category, ['อาคารเรียน']);
  assert.equal(result.floors[0].availability.status, 'unknown');
  assert.equal(result.floors[0].capacity, null);
  assert.equal('gps_lat' in result, false);
  assert.equal('qr_code_id' in result.floors[0], false);
  assert.equal('floors' in buildingDto(source, monday), false);
});
