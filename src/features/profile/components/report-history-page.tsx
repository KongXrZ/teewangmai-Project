"use client";

import { useMemo, useState } from "react";
import HistoryRounded from "@mui/icons-material/HistoryRounded";
import PlaceOutlined from "@mui/icons-material/PlaceOutlined";
import WarningAmberRounded from "@mui/icons-material/WarningAmberRounded";
import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { CrowdTag } from "@/features/locations/components/building-card";
import { Spinner } from "@/features/quick-scan/components/spinner";
import type {
  ReportHistoryFilter,
  ReportHistoryItem,
  ReportHistoryState,
} from "./profile-view-models";
import {
  PageHeader,
  SkeletonBlock,
  StateMessage,
  pageMainClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "./profile-ui";
import {
  groupReportHistory,
  reportHistoryFilters,
  type ReportHistoryGroup,
} from "./report-history-groups";

export interface ReportHistoryPageProps {
  state: ReportHistoryState;
  onBack: () => void;
  onStartReport: () => void;
  onRetry: () => void;
  onLoadMore?: () => void;
}

export function ReportHistoryPage({
  state,
  onBack,
  onStartReport,
  onRetry,
  onLoadMore,
}: ReportHistoryPageProps) {
  return (
    <>
      <main
        aria-busy={state.status === "loading" || undefined}
        className={pageMainClass}
      >
        <PageHeader title="ประวัติการรายงาน" onBack={onBack} />
        <div className="mt-6 flex flex-col gap-1">
          <h2 className="text-xl leading-snug font-semibold text-[#141414]">
            รายงานของคุณ
          </h2>
          <p className="text-[15px] text-[#6b7280]">
            ดูรายการทั้งหมดที่คุณเคยรายงาน
          </p>
        </div>
        <HistoryContent
          state={state}
          onStartReport={onStartReport}
          onRetry={onRetry}
          onLoadMore={onLoadMore}
        />
      </main>
      <BottomNavigation selected="profile" />
    </>
  );
}

function HistoryContent({
  state,
  onStartReport,
  onRetry,
  onLoadMore,
}: Omit<ReportHistoryPageProps, "onBack">) {
  switch (state.status) {
    case "loading":
      return <HistorySkeleton />;
    case "error":
      return (
        <StateMessage
          role="alert"
          tone="danger"
          headingLevel={3}
          icon={<WarningAmberRounded aria-hidden="true" sx={{ fontSize: 40 }} />}
          title="โหลดประวัติการรายงานไม่สำเร็จ"
          description="ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต แล้วลองอีกครั้ง"
        >
          <button type="button" onClick={onRetry} className={primaryButtonClass}>
            ลองอีกครั้ง
          </button>
        </StateMessage>
      );
    case "ready":
      if (state.reports.length === 0 && !state.hasMore) {
        return (
          <StateMessage
            tone="brand"
            headingLevel={3}
            icon={<HistoryRounded aria-hidden="true" sx={{ fontSize: 40 }} />}
            title="ยังไม่มีประวัติการรายงาน"
            description={
              <>
                เมื่อคุณรายงานครั้งแรก
                <br />
                รายการจะแสดงที่นี่
              </>
            }
          >
            <button
              type="button"
              onClick={onStartReport}
              className={primaryButtonClass}
            >
              เริ่มรายงานครั้งแรก
            </button>
          </StateMessage>
        );
      }
      return (
        <ReportList
          reports={state.reports}
          hasMore={state.hasMore ?? false}
          loadingMore={state.loadingMore ?? false}
          loadMoreFailed={state.loadMoreFailed ?? false}
          onLoadMore={onLoadMore}
        />
      );
  }
}

function ReportList({
  reports,
  hasMore,
  loadingMore,
  loadMoreFailed,
  onLoadMore,
}: {
  reports: ReportHistoryItem[];
  hasMore: boolean;
  loadingMore: boolean;
  loadMoreFailed: boolean;
  onLoadMore?: () => void;
}) {
  const [filter, setFilter] = useState<ReportHistoryFilter>("all");
  const groups = useMemo(
    () => groupReportHistory(reports, filter, new Date()),
    [reports, filter],
  );

  return (
    <>
      <div
        role="group"
        aria-label="กรองช่วงเวลา"
        className="mt-5 flex flex-wrap gap-2 min-[360px]:gap-2.5"
      >
        {reportHistoryFilters.map((option) => {
          const active = option.id === filter;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(option.id)}
              className={`h-11 cursor-pointer touch-manipulation rounded-full border px-3.5 text-[15px] min-[360px]:px-5 transition-colors duration-150 [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#081828] ${
                active
                  ? "border-[#ea580c] bg-[#ea580c] font-semibold text-white"
                  : "border-[#e5e7eb] bg-white text-[#141414] hover:bg-[#f7f7f8]"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div role="status">
        {groups.length === 0 && (
          <p className="py-10 text-center text-[15px] text-[#6b7280]">
            ไม่มีรายงานในช่วงเวลานี้
          </p>
        )}
      </div>

      {groups.length > 0 && (
        <div className="mt-5 flex flex-col gap-5">
          {groups.map((group) => (
            <ReportGroup key={group.id} group={group} />
          ))}
        </div>
      )}

      {loadMoreFailed && !loadingMore && (
        <p role="alert" className="mt-5 text-center text-sm text-[#dc2626]">
          โหลดรายการเพิ่มไม่สำเร็จ กรุณาลองอีกครั้ง
        </p>
      )}

      {hasMore && onLoadMore && (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={loadingMore}
          aria-busy={loadingMore || undefined}
          className={`${secondaryButtonClass} mt-5`}
        >
          {loadingMore && (
            <Spinner className="h-4 w-4 border-2 border-[#9ca3af]/35 border-t-[#6b7280]" />
          )}
          {loadingMore ? "กำลังโหลด…" : "ดูเพิ่มเติม"}
        </button>
      )}
    </>
  );
}

function ReportGroup({ group }: { group: ReportHistoryGroup }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="px-1 text-sm text-[#6b7280]">{group.label}</h3>
      <ul className="divide-y divide-[#e5e7eb] rounded-[20px] border border-[#e5e7eb]">
        {group.reports.map((report) => (
          <li
            key={report.id}
            className="grid min-h-[72px] grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2 px-4 py-3 min-[400px]:grid-cols-[2.5rem_minmax(0,1fr)_auto]"
          >
            <span className="row-span-2 flex h-10 w-10 items-center justify-center rounded-xl bg-[#f3f4f6] text-[#475569] min-[400px]:row-span-1">
              <PlaceOutlined aria-hidden="true" sx={{ fontSize: 22 }} />
            </span>
            <div>
              <p className="text-base leading-snug font-medium break-words text-[#141414]">
                {report.placeName}
              </p>
              <p className="mt-0.5 text-sm text-[#6b7280]">
                <time dateTime={report.reportedAt}>{report.timeLabel}</time>
              </p>
            </div>
            <span className="flex">
              <CrowdTag level={report.level} />
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function HistorySkeleton() {
  return (
    <div className="mt-5 flex flex-col gap-5">
      <span className="sr-only" role="status">
        กำลังโหลดประวัติการรายงาน
      </span>
      <div className="flex gap-2.5">
        {["w-20", "w-24", "w-[88px]"].map((width) => (
          <SkeletonBlock key={width} className={`h-11 rounded-full ${width}`} />
        ))}
      </div>
      <div className="divide-y divide-[#e5e7eb] rounded-[20px] border border-[#e5e7eb]">
        {[0, 1, 2].map((row) => (
          <div key={row} className="flex min-h-[72px] items-center gap-3 px-4">
            <SkeletonBlock className="h-10 w-10 rounded-xl" />
            <div className="flex flex-1 flex-col gap-2">
              <SkeletonBlock className="h-4 w-1/2 rounded-md" />
              <SkeletonBlock className="h-3 w-1/3 rounded-md" />
            </div>
            <SkeletonBlock className="h-7 w-20 rounded-[7px]" />
          </div>
        ))}
      </div>
    </div>
  );
}
