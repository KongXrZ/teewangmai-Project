import type {
  AvailabilityStatus,
  BuildingAvailabilityModel,
  CrowdSummaryStatus,
  FloorDetailItem,
  OpeningHours,
} from "../components/location-view-models";

export interface ApiIntervalDto {
  readonly open_time: string;
  readonly close_time: string;
}

export interface ApiAvailabilityDto {
  readonly status: AvailabilityStatus;
  readonly today_intervals: readonly ApiIntervalDto[];
  readonly display_hours?: string | null;
}

export interface ApiWeeklyHourDto {
  readonly day_of_week: number;
  readonly open_time: string;
  readonly close_time: string;
  readonly is_active: boolean;
}

const DAY_LABELS: Record<number, string> = {
  1: "จันทร์",
  2: "อังคาร",
  3: "พุธ",
  4: "พฤหัสบดี",
  5: "ศุกร์",
  6: "เสาร์",
  7: "อาทิตย์",
};

const timeFormatter = new Intl.DateTimeFormat("th-TH", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "Asia/Bangkok",
});

function formatTimeHm(time: string): string {
  return time.slice(0, 5);
}

function formatIntervalList(intervals: readonly ApiIntervalDto[]): string | null {
  if (intervals.length === 0) {
    return null;
  }
  return intervals
    .map((item) => `${formatTimeHm(item.open_time)} - ${formatTimeHm(item.close_time)}`)
    .join(", ");
}

export function formatDisplayHoursText(
  availability: Pick<ApiAvailabilityDto, "today_intervals" | "display_hours">,
): string | null {
  const fromIntervals = formatIntervalList(availability.today_intervals);
  if (fromIntervals) {
    return fromIntervals;
  }
  const raw = availability.display_hours?.trim();
  if (!raw) {
    return null;
  }
  return raw.replace(/(\d{2}:\d{2}):\d{2}/g, "$1").replace(/[–-]/g, " - ");
}

export function toAvailabilityModel(
  availability?: ApiAvailabilityDto | null,
): BuildingAvailabilityModel | undefined {
  if (!availability) {
    return undefined;
  }
  return {
    status: availability.status,
    displayHours: formatDisplayHoursText(availability),
  };
}

export function toOpeningHours(
  availability?: ApiAvailabilityDto | null,
): OpeningHours | "closed" | null {
  if (!availability) {
    return null;
  }
  const { status, today_intervals: intervals } = availability;
  if (intervals.length === 1) {
    return {
      open: intervals[0].open_time,
      close: intervals[0].close_time,
    };
  }
  if (intervals.length > 1) {
    return {
      open: intervals[0].open_time,
      close: intervals[intervals.length - 1].close_time,
      display: formatDisplayHoursText(availability) ?? undefined,
    };
  }
  if (status === "closed") {
    return "closed";
  }
  const display = formatDisplayHoursText(availability);
  if (display) {
    return { open: "", close: "", display };
  }
  return null;
}

export function formatFloorHoursValue(
  openingHours: OpeningHours | "closed" | null,
): string {
  if (openingHours === null) {
    return "ไม่ทราบเวลาเปิด";
  }
  if (openingHours === "closed") {
    return "ปิดวันนี้";
  }
  if (openingHours.display) {
    return openingHours.display;
  }
  return `${formatTimeHm(openingHours.open)} - ${formatTimeHm(openingHours.close)}`;
}

export function formatBuildingHoursLabel(
  availability?: BuildingAvailabilityModel | null,
): string | null {
  if (!availability) {
    return null;
  }
  if (availability.status === "open") {
    return availability.displayHours
      ? `เวลาเปิดอาคาร (อย่างน้อย 1 ชั้น): ${availability.displayHours}`
      : "เวลาเปิดอาคาร: เปิดให้บริการวันนี้";
  }
  if (availability.status === "closed") {
    return "เวลาเปิดอาคาร: ปิดวันนี้ทุกชั้น";
  }
  return availability.displayHours
    ? `เวลาเปิดอาคาร (ไม่ครบทุกชั้น): ${availability.displayHours}`
    : "เวลาเปิดอาคาร: ไม่ทราบเวลาเปิดวันนี้";
}

export function formatTimeOnly(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return `${timeFormatter.format(date)} น.`;
}

export function formatCrowdTimestampLines(meta?: {
  status?: CrowdSummaryStatus;
  latestReportAt?: string | null;
  calculatedAt?: string | null;
}): { reportText: string; calculatedText: string } | null {
  if (!meta) {
    return null;
  }
  const latestFormatted = formatTimeOnly(meta.latestReportAt);
  const calculatedFormatted = formatTimeOnly(meta.calculatedAt);

  const reportText = latestFormatted
    ? `รายงานล่าสุด ${latestFormatted}`
    : meta.status === "stale"
      ? "รายงานล่าสุด เกินระยะเวลากำหนด"
      : meta.status === "pending"
        ? "รายงานล่าสุด รอคำนวณ"
        : "รายงานล่าสุด ไม่มีใน 30 นาทีนี้";

  const calculatedText = calculatedFormatted
    ? `คำนวณรอบล่าสุด ${calculatedFormatted}`
    : "คำนวณรอบล่าสุด รอประมวลผลรอบแรก";

  return { reportText, calculatedText };
}

export function buildWeeklyScheduleItems(
  hours?: readonly ApiWeeklyHourDto[],
): FloorDetailItem[] {
  if (!hours || hours.length === 0) {
    return [];
  }
  const sorted = [...hours].sort((a, b) => a.day_of_week - b.day_of_week);
  return sorted
    .filter((row) => DAY_LABELS[row.day_of_week] !== undefined)
    .map((row) => ({
      label: `วัน${DAY_LABELS[row.day_of_week]}`,
      value: row.is_active
        ? `${formatTimeHm(row.open_time)} - ${formatTimeHm(row.close_time)}`
        : "ปิดให้บริการ",
    }));
}
