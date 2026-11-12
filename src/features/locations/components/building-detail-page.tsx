"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import AccessTime from "@mui/icons-material/AccessTime";
import ArrowBackIosNewRounded from "@mui/icons-material/ArrowBackIosNewRounded";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import Layers from "@mui/icons-material/Layers";
import WhereToVoteOutlined from "@mui/icons-material/WhereToVoteOutlined";
import {
  BottomNavigation,
  type NavigationItemId,
} from "@/components/layout/bottom-navigation";
import { formatUpdatedTime } from "./format-updated-time";
import type {
  BuildingDetailModel,
  BuildingDetailState,
  FloorId,
  FloorModel,
  FloorSelectHandler,
} from "./location-view-models";
import {
  BuildingImage,
  crowdLevelIcons,
  crowdLevelLabels,
  unknownCrowdLabel,
} from "./building-card";
import {
  crowdThemes,
  FloorStats,
  toFloorStats,
} from "./floor-stats";

const navigationRoutes: Partial<Record<NavigationItemId, string>> = {
  home: "/",
  places: "/locations",
};

export interface BuildingDetailPageProps {
  state: BuildingDetailState;
  initialFloorId?: FloorId;
  onSelectFloor?: FloorSelectHandler;
  onCheckIn?: () => void;
  onBack?: () => void;
}

export function BuildingDetailPage({
  state,
  initialFloorId,
  onSelectFloor,
  onCheckIn,
  onBack,
}: BuildingDetailPageProps) {
  const router = useRouter();

  function handleNavigate(id: NavigationItemId) {
    const href = navigationRoutes[id];
    if (href) {
      router.push(href);
    }
  }

  function handleBackToList() {
    const current = new URLSearchParams(window.location.search);
    const params = new URLSearchParams();
    for (const key of ["q", "level"]) {
      const value = current.get(key);
      if (value) {
        params.set(key, value);
      }
    }
    const search = params.toString();
    router.push(search ? `/locations?${search}` : "/locations");
  }

  const handleBack = onBack ?? handleBackToList;

  return (
    <>
      <main className="flex min-w-0 flex-1 flex-col px-4 pt-[max(1.625rem,env(safe-area-inset-top,0px))] pb-[calc(7.625rem+env(safe-area-inset-bottom,0px))] text-black min-[400px]:px-6">
        {state.status === "ready" ? (
          <BuildingDetail
            building={state.building}
            initialFloorId={initialFloorId}
            onSelectFloor={onSelectFloor}
            onCheckIn={onCheckIn}
            onBack={handleBack}
          />
        ) : (
          <>
            <BackButton onClick={handleBack} className="mb-3 self-start" />
            <DetailMessage status={state.status} />
          </>
        )}
      </main>
      <BottomNavigation selected="places" onChange={handleNavigate} />
    </>
  );
}

function DetailMessage({
  status,
}: {
  status: "loading" | "unavailable" | "error";
}) {
  const content = {
    loading: { title: "กำลังโหลดข้อมูลอาคาร...", description: undefined },
    unavailable: {
      title: "ยังไม่มีข้อมูลอาคาร",
      description: "ระบบข้อมูลอาคารยังไม่พร้อมใช้งาน โปรดกลับมาอีกครั้ง",
    },
    error: {
      title: "โหลดข้อมูลอาคารไม่สำเร็จ",
      description: "เกิดข้อผิดพลาด โปรดลองใหม่อีกครั้ง",
    },
  }[status];

  return (
    <div
      role={status === "error" ? "alert" : "status"}
      className="flex flex-col items-center rounded-[10px] bg-white px-6 py-8 text-center"
    >
      <h1 className="text-2xl leading-snug font-bold">{content.title}</h1>
      {content.description && (
        <p className="mt-1 text-[13px] leading-normal">{content.description}</p>
      )}
    </div>
  );
}

function BackButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="ย้อนกลับ"
      className={`flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-white/90 text-black shadow-sm transition-colors duration-150 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff5815] ${className}`}
    >
      <ArrowBackIosNewRounded aria-hidden="true" sx={{ fontSize: 20 }} />
    </button>
  );
}

function BuildingDetail({
  building,
  initialFloorId,
  onSelectFloor,
  onCheckIn,
  onBack,
}: {
  building: BuildingDetailModel;
  initialFloorId?: FloorId;
  onSelectFloor?: FloorSelectHandler;
  onCheckIn?: () => void;
  onBack: () => void;
}) {
  const [selectedFloorId, setSelectedFloorId] = useState<FloorId | undefined>(
    initialFloorId ?? building.floors[0]?.id,
  );
  const selectedFloor =
    building.floors.find((floor) => floor.id === selectedFloorId) ??
    building.floors[0];

  function handleSelectFloor(id: FloorId) {
    if (id === selectedFloor?.id) {
      return;
    }
    setSelectedFloorId(id);
    onSelectFloor?.(id);
  }

  return (
    <>
      <div className="relative">
        <BuildingImage
          imageUrl={building.imageUrl}
          sizes="(max-width: 476px) 100vw, 428px"
          fallbackSize={96}
          preload
          className="aspect-[428/354] w-full"
        />
        <BackButton onClick={onBack} className="absolute top-2 left-2" />
      </div>

      <h1 className="mt-3 flex flex-wrap items-baseline justify-between gap-x-3 font-[family-name:var(--font-noto-sans-thai)] text-[26px] leading-[1.35] font-bold">
        <span className="min-w-0 wrap-anywhere">{building.name}</span>
        <span className="whitespace-nowrap">( {building.code} )</span>
      </h1>

      <section
        aria-label="ข้อมูลรายชั้น"
        className="mt-1 flex flex-col gap-2.5 rounded-[10px] bg-white p-3"
      >
        {selectedFloor ? (
          <>
            <FloorSelector
              floors={building.floors}
              selectedId={selectedFloor.id}
              onSelect={handleSelectFloor}
            />
            <FloorPanel floor={selectedFloor} />
          </>
        ) : (
          <p className="py-6 text-center text-[13px] font-bold">
            ยังไม่มีข้อมูลชั้นของอาคารนี้
          </p>
        )}
        <button
          type="button"
          onClick={onCheckIn}
          disabled={!onCheckIn}
          className="flex h-[58px] w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] border-0 bg-[#ff5815] font-[family-name:var(--font-noto-sans-thai)] text-lg font-semibold text-white transition-colors duration-150 hover:bg-[#e94e10] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff5815] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <WhereToVoteOutlined aria-hidden="true" sx={{ fontSize: 26 }} />
          เช็คอินที่นี่
        </button>
      </section>
    </>
  );
}

