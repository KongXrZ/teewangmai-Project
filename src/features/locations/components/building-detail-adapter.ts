import {
  mergeBuildingFloors,
  type ApiCrowdFloor,
  type ApiLocationFloor,
} from "../../campus-map/map-api-adapter.ts";
import {
  buildWeeklyScheduleItems,
  toAvailabilityModel,
  toOpeningHours,
  type ApiAvailabilityDto,
  type ApiWeeklyHourDto,
} from "../api/availability-display.ts";
import type {
  BuildingDetailModel,
  FloorDetailItem,
  FloorId,
  FloorModel,
} from "./location-view-models";

export interface ApiLocationDetailFloor extends ApiLocationFloor {
  readonly capacity: number | null;
  readonly hours?: readonly ApiWeeklyHourDto[];
}

export interface ApiLocationDetailBuilding {
  readonly id: number;
  readonly building: string;
  readonly name: string;
  readonly category?: readonly string[];
  readonly aliases?: readonly string[];
  readonly image_url: string | null;
  readonly details?: Record<string, unknown> | null;
  readonly availability?: ApiAvailabilityDto;
  readonly floors: readonly ApiLocationDetailFloor[];
}

export interface ApiCrowdDetailResponse {
  readonly default_floor_id?: number | null;
  readonly floors?: readonly ApiCrowdFloor[];
}

export type BuildingDetailLoadOutcome =
  | { kind: "ok"; building: BuildingDetailModel; defaultFloorId?: FloorId }
  | { kind: "not_found" }
  | { kind: "error" };

export type FloorDetailLoadOutcome =
  | {
      kind: "ok";
      floor: ApiLocationDetailFloor;
      crowdFloor?: ApiCrowdFloor;
      crowdFailed: boolean;
    }
  | { kind: "not_found" }
  | { kind: "error" };

const MAX_PG_INT = 2147483647;

export function parseBuildingIdParam(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value)) {
    return null;
  }
  const id = Number(value);
  return Number.isSafeInteger(id) && id <= MAX_PG_INT ? id : null;
}

class HttpStatusError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

async function fetchApiJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal, cache: "no-store" });
  let body: { success?: boolean; data?: T } | null = null;
  try {
    body = await response.json();
  } catch {
    throw new HttpStatusError(`Invalid response from ${url}`, response.status);
  }
  if (!response.ok || body?.success !== true || body.data === undefined) {
    throw new HttpStatusError(
      `Request failed (${response.status})`,
      response.status,
    );
  }
  return body.data;
}

function extractBuildingDetails(
  details?: Record<string, unknown> | null,
): { description: string | null; metadataDetails: FloorDetailItem[] } {
  if (!details || typeof details !== "object") {
    return { description: null, metadataDetails: [] };
  }
  const rawDescription =
    typeof details.description === "string" ? details.description.trim() : "";
  const description = rawDescription !== "" ? rawDescription : null;
  const metadataDetails: FloorDetailItem[] = [];
  for (const [key, value] of Object.entries(details)) {
    if (key === "description" || value === null || value === undefined) {
      continue;
    }
    if (typeof value === "string" || typeof value === "number") {
      const text = String(value).trim();
      if (text !== "") {
        metadataDetails.push({ label: key, value: text });
      }
    } else if (typeof value === "boolean") {
      metadataDetails.push({ label: key, value: value ? "มี" : "ไม่มี" });
    }
  }
  return { description, metadataDetails };
}

function enrichFloorDetails(
  baseFloor: FloorModel,
  apiFloor: ApiLocationDetailFloor,
): FloorModel {
  const scheduleItems = buildWeeklyScheduleItems(apiFloor.hours);
  const details: FloorDetailItem[] = [...baseFloor.details, ...scheduleItems];
  return {
    ...baseFloor,
    details,
  };
}

export function toBuildingDetailModel(
  locationData: ApiLocationDetailBuilding,
  crowdData?: ApiCrowdDetailResponse | null,
  crowdFailed = false,
): { building: BuildingDetailModel; defaultFloorId?: FloorId } {
  const baseFloors = mergeBuildingFloors(
    locationData.floors,
    crowdData?.floors,
    crowdFailed,
  );
  const floors = baseFloors.map((floor, index) =>
    enrichFloorDetails(floor, locationData.floors[index]),
  );
  const { description, metadataDetails } = extractBuildingDetails(
    locationData.details,
  );
  const defaultFloorId =
    crowdData?.default_floor_id != null
      ? String(crowdData.default_floor_id)
      : undefined;

  return {
    building: {
      id: String(locationData.id),
      code: locationData.building,
      name: locationData.name,
      imageUrl: locationData.image_url,
      floors,
      availability: toAvailabilityModel(locationData.availability),
      categories: locationData.category ? [...locationData.category] : [],
      aliases: locationData.aliases ? [...locationData.aliases] : [],
      description,
      metadataDetails,
    },
    defaultFloorId,
  };
}

