import type { CrowdLevel } from "@/features/locations/components/location-view-models";

export type CrowdFilterValue = "all" | CrowdLevel;

export type BuildingVisualVariant =
  "inactive" | "low" | "medium" | "high" | "unknown";

export type BuildingStrokeKind =
  "none" | "default" | "selected" | "search-nearby";

export interface CampusBuildingMarker {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly crowdLevel: CrowdLevel | null;
  readonly isActive?: boolean;
}

export interface ComputeBuildingStateOptions {
  readonly selectedBuildingId?: string | null;
  readonly highlightedBuildingIds?: readonly string[];
  readonly crowdFilter?: CrowdFilterValue;
}

export interface MapBuildingRenderState {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly variant: BuildingVisualVariant;
  readonly isInteractive: boolean;
  readonly isSelected: boolean;
  readonly isSearchMatch: boolean;
  readonly isFilterMatch: boolean;
  readonly showHighlight: boolean;
  readonly isDimmed: boolean;
  readonly strokeKind: BuildingStrokeKind;
  readonly fill: string;
  readonly fillOpacity: number;
  readonly stroke: string;
  readonly strokeWidth: number;
  readonly labelOpacity: number;
  readonly ariaLabel: string;
}

export interface MapTransform {
  readonly zoom: number;
  readonly panX: number;
  readonly panY: number;
}

export const MAP_MIN_ZOOM = 1;
export const MAP_MAX_ZOOM = 4;

const VARIANT_FILL: Record<BuildingVisualVariant, string> = {
  inactive: "transparent",
  low: "#0daf2b",
  medium: "#dfdf20",
  high: "#ff0000",
  unknown: "#b8bec8",
};

const VARIANT_STATUS_LABEL: Record<BuildingVisualVariant, string> = {
  inactive: "ปิดใช้งาน",
  low: "คนน้อย",
  medium: "ปานกลาง",
  high: "คนหนาแน่น",
  unknown: "ยังไม่มีข้อมูล",
};

export function computeBuildingRenderState(
  marker: CampusBuildingMarker,
  options: ComputeBuildingStateOptions = {},
): MapBuildingRenderState {
  const {
    selectedBuildingId = null,
    highlightedBuildingIds = [],
    crowdFilter = "all",
  } = options;

  const isActive = marker.isActive !== false;
  if (!isActive) {
    return {
      id: marker.id,
      code: marker.code,
      name: marker.name,
      variant: "inactive",
      isInteractive: false,
      isSelected: false,
      isSearchMatch: false,
      isFilterMatch: false,
      showHighlight: false,
      isDimmed: false,
      strokeKind: "none",
      fill: "transparent",
      fillOpacity: 0,
      stroke: "none",
      strokeWidth: 0,
      labelOpacity: 0.45,
      ariaLabel: `${marker.code} ${marker.name} (${VARIANT_STATUS_LABEL.inactive})`,
    };
  }

  const variant: BuildingVisualVariant = marker.crowdLevel ?? "unknown";
  const isSelected = selectedBuildingId === marker.id;
  const hasSearchHighlight = highlightedBuildingIds.length > 0;
  const isSearchMatch = highlightedBuildingIds.includes(marker.id);
  const isFilterMatch =
    crowdFilter === "all" || marker.crowdLevel === crowdFilter;

  const statusText = VARIANT_STATUS_LABEL[variant];
  const ariaLabel = `${marker.code} ${marker.name} (${statusText})`;

  if (!isSelected && crowdFilter !== "all" && !isFilterMatch) {
    return {
      id: marker.id,
      code: marker.code,
      name: marker.name,
      variant,
      isInteractive: true,
      isSelected: false,
      isSearchMatch,
      isFilterMatch: false,
      showHighlight: false,
      isDimmed: true,
      strokeKind: "none",
      fill: "transparent",
      fillOpacity: 0,
      stroke: "none",
      strokeWidth: 0,
      labelOpacity: 0.55,
      ariaLabel,
    };
  }

  if (!isSelected && hasSearchHighlight && !isSearchMatch) {
    return {
      id: marker.id,
      code: marker.code,
      name: marker.name,
      variant,
      isInteractive: true,
      isSelected: false,
      isSearchMatch: false,
      isFilterMatch,
      showHighlight: false,
      isDimmed: true,
      strokeKind: "none",
      fill: "#1f2937",
      fillOpacity: 0.22,
      stroke: "none",
      strokeWidth: 0,
      labelOpacity: 0.6,
      ariaLabel,
    };
  }

  let strokeKind: BuildingStrokeKind = "default";
  let stroke = "rgba(17, 24, 39, 0.78)";
  let strokeWidth = 7;

  if (isSelected) {
    strokeKind = "selected";
    stroke = "#081828";
    strokeWidth = 16;
  } else if (isSearchMatch) {
    strokeKind = "search-nearby";
    stroke = "#ff5815";
    strokeWidth = 18;
  }

  return {
    id: marker.id,
    code: marker.code,
    name: marker.name,
    variant,
    isInteractive: true,
    isSelected,
    isSearchMatch,
    isFilterMatch,
    showHighlight: true,
    isDimmed: false,
    strokeKind,
    fill: VARIANT_FILL[variant],
    fillOpacity: isSelected ? 0.9 : 0.76,
    stroke,
    strokeWidth,
    labelOpacity: 1,
    ariaLabel,
  };
}