function FloorSelector({
  floors,
  selectedId,
  onSelect,
}: {
  floors: FloorModel[];
  selectedId: FloorId;
  onSelect: (id: FloorId) => void;
}) {
  const labelId = useId();

  return (
    <div className="flex items-center gap-1.5">
      <p
        id={labelId}
        className="flex shrink-0 items-center gap-0.5 text-[15px] font-semibold whitespace-nowrap"
      >
        <Layers
          aria-hidden="true"
          sx={{ fontSize: 18 }}
          className="text-[#ff5815]"
        />
        เลือกชั้น
      </p>
      <div
        role="group"
        aria-labelledby={labelId}
        className="flex w-0 min-w-0 flex-1 overflow-x-auto rounded-[10px] bg-[#f4f5f7]"
      >
        {floors.map((floor) => {
          const selected = floor.id === selectedId;
          return (
            <button
              key={floor.id}
              type="button"
              aria-pressed={selected}
              aria-label={`ชั้น ${floor.label}`}
              onClick={() => onSelect(floor.id)}
              className={`h-11 min-w-[55px] flex-1 shrink-0 cursor-pointer rounded-[10px] border-0 px-2 text-[15px] font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#ff5815] ${
                selected
                  ? "bg-[#ff5815] text-white"
                  : "bg-transparent text-black"
              }`}
            >
              {floor.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FloorPanel({ floor }: { floor: FloorModel }) {
  const crowd = floor.crowd;
  const level =
    crowd.status === "ready" ? (crowd.level ?? "unknown") : "unknown";
  const theme = crowdThemes[level];

  return (
    <div className={`rounded-[10px] px-3 py-3 ${theme.panel}`}>
      <CrowdSummary floor={floor} />
      {crowd.status === "ready" && (
        <div className="mt-3 flex">
          <FloorStats
            stats={toFloorStats(floor)}
            iconClassName={theme.accent}
            dividerClassName={theme.border}
            labelClassName="text-black"
          />
        </div>
      )}
      <span
        aria-hidden="true"
        className={`mt-2.5 block h-px ${theme.divider}`}
      />
      <FloorDetails details={floor.details} />
    </div>
  );
}

function CrowdSummary({ floor }: { floor: FloorModel }) {
  const crowd = floor.crowd;

  if (crowd.status !== "ready") {
    return (
      <p
        role={crowd.status === "error" ? "alert" : "status"}
        className="py-6 text-center text-[13px] font-bold"
      >
        {crowd.status === "loading"
          ? "กำลังโหลดความหนาแน่น..."
          : "โหลดข้อมูลความหนาแน่นไม่สำเร็จ"}
      </p>
    );
  }

  const level = crowd.level ?? "unknown";
  const theme = crowdThemes[level];
  const Icon = crowdLevelIcons[level];
  const label = crowd.level ? crowdLevelLabels[crowd.level] : unknownCrowdLabel;
  const updatedTime = formatUpdatedTime(crowd.updatedAt);

  return (
    <div
      data-crowd-level={level}
      className="flex items-center justify-center gap-3"
    >
      <span
        className={`flex h-[65px] w-[65px] shrink-0 items-center justify-center rounded-full ${theme.circle} ${theme.accent}`}
      >
        <Icon aria-hidden="true" sx={{ fontSize: 44 }} />
      </span>
      <div className="min-w-0">
        <p className="text-2xl leading-snug font-bold">{label}</p>
        {updatedTime && (
          <p className="flex items-center gap-1 text-xs leading-normal">
            <AccessTime
              aria-hidden="true"
              sx={{ fontSize: 12 }}
              className={theme.accent}
            />
            {updatedTime}
          </p>
        )}
      </div>
    </div>
  );
}

function FloorDetails({ details }: { details: FloorModel["details"] }) {
  const titleId = useId();

  return (
    <section aria-labelledby={titleId} className="mt-2">
      <h2
        id={titleId}
        className="flex items-center gap-1 text-sm leading-normal font-bold"
      >
        <InfoOutlined aria-hidden="true" sx={{ fontSize: 16 }} />
        ข้อมูลเพิ่มเติม
      </h2>
      {details.length > 0 ? (
        <dl className="m-0 mt-1 grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 px-6 text-[11px] leading-normal">
          {details.map((item, index) => (
            <div key={`${item.label}-${index}`} className="contents">
              <dt className="font-bold wrap-anywhere">{item.label}</dt>
              <dd className="m-0 text-right wrap-anywhere">{item.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <div className="py-4 text-center">
          <p className="text-[13px] leading-normal font-bold">
            ยังไม่มีข้อมูลเพิ่มเติมของชั้นนี้
          </p>
          <p className="text-xs leading-normal">
            ลองเปลี่ยนชั้นหรืออาคารเพื่อดูข้อมูลอื่นๆ
          </p>
        </div>
      )}
    </section>
  );
}