export function mergeSingleFloorDetail(
  building: BuildingDetailModel,
  apiFloor: ApiLocationDetailFloor,
  crowdFloor: ApiCrowdFloor | undefined,
  crowdFailed: boolean,
): BuildingDetailModel {
  const [merged] = mergeBuildingFloors(
    [apiFloor],
    crowdFloor ? [crowdFloor] : undefined,
    crowdFailed,
  );
  const enriched = enrichFloorDetails(
    {
      ...merged,
      openingHours: toOpeningHours(apiFloor.availability),
    },
    apiFloor,
  );
  const exists = building.floors.some((floor) => floor.id === enriched.id);
  const floors = exists
    ? building.floors.map((floor) =>
        floor.id === enriched.id ? enriched : floor,
      )
    : [...building.floors, enriched];

  return {
    ...building,
    floors,
  };
}

export async function loadBuildingDetail(
  rawBuildingId: string,
  signal?: AbortSignal,
): Promise<BuildingDetailLoadOutcome> {
  const parsedId = parseBuildingIdParam(rawBuildingId);
  if (parsedId === null) {
    return { kind: "not_found" };
  }

  let locationData: ApiLocationDetailBuilding;
  let crowdOutcome:
    | { ok: true; data: ApiCrowdDetailResponse | null }
    | { ok: false };

  try {
    const [locResult, crowdResult] = await Promise.all([
      fetchApiJson<ApiLocationDetailBuilding>(
        `/api/locations/${parsedId}`,
        signal,
      ),
      fetchApiJson<ApiCrowdDetailResponse>(
        `/api/crowd/locations/${parsedId}`,
        signal,
      ).then(
        (data) => ({ ok: true as const, data }),
        (error: unknown) => {
          if (isAbortError(error)) {
            throw error;
          }
          if (error instanceof HttpStatusError && error.status === 404) {
            return { ok: true as const, data: null };
          }
          return { ok: false as const };
        },
      ),
    ]);
    locationData = locResult;
    crowdOutcome = crowdResult;
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    if (
      error instanceof HttpStatusError &&
      (error.status === 404 || error.status === 400)
    ) {
      return { kind: "not_found" };
    }
    return { kind: "error" };
  }

  if (!Array.isArray(locationData.floors)) {
    return { kind: "error" };
  }

  const { building, defaultFloorId } = toBuildingDetailModel(
    locationData,
    crowdOutcome.ok ? crowdOutcome.data : null,
    !crowdOutcome.ok,
  );

  return { kind: "ok", building, defaultFloorId };
}

export async function loadFloorDetail(
  rawBuildingId: string,
  rawFloorId: string,
  signal?: AbortSignal,
): Promise<FloorDetailLoadOutcome> {
  const buildingId = parseBuildingIdParam(rawBuildingId);
  const floorId = parseBuildingIdParam(rawFloorId);
  if (buildingId === null || floorId === null) {
    return { kind: "not_found" };
  }

  try {
    const [floorData, crowdOutcome] = await Promise.all([
      fetchApiJson<ApiLocationDetailFloor>(
        `/api/locations/${buildingId}/floors/${floorId}`,
        signal,
      ),
      fetchApiJson<ApiCrowdFloor>(
        `/api/crowd/locations/${buildingId}/floors/${floorId}`,
        signal,
      ).then(
        (data) => ({ ok: true as const, data }),
        (error: unknown) => {
          if (isAbortError(error)) {
            throw error;
          }
          if (error instanceof HttpStatusError && error.status === 404) {
            return { ok: true as const, data: undefined };
          }
          return { ok: false as const };
        },
      ),
    ]);

    return {
      kind: "ok",
      floor: floorData,
      crowdFloor: crowdOutcome.ok ? crowdOutcome.data : undefined,
      crowdFailed: !crowdOutcome.ok,
    };
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    if (
      error instanceof HttpStatusError &&
      (error.status === 404 || error.status === 400)
    ) {
      return { kind: "not_found" };
    }
    return { kind: "error" };
  }
}
