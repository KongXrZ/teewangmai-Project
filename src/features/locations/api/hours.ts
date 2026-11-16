export interface FloorHours {
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_active: boolean;
}

export interface Availability {
  status: "open" | "closed" | "unknown";
  // Calendar-day coverage, not a promise that every floor shares these hours.
  today_intervals: { open_time: string; close_time: string }[];
  display_hours: string | null;
}

const DAY = 86400;
const BANGKOK_OFFSET = 7 * 3600000;
const weekdays = [7, 1, 2, 3, 4, 5, 6];

export function bangkokClock(now: Date) {
  const local = new Date(now.getTime() + BANGKOK_OFFSET);
  return {
    day: weekdays[local.getUTCDay()],
    seconds: local.getUTCHours() * 3600 + local.getUTCMinutes() * 60
      + local.getUTCSeconds() + local.getUTCMilliseconds() / 1000,
  };
}

function seconds(time: string) {
  const [h, m, s] = time.split(":").map(Number);
  return h * 3600 + m * 60 + (s ?? 0);
}

function clock(value: number) {
  if (value === DAY) return "24:00:00";
  const h = Math.floor(value / 3600);
  const m = Math.floor(value % 3600 / 60);
  const s = value % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function merge(intervals: [number, number][]) {
  const result: [number, number][] = [];
  for (const [start, end] of intervals.sort((a, b) => a[0] - b[0])) {
    const last = result.at(-1);
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else result.push([start, end]);
  }
  return result;
}

function coverage(intervals: [number, number][]) {
  const today_intervals = merge(intervals).map(([start, end]) => ({
    open_time: clock(start), close_time: clock(end),
  }));
  return {
    today_intervals,
    display_hours: today_intervals.length
      ? today_intervals.map((h) => `${h.open_time}–${h.close_time}`).join(", ")
      : null,
  };
}

export function floorAvailability(hours: FloorHours[], now: Date): Availability {
  const { day, seconds: current } = bangkokClock(now);
  const today = hours.find((h) => h.day_of_week === day);
  const yesterday = hours.find((h) => h.day_of_week === (day === 1 ? 7 : day - 1));
  const intervals: [number, number][] = [];

  // A previous day's overnight opening remains valid after midnight.
  if (yesterday?.is_active && seconds(yesterday.close_time) < seconds(yesterday.open_time)) {
    const end = seconds(yesterday.close_time);
    if (end > 0) intervals.push([0, end]);
  }
  if (today?.is_active) {
    const start = seconds(today.open_time);
    const end = seconds(today.close_time);
    if (start === 0 && end === DAY - 1) intervals.push([0, DAY]);
    else if (end < start) intervals.push([start, DAY]);
    else if (end > start) intervals.push([start, end]);
  }

  const isOpen = intervals.some(([start, end]) => current >= start && current < end);
  return {
    status: isOpen ? "open" : today ? "closed" : "unknown",
    ...coverage(intervals),
  };
}

export function buildingAvailability(floors: Availability[]): Availability {
  const intervals = floors.flatMap((floor) => floor.today_intervals.map(
    (h): [number, number] => [seconds(h.open_time), seconds(h.close_time)],
  ));
  return {
    status: floors.some((f) => f.status === "open") ? "open"
      : !floors.length || floors.some((f) => f.status === "unknown") ? "unknown" : "closed",
    ...coverage(intervals),
  };
}
