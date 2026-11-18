import type {
  ReportHistoryFilter,
  ReportHistoryItem,
} from "./profile-view-models";

export type ReportHistoryGroupId = "today" | "week" | "month" | "earlier";

export interface ReportHistoryRow extends ReportHistoryItem {
  timeLabel: string;
}

export interface ReportHistoryGroup {
  id: ReportHistoryGroupId;
  label: string;
  reports: ReportHistoryRow[];
}

export const reportHistoryFilters: {
  id: ReportHistoryFilter;
  label: string;
}[] = [
  { id: "all", label: "ทั้งหมด" },
  { id: "week", label: "สัปดาห์นี้" },
  { id: "month", label: "เดือนนี้" },
];

const groupLabels: Record<ReportHistoryGroupId, string> = {
  today: "วันนี้",
  week: "สัปดาห์นี้",
  month: "เดือนนี้",
  earlier: "ก่อนหน้านี้",
};

const timeZone = "Asia/Bangkok";
const bangkokOffsetMs = 7 * 3_600_000;
const dayMs = 86_400_000;
const timeFormat = new Intl.DateTimeFormat("th-TH", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone,
});
const dateFormat = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "short",
  timeZone,
});
const dateWithYearFormat = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "short",
  year: "2-digit",
  timeZone,
});

interface CalendarDay {
  day: number;
  month: number;
  year: number;
}

function toCalendarDay(date: Date): CalendarDay {
  const local = date.getTime() + bangkokOffsetMs;
  const shifted = new Date(local);
  return {
    day: Math.floor(local / dayMs),
    month: shifted.getUTCFullYear() * 12 + shifted.getUTCMonth(),
    year: shifted.getUTCFullYear(),
  };
}

function weekStart(day: number) {
  const weekday = (new Date(day * dayMs).getUTCDay() + 6) % 7;
  return day - weekday;
}

function groupOf(report: CalendarDay, today: CalendarDay): ReportHistoryGroupId {
  if (report.day >= today.day) return "today";
  if (report.day >= weekStart(today.day)) return "week";
  if (report.month === today.month) return "month";
  return "earlier";
}

function matchesFilter(
  group: ReportHistoryGroupId,
  report: CalendarDay,
  today: CalendarDay,
  filter: ReportHistoryFilter,
) {
  if (filter === "week") return group === "today" || group === "week";
  if (filter === "month") return report.month === today.month;
  return true;
}

function timeLabel(date: Date, report: CalendarDay, today: CalendarDay) {
  const time = `${timeFormat.format(date)} น.`;
  if (report.day === today.day) return time;
  const format = report.year === today.year ? dateFormat : dateWithYearFormat;
  return `${format.format(date)} · ${time}`;
}

export function groupReportHistory(
  reports: ReportHistoryItem[],
  filter: ReportHistoryFilter,
  now: Date,
): ReportHistoryGroup[] {
  const today = toCalendarDay(now);
  const groups = new Map<ReportHistoryGroupId, ReportHistoryRow[]>();

  const dated = reports
    .map((report) => ({ report, date: new Date(report.reportedAt) }))
    .filter(({ date }) => !Number.isNaN(date.getTime()))
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  const seen = new Set<string>();

  for (const { report, date } of dated) {
    if (seen.has(report.id)) continue;
    seen.add(report.id);
    const day = toCalendarDay(date);
    const group = groupOf(day, today);
    if (!matchesFilter(group, day, today, filter)) continue;
    const rows = groups.get(group) ?? [];
    rows.push({ ...report, timeLabel: timeLabel(date, day, today) });
    groups.set(group, rows);
  }

  return (["today", "week", "month", "earlier"] as const)
    .filter((id) => groups.has(id))
    .map((id) => ({ id, label: groupLabels[id], reports: groups.get(id)! }));
}
