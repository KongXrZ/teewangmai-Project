"use client";

import type { ComponentType, ReactNode } from "react";
import Avatar from "@mui/material/Avatar";
import type { SvgIconProps } from "@mui/material/SvgIcon";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import HistoryRounded from "@mui/icons-material/HistoryRounded";
import LogoutRounded from "@mui/icons-material/LogoutRounded";
import PersonOutlineRounded from "@mui/icons-material/PersonOutlineRounded";
import PhotoCameraOutlined from "@mui/icons-material/PhotoCameraOutlined";
import SettingsOutlined from "@mui/icons-material/SettingsOutlined";
import WarningAmberRounded from "@mui/icons-material/WarningAmberRounded";
import WorkspacePremiumOutlined from "@mui/icons-material/WorkspacePremiumOutlined";
import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { Spinner } from "@/features/quick-scan/components/spinner";
import type { ProfileModel, ProfileState } from "./profile-view-models";
import {
  SkeletonBlock,
  StateMessage,
  pageMainClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "./profile-ui";

export interface ProfilePageProps {
  state: ProfileState;
  onEdit: () => void;
  onReportHistory: () => void;
  onRedeemHistory: () => void;
  onBadges: () => void;
  onLogout: () => void;
  loggingOut?: boolean;
  logoutError?: string | null;
  onRetry: () => void;
  onLogin: () => void;
  onSignup: () => void;
}

const numberFormat = new Intl.NumberFormat("th-TH");

export function ProfilePage({ state, ...handlers }: ProfilePageProps) {
  return (
    <>
      <main
        aria-busy={state.status === "loading" || undefined}
        className={`${pageMainClass} pt-[max(2rem,env(safe-area-inset-top,0px))]`}
      >
        <h1 className="sr-only">โปรไฟล์</h1>
        <ProfileContent state={state} {...handlers} />
      </main>
      <BottomNavigation selected="profile" />
    </>
  );
}

function ProfileContent({
  state,
  onRetry,
  onLogin,
  onSignup,
  ...menu
}: ProfilePageProps) {
  switch (state.status) {
    case "loading":
      return <ProfileSkeleton />;
    case "error":
      return (
        <StateMessage
          role="alert"
          tone="danger"
          icon={<WarningAmberRounded aria-hidden="true" sx={{ fontSize: 40 }} />}
          title="โหลดข้อมูลโปรไฟล์ไม่สำเร็จ"
          description="ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต แล้วลองอีกครั้ง"
        >
          <button type="button" onClick={onRetry} className={primaryButtonClass}>
            ลองอีกครั้ง
          </button>
        </StateMessage>
      );
    case "signed-out":
      return (
        <StateMessage
          tone="brand"
          icon={
            <PersonOutlineRounded aria-hidden="true" sx={{ fontSize: 44 }} />
          }
          title="ยังไม่ได้เข้าสู่ระบบ"
          description="เข้าสู่ระบบเพื่อดูแต้ม ประวัติการรายงาน และแบดจ์ของคุณ"
        >
          <button type="button" onClick={onLogin} className={primaryButtonClass}>
            เข้าสู่ระบบ
          </button>
          <button
            type="button"
            onClick={onSignup}
            className={secondaryButtonClass}
          >
            สมัคร
          </button>
        </StateMessage>
      );
    case "ready":
      return <ProfileOverview profile={state.profile} {...menu} />;
  }
}

function ProfileOverview({
  profile,
  onEdit,
  onReportHistory,
  onRedeemHistory,
  onBadges,
  onLogout,
  loggingOut = false,
  logoutError = null,
}: {
  profile: ProfileModel;
  onEdit: () => void;
  onReportHistory: () => void;
  onRedeemHistory: () => void;
  onBadges: () => void;
  onLogout: () => void;
  loggingOut?: boolean;
  logoutError?: string | null;
}) {
  const stats = [
    { label: "แต้ม", value: profile.points },
    { label: "ครั้งที่รายงาน", value: profile.reportCount },
    { label: "แบดจ์", value: profile.badgeCount },
  ];

  return (
    <fieldset
      disabled={loggingOut}
      className="m-0 flex min-w-0 flex-col gap-6 border-0 p-0"
    >
      <section
        aria-label="ข้อมูลบัญชี"
        className="rounded-[20px] border border-[#e5e7eb] p-4 sm:p-5"
      >
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onEdit}
            aria-label="เปลี่ยนรูปโปรไฟล์"
            className="group relative shrink-0 cursor-pointer touch-manipulation rounded-full border-0 bg-transparent p-0 [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ea580c] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Avatar
              component="span"
              src={profile.avatarUrl ?? undefined}
              alt=""
              sx={{
                width: 72,
                height: 72,
                bgcolor: "#fdebe0",
                color: "#ea580c",
              }}
            >
              <PersonOutlineRounded aria-hidden="true" sx={{ fontSize: 40 }} />
            </Avatar>
            <span
              aria-hidden="true"
              className="absolute inset-0 flex items-center justify-center rounded-full bg-[#081828]/45 text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 group-active:opacity-100 group-disabled:opacity-0"
            >
              <PhotoCameraOutlined sx={{ fontSize: 28 }} />
            </span>
          </button>
          <p className="line-clamp-2 min-w-0 flex-1 text-lg leading-snug font-semibold break-words text-[#141414] min-[360px]:text-xl">
            {profile.name}
          </p>
        </div>
        <dl className="mt-4 grid grid-cols-3 rounded-2xl bg-[#fff3ec] py-4">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className={`flex min-w-0 flex-col-reverse items-center gap-1 px-1 text-center ${
                index > 0 ? "border-l border-[#f6d5c4]" : ""
              }`}
            >
              <dt className="text-[13px] leading-tight text-[#6b7280]">
                {stat.label}
              </dt>
              <dd className="text-2xl leading-none font-bold text-[#ea580c] tabular-nums">
                {stat.value === null ? "–" : numberFormat.format(stat.value)}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <MenuGroup title="กิจกรรมของฉัน">
        <MenuRow
          icon={HistoryRounded}
          label="ประวัติการรายงาน"
          onClick={onReportHistory}
        />
        <MenuRow
          icon={HistoryRounded}
          label="ประวัติการแลกรางวัล"
          onClick={onRedeemHistory}
        />
        <MenuRow
          icon={WorkspacePremiumOutlined}
          label="แบดจ์ทั้งหมด"
          onClick={onBadges}
        />
      </MenuGroup>

      <MenuGroup title="บัญชีผู้ใช้">
        <MenuRow
          icon={SettingsOutlined}
          label="แก้ไขข้อมูลส่วนตัว"
          onClick={onEdit}
        />
        <MenuRow
          icon={LogoutRounded}
          label={loggingOut ? "กำลังออกจากระบบ…" : "ออกจากระบบ"}
          onClick={onLogout}
          danger
          busy={loggingOut}
        />
      </MenuGroup>
      <p role="status" className="sr-only">
        {loggingOut ? "กำลังออกจากระบบ" : ""}
      </p>
      {logoutError && (
        <p role="alert" className="-mt-3 px-1 text-sm text-[#b91c1c]">
          {logoutError}
        </p>
      )}
    </fieldset>
  );
}

function MenuGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-1 text-sm text-[#6b7280]">{title}</h2>
      <ul className="divide-y divide-[#e5e7eb] overflow-hidden rounded-[20px] border border-[#e5e7eb]">
        {children}
      </ul>
    </section>
  );
}

function MenuRow({
  icon: Icon,
  label,
  onClick,
  danger = false,
  busy = false,
}: {
  icon: ComponentType<SvgIconProps>;
  label: string;
  onClick: () => void;
  danger?: boolean;
  busy?: boolean;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        aria-busy={busy || undefined}
        className={`flex min-h-16 w-full cursor-pointer touch-manipulation items-center gap-3.5 border-0 bg-white px-4 text-left transition-colors duration-150 [-webkit-tap-highlight-color:transparent] hover:bg-[#f7f7f8] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#ea580c] disabled:cursor-not-allowed disabled:opacity-50 aria-busy:cursor-progress aria-busy:opacity-100 ${
          danger ? "text-[#c2410c]" : "text-[#141414]"
        }`}
      >
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            danger ? "bg-[#fdebe0]" : "bg-[#f3f4f6] text-[#475569]"
          }`}
        >
          {busy ? (
            <Spinner className="h-5 w-5 border-2 border-[#c2410c]/30 border-t-[#c2410c]" />
          ) : (
            <Icon aria-hidden="true" sx={{ fontSize: 22 }} />
          )}
        </span>
        <span className="min-w-0 flex-1 text-base font-medium">{label}</span>
        {!busy && (
          <ChevronRightRounded
            aria-hidden="true"
            sx={{ fontSize: 24, color: "#9ca3af" }}
          />
        )}
      </button>
    </li>
  );
}

function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <span className="sr-only" role="status">
        กำลังโหลดโปรไฟล์
      </span>
      <div className="rounded-[20px] border border-[#e5e7eb] p-4 sm:p-5">
        <div className="flex items-center gap-4">
          <SkeletonBlock className="h-[72px] w-[72px] rounded-full" />
          <SkeletonBlock className="h-5 flex-1 rounded-md" />
        </div>
        <SkeletonBlock className="mt-4 h-[84px] w-full rounded-2xl" />
      </div>
      {[3, 2].map((rows, group) => (
        <div key={group} className="flex flex-col gap-2">
          <SkeletonBlock className="h-4 w-24 rounded-md" />
          <div className="divide-y divide-[#e5e7eb] rounded-[20px] border border-[#e5e7eb]">
            {Array.from({ length: rows }, (_, row) => (
              <div key={row} className="flex min-h-16 items-center gap-3.5 px-4">
                <SkeletonBlock className="h-10 w-10 rounded-xl" />
                <SkeletonBlock className="h-4 w-2/5 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
