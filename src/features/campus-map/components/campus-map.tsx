"use client";

import AddRounded from "@mui/icons-material/AddRounded";
import CloseFullscreenRounded from "@mui/icons-material/CloseFullscreenRounded";
import OpenInFullRounded from "@mui/icons-material/OpenInFullRounded";
import RemoveRounded from "@mui/icons-material/RemoveRounded";
import RestartAltRounded from "@mui/icons-material/RestartAltRounded";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CrowdLevelFilter } from "@/components/ui/crowd-level-filter";
import { BuildingCard } from "@/features/locations/components/building-card";
import { ExpandedBuildingCard } from "@/features/locations/components/expanded-building-card";
import type {
  BuildingCardModel,
  BuildingSelectHandler,
  ExpandedBuildingModel,
  FloorSelectHandler,
} from "@/features/locations/components/location-view-models";
import {
  BUILDING_CODES,
  CAMPUS_BUILDING_SHAPES,
  CAMPUS_MAP_IMAGE_SRC,
  CAMPUS_MAP_VIEWBOX,
  getBuildingsBoundingCenter,
  isBuildingCode,
  type BuildingCode,
} from "../building-shapes";
import {
  centerMapOnPoint,
  clampMapTransform,
  computeBaseScale,
  computeBuildingRenderStates,
  MAP_MAX_ZOOM,
  MAP_MIN_ZOOM,
  type CampusBuildingMarker,
  type CrowdFilterValue,
  type MapTransform,
  zoomAroundPoint,
} from "../map-state";

export interface CampusMapProps {
  readonly buildings?: readonly CampusBuildingMarker[];
  readonly selectedBuilding?: BuildingCardModel | null;
  readonly expandedBuilding?: ExpandedBuildingModel | null;
  readonly highlightedBuildingIds?: readonly string[];
  readonly mapFocusNonce?: number;
  readonly crowdFilter?: CrowdFilterValue;
  readonly defaultCrowdFilter?: CrowdFilterValue;
  readonly onCrowdFilterChange?: (value: CrowdFilterValue) => void;
  readonly onSelectBuilding?: BuildingSelectHandler;
  readonly onClearSelection?: () => void;
  readonly onSelectFloor?: FloorSelectHandler;
  readonly onViewDetail?: BuildingSelectHandler;
  readonly isFullscreen?: boolean;
  readonly defaultFullscreen?: boolean;
  readonly fullscreenLayout?: "fixed" | "contained";
  readonly onFullscreenChange?: (fullscreen: boolean) => void;
  readonly mapImageSrc?: string | null;
  readonly topSlot?: ReactNode;
  readonly isLoading?: boolean;
  readonly errorMessage?: string | null;
  readonly warningMessage?: string | null;
  readonly emptyMessage?: string | null;
  readonly onRetry?: () => void;
}

const DEFAULT_TRANSFORM: MapTransform = { zoom: 1, panX: 0, panY: 0 };
const DRAG_THRESHOLD_PX = 6;
const ZOOM_STEP = 0.5;