export function computeBuildingRenderStates(
  markers: readonly CampusBuildingMarker[],
  options: ComputeBuildingStateOptions = {},
): Map<string, MapBuildingRenderState> {
  const result = new Map<string, MapBuildingRenderState>();
  for (const marker of markers) {
    result.set(
      marker.code.toUpperCase(),
      computeBuildingRenderState(marker, options),
    );
  }
  return result;
}

export function computeBaseScale(
  viewportWidth: number,
  viewportHeight: number,
  mapWidth: number,
  mapHeight: number,
): number {
  if (
    viewportWidth <= 0 ||
    viewportHeight <= 0 ||
    mapWidth <= 0 ||
    mapHeight <= 0
  ) {
    return 1;
  }
  return Math.min(viewportWidth / mapWidth, viewportHeight / mapHeight);
}

export function clampMapTransform(
  transform: MapTransform,
  viewportWidth: number,
  viewportHeight: number,
  mapWidth: number,
  mapHeight: number,
): MapTransform {
  const zoom = Math.min(MAP_MAX_ZOOM, Math.max(MAP_MIN_ZOOM, transform.zoom));
  const baseScale = computeBaseScale(
    viewportWidth,
    viewportHeight,
    mapWidth,
    mapHeight,
  );
  const contentWidth = mapWidth * baseScale * zoom;
  const contentHeight = mapHeight * baseScale * zoom;

  const clampAxis = (
    pan: number,
    contentSize: number,
    viewportSize: number,
  ) => {
    if (viewportSize <= 0) return 0;
    if (contentSize <= viewportSize) {
      return (viewportSize - contentSize) / 2;
    }
    const minPan = viewportSize - contentSize;
    return Math.min(0, Math.max(minPan, pan));
  };

  return {
    zoom,
    panX: clampAxis(transform.panX, contentWidth, viewportWidth),
    panY: clampAxis(transform.panY, contentHeight, viewportHeight),
  };
}

export function zoomAroundPoint(
  current: MapTransform,
  nextZoom: number,
  anchorX: number,
  anchorY: number,
  viewportWidth: number,
  viewportHeight: number,
  mapWidth: number,
  mapHeight: number,
): MapTransform {
  const clampedZoom = Math.min(MAP_MAX_ZOOM, Math.max(MAP_MIN_ZOOM, nextZoom));
  const ratio = clampedZoom / current.zoom;
  const nextPanX = anchorX - (anchorX - current.panX) * ratio;
  const nextPanY = anchorY - (anchorY - current.panY) * ratio;
  return clampMapTransform(
    { zoom: clampedZoom, panX: nextPanX, panY: nextPanY },
    viewportWidth,
    viewportHeight,
    mapWidth,
    mapHeight,
  );
}
