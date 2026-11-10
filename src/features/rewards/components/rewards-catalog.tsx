"use client";

import type { ReactNode } from "react";
import CardGiftcardOutlined from "@mui/icons-material/CardGiftcardOutlined";
import CloudOffOutlined from "@mui/icons-material/CloudOffOutlined";
import ErrorOutlineRounded from "@mui/icons-material/ErrorOutlineRounded";
import type {
  RewardCardModel,
  RewardSelectHandler,
  RewardsCatalogState,
} from "../types";
import { PointsSummary } from "./points-summary";
import { RewardCard, RewardCardSkeleton } from "./reward-card";

export interface RewardsCatalogProps {
  state: RewardsCatalogState;
  onSelectReward?: RewardSelectHandler;
  selectionDisabled?: boolean;
}

export function RewardsCatalog({
  state,
  onSelectReward,
  selectionDisabled,
}: RewardsCatalogProps) {
  switch (state.status) {
    case "loading":
      return (
        <div aria-busy="true" className="flex flex-col gap-11">
          <PointsSummary points={null} />
          <RewardSection title="รางวัลที่แลกได้ตอนนี้">
            <RewardCardSkeleton />
            <RewardCardSkeleton />
          </RewardSection>
          <span className="sr-only" role="status">
            กำลังโหลดรางวัล
          </span>
        </div>
      );
    case "unavailable":
      return (
        <CatalogMessage
          icon={<CloudOffOutlined aria-hidden="true" sx={{ fontSize: 40 }} />}
          title="ยังไม่เปิดให้แลกรางวัล"
          description={
            state.message ?? "ระบบแลกรางวัลยังไม่พร้อมใช้งาน โปรดกลับมาอีกครั้ง"
          }
        />
      );
    case "error":
      return (
        <CatalogMessage
          role="alert"
          icon={
            <ErrorOutlineRounded aria-hidden="true" sx={{ fontSize: 40 }} />
          }
          title="โหลดรางวัลไม่สำเร็จ"
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
        <ReadyCatalog
          points={state.points}
          rewards={state.rewards}
          onSelectReward={onSelectReward}
          selectionDisabled={selectionDisabled}
        />
      );
  }
}

function ReadyCatalog({
  points,
  rewards,
  onSelectReward,
  selectionDisabled,
}: {
  points: number;
  rewards: RewardCardModel[];
  onSelectReward?: RewardSelectHandler;
  selectionDisabled?: boolean;
}) {
  const current = rewards.filter(
    (reward) => reward.availability !== "upcoming",
  );
  const upcoming = rewards.filter(
    (reward) => reward.availability === "upcoming",
  );

  return (
    <div className="flex flex-col gap-11">
      <PointsSummary points={points} />

      {rewards.length === 0 ? (
        <CatalogMessage
          icon={
            <CardGiftcardOutlined aria-hidden="true" sx={{ fontSize: 40 }} />
          }
          title="ยังไม่มีรางวัล"
          description="ตอนนี้ยังไม่มีรางวัลให้แลก โปรดกลับมาดูใหม่ภายหลัง"
        />
      ) : (
        <>
          {current.length > 0 && (
            <RewardSection title="รางวัลที่แลกได้ตอนนี้">
              {current.map((reward) => (
                <RewardCard
                  key={reward.id}
                  reward={reward}
                  onSelect={onSelectReward}
                  disabled={selectionDisabled}
                />
              ))}
            </RewardSection>
          )}
          {upcoming.length > 0 && (
            <RewardSection title="เร็วๆ นี้">
              {upcoming.map((reward) => (
                <RewardCard key={reward.id} reward={reward} />
              ))}
            </RewardSection>
          )}
        </>
      )}
    </div>
  );
}

function RewardSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="mb-2 text-lg leading-7 font-semibold text-[#141414]">
        {title}
      </h2>
      {children}
    </section>
  );
}

function CatalogMessage({
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
