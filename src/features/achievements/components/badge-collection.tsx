"use client";

import type { ReactNode } from "react";
import CloudOffOutlined from "@mui/icons-material/CloudOffOutlined";
import EmojiEventsOutlined from "@mui/icons-material/EmojiEventsOutlined";
import ErrorOutlineRounded from "@mui/icons-material/ErrorOutlineRounded";
import type {
  AchievementsState,
  BadgeFilter,
  BadgeModel,
  BadgeSelectHandler,
} from "../types";
import { getBadgeCollectionView } from "../view-model";
import { BadgeFilterTabs } from "./badge-filter-tabs";
import { BadgeItem, BadgeItemSkeleton } from "./badge-item";

const countFormatter = new Intl.NumberFormat("th-TH");

export interface BadgeCollectionProps {
  state: AchievementsState;
  filter: BadgeFilter;
  onFilterChange: (filter: BadgeFilter) => void;
  onSelectBadge?: BadgeSelectHandler;
}

export function BadgeCollection({
  state,
  filter,
  onFilterChange,
  onSelectBadge,
}: BadgeCollectionProps) {
  switch (state.status) {
    case "loading":
      return (
        <div aria-busy="true" className="flex flex-col gap-6">
          <BadgeSection title="ปลดล็อกแล้ว">
            <BadgeGrid>
              {Array.from({ length: 4 }, (_, index) => (
                <BadgeItemSkeleton key={index} />
              ))}
            </BadgeGrid>
          </BadgeSection>
          <span className="sr-only" role="status">
            กำลังโหลดความสำเร็จ
          </span>
        </div>
      );
    case "unavailable":
      return (
        <CollectionMessage
          icon={<CloudOffOutlined aria-hidden="true" sx={{ fontSize: 40 }} />}
          title="ยังไม่เปิดระบบความสำเร็จ"
          description={
            state.message ??
            "ระบบเหรียญความสำเร็จยังไม่พร้อมใช้งาน โปรดกลับมาอีกครั้ง"
          }
        />
      );
    case "error":
      return (
        <CollectionMessage
          role="alert"
          icon={
            <ErrorOutlineRounded aria-hidden="true" sx={{ fontSize: 40 }} />
          }
          title="โหลดความสำเร็จไม่สำเร็จ"
          description={state.message ?? "เกิดข้อผิดพลาด โปรดลองใหม่อีกครั้ง"}
          action={
            state.onRetry && (
              <button
                type="button"
                onClick={state.onRetry}
                className="mt-2 h-10 cursor-pointer rounded-lg border-0 bg-[#e0622a] px-5 text-sm font-semibold text-white hover:bg-[#c9531f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e0622a]"
              >
                ลองใหม่
              </button>
            )
          }
        />
      );
    case "ready":
      return (
        <ReadyCollection
          badges={state.badges}
          filter={filter}
          onFilterChange={onFilterChange}
          onSelectBadge={onSelectBadge}
        />
      );
  }
}

function ReadyCollection({
  badges,
  filter,
  onFilterChange,
  onSelectBadge,
}: {
  badges: BadgeModel[];
  filter: BadgeFilter;
  onFilterChange: (filter: BadgeFilter) => void;
  onSelectBadge?: BadgeSelectHandler;
}) {
  if (badges.length === 0) {
    return (
      <CollectionMessage
        icon={<EmojiEventsOutlined aria-hidden="true" sx={{ fontSize: 40 }} />}
        title="ยังไม่มีเหรียญความสำเร็จ"
        description="ตอนนี้ยังไม่มีเหรียญให้สะสม โปรดกลับมาดูใหม่ภายหลัง"
      />
    );
  }

  const view = getBadgeCollectionView(badges, filter);

  return (
    <div className="flex flex-col gap-6">
      <BadgeFilterTabs value={filter} onChange={onFilterChange} />

      {view.showEarned && (
        <BadgeSection
          title="ปลดล็อกแล้ว"
          count={`${countFormatter.format(view.earned.length)} จาก ${countFormatter.format(view.total)}`}
        >
          {view.earned.length > 0 ? (
            <BadgeGrid>
              {view.earned.map((badge) => (
                <BadgeItem
                  key={badge.id}
                  badge={badge}
                  onSelect={onSelectBadge}
                />
              ))}
            </BadgeGrid>
          ) : (
            <SectionEmpty>
              ยังไม่ได้รับเหรียญ ลองทำภารกิจเพื่อปลดล็อก
            </SectionEmpty>
          )}
        </BadgeSection>
      )}

      {view.showLocked && (
        <BadgeSection title="ยังไม่ปลดล็อก">
          {view.locked.length > 0 ? (
            <BadgeGrid>
              {view.locked.map((badge) => (
                <BadgeItem
                  key={badge.id}
                  badge={badge}
                  onSelect={onSelectBadge}
                />
              ))}
            </BadgeGrid>
          ) : (
            <SectionEmpty>ปลดล็อกครบทุกเหรียญแล้ว</SectionEmpty>
          )}
        </BadgeSection>
      )}
    </div>
  );
}

function BadgeSection({
  title,
  count,
  children,
}: {
  title: string;
  count?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-[15px] leading-6 font-semibold text-[#141414]">
        {title}
        {count && (
          <span className="ml-2 text-[13px] font-normal text-[#9ca3af]">
            {count}
          </span>
        )}
      </h2>
      {children}
    </section>
  );
}

function BadgeGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(4.25rem,1fr))] gap-x-1 gap-y-2">
      {children}
    </div>
  );
}

function SectionEmpty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl bg-[#f0f1f3] px-4 py-5 text-center text-sm leading-5 text-[#6b7280]">
      {children}
    </p>
  );
}

function CollectionMessage({
  icon,
  title,
  description,
  action,
  role,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  role?: "alert";
}) {
  return (
    <div
      role={role}
      className="flex flex-col items-center gap-1.5 rounded-2xl bg-[#f0f1f3] px-6 py-10 text-center"
    >
      <span className="mb-1 text-[#9ca3af]">{icon}</span>
      <p className="text-base leading-6 font-semibold text-[#141414]">
        {title}
      </p>
      <p className="text-sm leading-5 text-[#6b7280]">{description}</p>
      {action}
    </div>
  );
}