export function CampusMap({
  buildings = [],
  selectedBuilding = null,
  expandedBuilding = null,
  highlightedBuildingIds = [],
  mapFocusNonce = 0,
  crowdFilter: controlledFilter,
  defaultCrowdFilter = "all",
  onCrowdFilterChange,
  onSelectBuilding,
  onClearSelection,
  onSelectFloor,
  onViewDetail,
  isFullscreen: controlledFullscreen,
  defaultFullscreen = false,
  fullscreenLayout = "fixed",
  onFullscreenChange,
  mapImageSrc = CAMPUS_MAP_IMAGE_SRC,
  topSlot,
  isLoading = false,
  errorMessage = null,
  warningMessage = null,
  emptyMessage = null,
  onRetry,
}: CampusMapProps) {
  const [internalFilter, setInternalFilter] =
    useState<CrowdFilterValue>(defaultCrowdFilter);
  const [internalFullscreen, setInternalFullscreen] =
    useState<boolean>(defaultFullscreen);
  const [transform, setTransform] = useState<MapTransform>(DEFAULT_TRANSFORM);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [imageFailed, setImageFailed] = useState(false);
  const [isFocusAnimating, setIsFocusAnimating] = useState(false);
  const hasInitializedViewRef = useRef(false);
  const lastAppliedFocusKeyRef = useRef<string | null>(null);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const activePointersRef = useRef(new Map<number, { x: number; y: number }>());
  const gestureRef = useRef<{
    startX: number;
    startY: number;
    moved: boolean;
    pinchDist: number | null;
  }>({ startX: 0, startY: 0, moved: false, pinchDist: null });
  const suppressClickRef = useRef(false);

  const activeFilter = controlledFilter ?? internalFilter;
  const isFullscreen = controlledFullscreen ?? internalFullscreen;
  const selectedId = selectedBuilding?.id ?? null;

  const renderStates = useMemo(
    () =>
      computeBuildingRenderStates(buildings, {
        selectedBuildingId: selectedId,
        highlightedBuildingIds,
        crowdFilter: activeFilter,
      }),
    [buildings, selectedId, highlightedBuildingIds, activeFilter],
  );

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      setViewportSize((prev) =>
        prev.width === rect.width && prev.height === rect.height
          ? prev
          : { width: rect.width, height: rect.height },
      );

      if (!hasInitializedViewRef.current && rect.width > 0 && rect.height > 0) {
        hasInitializedViewRef.current = true;
        const contain = computeBaseScale(
          rect.width,
          rect.height,
          CAMPUS_MAP_VIEWBOX.width,
          CAMPUS_MAP_VIEWBOX.height,
        );
        const cover = Math.max(
          rect.width / CAMPUS_MAP_VIEWBOX.width,
          rect.height / CAMPUS_MAP_VIEWBOX.height,
        );
        const initialZoom = Math.min(1.65, Math.max(1.15, cover / contain));
        const centerAnchor = {
          x: rect.width / 2,
          y: rect.height / 2,
        };
        setTransform(
          zoomAroundPoint(
            { zoom: 1, panX: 0, panY: 0 },
            initialZoom,
            centerAnchor.x,
            centerAnchor.y,
            rect.width,
            rect.height,
            CAMPUS_MAP_VIEWBOX.width,
            CAMPUS_MAP_VIEWBOX.height,
          ),
        );
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, [isFullscreen]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      setIsFocusAnimating(false);
      const rect = el.getBoundingClientRect();
      const anchorX = event.clientX - rect.left;
      const anchorY = event.clientY - rect.top;
      const factor = event.deltaY < 0 ? 1.18 : 1 / 1.18;

      setTransform((prev) =>
        zoomAroundPoint(
          prev,
          prev.zoom * factor,
          anchorX,
          anchorY,
          rect.width,
          rect.height,
          CAMPUS_MAP_VIEWBOX.width,
          CAMPUS_MAP_VIEWBOX.height,
        ),
      );
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  useEffect(() => {
    if (!isFullscreen && !selectedBuilding) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (selectedBuilding && onClearSelection) {
        onClearSelection();
        return;
      }
      if (isFullscreen) {
        if (controlledFullscreen === undefined) {
          setInternalFullscreen(false);
        }
        onFullscreenChange?.(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isFullscreen,
    selectedBuilding,
    controlledFullscreen,
    onClearSelection,
    onFullscreenChange,
  ]);

  const highlightedKey = highlightedBuildingIds.join(",");
  const focusKey = selectedBuilding
    ? `selected:${selectedBuilding.id}:${mapFocusNonce}`
    : highlightedKey !== ""
      ? `highlight:${highlightedKey}:${mapFocusNonce}`
      : null;

  useEffect(() => {
    if (!focusKey) {
      lastAppliedFocusKeyRef.current = null;
      return;
    }
    if (viewportSize.width <= 0 || viewportSize.height <= 0) return;
    if (lastAppliedFocusKeyRef.current === focusKey) return;

    const targetCodes: BuildingCode[] = [];
    if (selectedBuilding) {
      const code = selectedBuilding.code.toUpperCase();
      if (isBuildingCode(code)) {
        targetCodes.push(code);
      }
    } else {
      for (const id of highlightedBuildingIds) {
        const marker = buildings.find((item) => item.id === id);
        if (!marker) continue;
        const code = marker.code.toUpperCase();
        if (isBuildingCode(code)) {
          targetCodes.push(code);
        }
      }
    }
    if (targetCodes.length === 0) return;

    const center = getBuildingsBoundingCenter(targetCodes);
    if (!center) return;

    lastAppliedFocusKeyRef.current = focusKey;
    const isSingleTarget = Boolean(selectedBuilding) || targetCodes.length === 1;
    const targetAnchorY = selectedBuilding ? 0.42 : 0.5;
    const frame = requestAnimationFrame(() => {
      setIsFocusAnimating(true);
      setTransform((prev) =>
        centerMapOnPoint(
          prev,
          center,
          viewportSize.width,
          viewportSize.height,
          CAMPUS_MAP_VIEWBOX.width,
          CAMPUS_MAP_VIEWBOX.height,
          {
            zoom: isSingleTarget ? Math.max(prev.zoom, 2) : prev.zoom,
            anchorRatioY: targetAnchorY,
          },
        ),
      );
    });
    return () => cancelAnimationFrame(frame);
  }, [
    focusKey,
    selectedBuilding,
    highlightedBuildingIds,
    buildings,
    viewportSize.width,
    viewportSize.height,
  ]);

  useEffect(() => {
    if (!isFocusAnimating) return;
    const timer = setTimeout(() => setIsFocusAnimating(false), 320);
    return () => clearTimeout(timer);
  }, [isFocusAnimating]);

  const clampedTransform = useMemo(
    () =>
      clampMapTransform(
        transform,
        viewportSize.width,
        viewportSize.height,
        CAMPUS_MAP_VIEWBOX.width,
        CAMPUS_MAP_VIEWBOX.height,
      ),
    [transform, viewportSize.width, viewportSize.height],
  );

  const baseScale = useMemo(
    () =>
      computeBaseScale(
        viewportSize.width,
        viewportSize.height,
        CAMPUS_MAP_VIEWBOX.width,
        CAMPUS_MAP_VIEWBOX.height,
      ),
    [viewportSize.width, viewportSize.height],
  );

  const totalScale = baseScale * clampedTransform.zoom;

  function handleFilterChange(next: CrowdFilterValue) {
    if (controlledFilter === undefined) {
      setInternalFilter(next);
    }
    onCrowdFilterChange?.(next);
  }

  function toggleFullscreen() {
    const next = !isFullscreen;
    if (controlledFullscreen === undefined) {
      setInternalFullscreen(next);
    }
    onFullscreenChange?.(next);
  }

  function stepZoom(delta: number) {
    const anchorX = viewportSize.width / 2;
    const anchorY = viewportSize.height / 2;
    setTransform((prev) =>
      zoomAroundPoint(
        prev,
        prev.zoom + delta,
        anchorX,
        anchorY,
        viewportSize.width,
        viewportSize.height,
        CAMPUS_MAP_VIEWBOX.width,
        CAMPUS_MAP_VIEWBOX.height,
      ),
    );
  }

  function resetView() {
    setTransform(DEFAULT_TRANSFORM);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    setIsFocusAnimating(false);
    activePointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    if (activePointersRef.current.size === 1) {
      gestureRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
        pinchDist: null,
      };
      suppressClickRef.current = false;
    } else if (activePointersRef.current.size === 2) {
      const pts = Array.from(activePointersRef.current.values());
      gestureRef.current.pinchDist = Math.hypot(
        pts[1].x - pts[0].x,
        pts[1].y - pts[0].y,
      );
      gestureRef.current.moved = true;
      suppressClickRef.current = true;
    }
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const prevPt = activePointersRef.current.get(event.pointerId);
    if (!prevPt) return;

    const dx = event.clientX - prevPt.x;
    const dy = event.clientY - prevPt.y;
    activePointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    const el = viewportRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();

    if (activePointersRef.current.size === 2) {
      const pts = Array.from(activePointersRef.current.values());
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const prevDist = gestureRef.current.pinchDist;
      gestureRef.current.pinchDist = dist;

      if (prevDist && prevDist > 0) {
        const midX = (pts[0].x + pts[1].x) / 2 - rect.left;
        const midY = (pts[0].y + pts[1].y) / 2 - rect.top;
        setTransform((prev) =>
          zoomAroundPoint(
            prev,
            prev.zoom * (dist / prevDist),
            midX,
            midY,
            rect.width,
            rect.height,
            CAMPUS_MAP_VIEWBOX.width,
            CAMPUS_MAP_VIEWBOX.height,
          ),
        );
      }
      return;
    }

    const totalMoved = Math.hypot(
      event.clientX - gestureRef.current.startX,
      event.clientY - gestureRef.current.startY,
    );
    if (totalMoved > DRAG_THRESHOLD_PX) {
      gestureRef.current.moved = true;
      suppressClickRef.current = true;
    }
    if (!gestureRef.current.moved) return;

    setTransform((prev) =>
      clampMapTransform(
        {
          zoom: prev.zoom,
          panX: prev.panX + dx,
          panY: prev.panY + dy,
        },
        rect.width,
        rect.height,
        CAMPUS_MAP_VIEWBOX.width,
        CAMPUS_MAP_VIEWBOX.height,
      ),
    );
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    activePointersRef.current.delete(event.pointerId);
    if (activePointersRef.current.size < 2) {
      gestureRef.current.pinchDist = null;
    }
  }

  function handleBackgroundClick() {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if (selectedBuilding) {
      onClearSelection?.();
    }
  }

  function handleBuildingActivate(buildingId: string) {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    onSelectBuilding?.(buildingId);
  }

  const showFallbackPlaceholder = Boolean(!mapImageSrc || imageFailed);

  const selectedCardContent = selectedBuilding ? (
    expandedBuilding && expandedBuilding.buildingId === selectedBuilding.id ? (
      <ExpandedBuildingCard
        key={selectedBuilding.id}
        building={selectedBuilding}
        floors={expandedBuilding.floors}
        variant="map"
        onSelectFloor={onSelectFloor}
        onViewDetail={onViewDetail}
      />
    ) : (
      <BuildingCard
        building={selectedBuilding}
        onSelect={onViewDetail ?? onSelectBuilding}
      />
    )
  ) : null;

  return (
    <section
      aria-label="แผนที่มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี"
      className={
        isFullscreen
          ? fullscreenLayout === "contained"
            ? "relative min-h-[260px] min-w-0 flex-1 overflow-hidden bg-white"
            : "fixed inset-0 z-40 mx-auto flex w-full max-w-[476px] flex-col overflow-hidden bg-white"
          : "relative min-h-[260px] min-w-0 flex-1 overflow-hidden rounded-[28px] border border-[#e5e7eb] bg-white"
      }
    >
      <div
        ref={viewportRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleBackgroundClick}
        className="absolute inset-0 touch-none select-none overflow-hidden cursor-grab active:cursor-grabbing"
      >
        <div
          style={{
            width: CAMPUS_MAP_VIEWBOX.width,
            height: CAMPUS_MAP_VIEWBOX.height,
            transform: `translate3d(${clampedTransform.panX}px, ${clampedTransform.panY}px, 0) scale(${totalScale})`,
            transformOrigin: "0 0",
          }}
          onTransitionEnd={() => setIsFocusAnimating(false)}
          className={`absolute top-0 left-0 will-change-transform ${
            isFocusAnimating ? "transition-transform duration-300 ease-out" : ""
          }`}
        >
          {mapImageSrc && !imageFailed ? (
            <Image
              src={mapImageSrc}
              alt="แผนผังอาคารภายใน มจธ."
              width={CAMPUS_MAP_VIEWBOX.width}
              height={CAMPUS_MAP_VIEWBOX.height}
              unoptimized
              draggable={false}
              onLoad={() => setImageFailed(false)}
              onError={() => setImageFailed(true)}
              className="pointer-events-none block h-full w-full object-fill select-none"
            />
          ) : null}

          <svg
            viewBox={`0 0 ${CAMPUS_MAP_VIEWBOX.width} ${CAMPUS_MAP_VIEWBOX.height}`}
            className="absolute inset-0 h-full w-full"
            role="img"
            aria-label="เลเยอร์อาคารที่โต้ตอบได้บนแผนที่ มจธ."
          >
            <g>
              {BUILDING_CODES.map((code) => {
                const shape = CAMPUS_BUILDING_SHAPES[code];
                const state = renderStates.get(code);

                if (!state || !state.isInteractive) {
                  return (
                    <path
                      key={code}
                      d={shape.path}
                      fill={
                        showFallbackPlaceholder
                          ? "rgba(148, 163, 184, 0.25)"
                          : "transparent"
                      }
                      stroke={
                        showFallbackPlaceholder
                          ? "rgba(71, 85, 105, 0.45)"
                          : "none"
                      }
                      strokeWidth={showFallbackPlaceholder ? 4 : 0}
                      className="pointer-events-none"
                      aria-hidden="true"
                    />
                  );
                }

                return (
                  <g
                    key={code}
                    role="button"
                    tabIndex={0}
                    aria-label={state.ariaLabel}
                    aria-pressed={state.isSelected}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleBuildingActivate(state.id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        event.stopPropagation();
                        handleBuildingActivate(state.id);
                      }
                    }}
                    className="group cursor-pointer focus:outline-none"
                  >
                    {state.strokeKind === "search-nearby" ? (
                      <path
                        d={shape.path}
                        fill="none"
                        fillRule="evenodd"
                        stroke="#ff5815"
                        strokeOpacity={0.38}
                        strokeWidth={34}
                        strokeLinejoin="round"
                      />
                    ) : null}

                    {state.strokeKind === "selected" ? (
                      <path
                        d={shape.path}
                        fill="none"
                        fillRule="evenodd"
                        stroke="#ffffff"
                        strokeOpacity={0.95}
                        strokeWidth={28}
                        strokeLinejoin="round"
                      />
                    ) : null}

                    <path
                      d={shape.path}
                      fill={state.fill}
                      fillOpacity={state.fillOpacity}
                      fillRule="evenodd"
                      stroke={state.stroke}
                      strokeWidth={state.strokeWidth}
                      strokeLinejoin="round"
                      className="transition-[fill,fill-opacity,stroke,stroke-width] duration-150"
                    />

                    <path
                      d={shape.path}
                      fill="none"
                      fillRule="evenodd"
                      stroke="#081828"
                      strokeWidth={24}
                      strokeDasharray="24 14"
                      strokeLinejoin="round"
                      className="pointer-events-none opacity-0 group-focus-visible:opacity-100"
                    />
                  </g>
                );
              })}
            </g>

            <g className="pointer-events-none select-none" aria-hidden="true">
              {BUILDING_CODES.map((code) => {
                const shape = CAMPUS_BUILDING_SHAPES[code];
                const state = renderStates.get(code);
                if (
                  !state &&
                  buildings.length > 0 &&
                  !showFallbackPlaceholder
                ) {
                  return null;
                }

                return (
                  <text
                    key={`${code}-label`}
                    x={shape.labelX}
                    y={shape.labelY}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#ffffff"
                    fillOpacity={state?.labelOpacity ?? 0.92}
                    fontSize={44}
                    fontWeight={800}
                    letterSpacing="-0.5"
                    style={{
                      paintOrder: "stroke",
                      stroke: "rgba(17, 24, 39, 0.9)",
                      strokeWidth: 11,
                      strokeLinejoin: "round",
                    }}
                  >
                    {code}
                  </text>
                );
              })}
            </g>
          </svg>
        </div>
      </div>

      <div
        className={`pointer-events-none absolute inset-x-3 z-20 flex flex-col gap-2.5 ${
          isFullscreen
            ? "top-[max(1rem,env(safe-area-inset-top,0px))]"
            : "top-3"
        }`}
      >
        {topSlot ? <div className="pointer-events-auto">{topSlot}</div> : null}
        <div className="pointer-events-auto">
          <CrowdLevelFilter
            selected={activeFilter}
            onChange={handleFilterChange}
          />
        </div>
      </div>

      {isLoading ? (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none absolute inset-x-4 top-20 z-10 flex justify-center"
        >
          <span className="rounded-full bg-white/95 px-4 py-1.5 text-xs font-medium text-[#081828] shadow-sm">
            กำลังโหลดข้อมูลแผนที่...
          </span>
        </div>
      ) : null}

      {errorMessage ? (
        <div
          role="alert"
          className="absolute inset-x-4 top-20 z-20 mx-auto flex max-w-[420px] flex-col items-center gap-2 rounded-2xl border border-[#fecaca] bg-[#fff5f5]/95 px-4 py-3 text-center text-xs font-medium text-[#b91c1c] shadow-sm"
        >
          <p>{errorMessage}</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className="min-h-11 min-w-11 cursor-pointer rounded-full border border-[#fca5a5] bg-white px-3.5 text-xs font-semibold text-[#b91c1c] transition-colors hover:bg-[#fef2f2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff5815]"
              >
                ลองใหม่
              </button>
            ) : null}
            <Link
              href="/locations"
              className="inline-flex min-h-11 min-w-11 items-center rounded-full bg-[#ff5815] px-3.5 text-xs font-semibold text-white transition-colors hover:bg-[#e54e10] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff5815]"
            >
              ดูรายชื่อสถานที่ทั้งหมด
            </Link>
          </div>
        </div>
      ) : null}

      {!isLoading && !errorMessage && warningMessage ? (
        <div
          role="status"
          className="absolute inset-x-4 top-20 z-20 mx-auto flex max-w-[420px] items-center justify-between gap-2 rounded-2xl border border-[#fed7aa] bg-[#fff7ed]/95 px-3.5 py-2 text-xs font-medium text-[#9a3412] shadow-sm"
        >
          <span className="min-w-0 flex-1">{warningMessage}</span>
          <div className="flex shrink-0 items-center gap-1.5">
            {onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className="min-h-11 min-w-11 cursor-pointer rounded-full border border-[#fdba74] bg-white px-2.5 text-[11px] font-semibold text-[#9a3412] transition-colors hover:bg-[#ffedd5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff5815]"
              >
                ลองใหม่
              </button>
            ) : null}
            <Link
              href="/locations"
              className="inline-flex min-h-11 min-w-11 items-center rounded-full bg-[#ff5815] px-2.5 text-[11px] font-semibold text-white transition-colors hover:bg-[#e54e10] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff5815]"
            >
              รายการสถานที่
            </Link>
          </div>
        </div>
      ) : null}

      {!isLoading && !errorMessage && showFallbackPlaceholder ? (
        <div className="pointer-events-none absolute inset-x-4 bottom-16 z-10 flex justify-center">
          <span className="rounded-full bg-white/90 px-3.5 py-1.5 text-xs font-medium text-[#475569] shadow-sm">
            ไม่สามารถโหลดภาพแผนที่ได้ แสดงโครงร่างอาคารแทน
          </span>
        </div>
      ) : null}

      {!isLoading &&
      !errorMessage &&
      !showFallbackPlaceholder &&
      emptyMessage ? (
        <div className="pointer-events-none absolute inset-x-4 bottom-16 z-10 flex justify-center">
          <span className="rounded-full bg-white/90 px-3.5 py-1.5 text-xs font-medium text-[#475569] shadow-sm">
            {emptyMessage}
          </span>
        </div>
      ) : null}

      <div
        className={`pointer-events-none absolute inset-x-3 z-20 flex flex-col gap-2.5 ${
          isFullscreen && fullscreenLayout === "fixed"
            ? "bottom-[max(1rem,env(safe-area-inset-bottom,0px))]"
            : "bottom-3"
        }`}
      >
        <div className="flex items-end justify-end gap-2">
          <div
            role="group"
            aria-label="ควบคุมการซูมแผนที่"
            className="pointer-events-auto flex items-center overflow-hidden rounded-2xl bg-white/95 text-[#081828] shadow-[0_2px_10px_rgba(0,0,0,0.14)] backdrop-blur-xs"
          >
            {clampedTransform.zoom > 1.05 ? (
              <button
                type="button"
                onClick={resetView}
                aria-label="รีเซ็ตมุมมองแผนที่"
                className="flex h-9 w-9 items-center justify-center border-r border-[#e5e7eb] transition-colors hover:bg-[#f3f4f6] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#ff5815]"
              >
                <RestartAltRounded fontSize="small" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => stepZoom(-ZOOM_STEP)}
              disabled={clampedTransform.zoom <= MAP_MIN_ZOOM}
              aria-label="ซูมออก"
              className="flex h-9 w-9 items-center justify-center border-r border-[#e5e7eb] transition-colors hover:bg-[#f3f4f6] disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#ff5815]"
            >
              <RemoveRounded fontSize="small" />
            </button>
            <button
              type="button"
              onClick={() => stepZoom(ZOOM_STEP)}
              disabled={clampedTransform.zoom >= MAP_MAX_ZOOM}
              aria-label="ซูมเข้า"
              className="flex h-9 w-9 items-center justify-center transition-colors hover:bg-[#f3f4f6] disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#ff5815]"
            >
              <AddRounded fontSize="small" />
            </button>
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "ย่อขนาดแผนที่" : "ขยายแผนที่เต็มจอ"}
            aria-pressed={isFullscreen}
            className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-white/95 text-[#081828] shadow-[0_2px_10px_rgba(0,0,0,0.16)] backdrop-blur-xs transition-transform active:scale-95 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff5815]"
          >
            {isFullscreen ? (
              <CloseFullscreenRounded fontSize="small" />
            ) : (
              <OpenInFullRounded fontSize="small" />
            )}
          </button>
        </div>

        {selectedCardContent ? (
          <div className="pointer-events-auto">{selectedCardContent}</div>
        ) : null}
      </div>
    </section>
  );
}
