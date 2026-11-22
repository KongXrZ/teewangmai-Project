import { z } from "zod";
import type { ProfileStreakModel } from "./profile-view-models";

export const PROFILE_STREAK_ENDPOINT = "/api/profile/streak";

const streakResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    current_streak: z.number().int().nonnegative(),
    longest_streak: z.number().int().nonnegative(),
    checked_in_today: z.boolean(),
    last_checkin_date: z.string().min(1).nullable(),
  }),
});

export type ProfileStreakResult =
  | { ok: true; streak: ProfileStreakModel }
  | { ok: false; unauthorized: boolean };

export type ProfileStreakTone = "loading" | "idle" | "active" | "at-risk";

export interface ProfileStreakSummary {
  tone: ProfileStreakTone;
  valueText: string;
  subLabel: string;
  ariaLabel: string;
}

const numberFormat = new Intl.NumberFormat("th-TH");

export function parseProfileStreakResponse(
  status: number,
  body: unknown,
): ProfileStreakResult {
  if (status === 401) {
    return { ok: false, unauthorized: true };
  }
  if (status < 200 || status >= 300) {
    return { ok: false, unauthorized: false };
  }

  const parsed = streakResponseSchema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, unauthorized: false };
  }

  const { current_streak, longest_streak, checked_in_today, last_checkin_date } =
    parsed.data.data;

  return {
    ok: true,
    streak: {
      current: current_streak,
      longest: longest_streak,
      checkedInToday: checked_in_today,
      lastCheckinDate: last_checkin_date,
    },
  };
}

export async function fetchProfileStreak(
  options: { signal?: AbortSignal; fetchImpl?: typeof fetch } = {},
): Promise<ProfileStreakResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(PROFILE_STREAK_ENDPOINT, {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "same-origin",
    cache: "no-store",
    signal: options.signal,
  });

  if (response.status === 401) {
    return { ok: false, unauthorized: true };
  }

  const body = (await response.json().catch(() => null)) as unknown;
  return parseProfileStreakResponse(response.status, body);
}

export function getProfileStreakSummary(
  streak: ProfileStreakModel | null,
): ProfileStreakSummary {
  if (streak === null) {
    return {
      tone: "loading",
      valueText: "–",
      subLabel: "สตรีค",
      ariaLabel: "กำลังโหลดข้อมูลสตรีคเช็คอิน ดูแบดจ์ทั้งหมด",
    };
  }

  const currentLabel = `${numberFormat.format(streak.current)} วัน`;
  const longestLabel = `${numberFormat.format(streak.longest)} วัน`;

  if (streak.current === 0) {
    const subLabel =
      streak.longest > 0 ? `สูงสุด ${longestLabel}` : "เริ่มสตรีค";
    return {
      tone: "idle",
      valueText: currentLabel,
      subLabel,
      ariaLabel:
        streak.longest > 0
          ? `สตรีคเช็คอินปัจจุบัน 0 วัน สถิติสูงสุด ${longestLabel} ดูแบดจ์ทั้งหมด`
          : "ยังไม่มีสตรีคเช็คอินต่อเนื่อง ดูแบดจ์ทั้งหมด",
    };
  }

  if (streak.checkedInToday) {
    const subLabel =
      streak.longest > streak.current
        ? `สูงสุด ${longestLabel}`
        : "เช็คอินต่อเนื่อง";
    return {
      tone: "active",
      valueText: currentLabel,
      subLabel,
      ariaLabel: `สตรีคเช็คอินต่อเนื่อง ${currentLabel} เช็คอินวันนี้แล้ว ดูแบดจ์ทั้งหมด`,
    };
  }

  return {
    tone: "at-risk",
    valueText: currentLabel,
    subLabel: "เช็คอินวันนี้ต่อ",
    ariaLabel: `สตรีคเช็คอินต่อเนื่อง ${currentLabel} เช็คอินวันนี้เพื่อรักษาสตรีค ดูแบดจ์ทั้งหมด`,
  };
}
