import type { Tables } from "../../../types/database";
import { buildingAvailability, floorAvailability } from "./hours.ts";
import type { FloorHours } from "./hours.ts";

export type CatalogFloor = Pick<Tables<"floors">, "id" | "location_id" | "floor_name" | "capacity"> & {
  floor_hours: FloorHours[];
};
export type CatalogBuilding = Pick<Tables<"locations">,
  "id" | "building" | "name" | "category" | "aliases" | "image_url" | "details"
> & { floors: CatalogFloor[] };

export function floorDto(floor: CatalogFloor, now: Date) {
  return {
    id: floor.id,
    location_id: floor.location_id,
    floor_name: floor.floor_name,
    capacity: floor.capacity,
    hours: [...floor.floor_hours].sort((a, b) => a.day_of_week - b.day_of_week),
    availability: floorAvailability(floor.floor_hours, now),
  };
}

export function buildingDto(building: CatalogBuilding, now: Date, includeFloors = false) {
  const floors = [...building.floors]
    .sort((a, b) => a.floor_name.localeCompare(b.floor_name, "en", { numeric: true }) || a.id - b.id)
    .map((floor) => floorDto(floor, now));
  return {
    id: building.id,
    building: building.building,
    name: building.name,
    category: building.category,
    aliases: building.aliases,
    image_url: building.image_url,
    details: building.details,
    floor_count: floors.length,
    availability: buildingAvailability(floors.map((floor) => floor.availability)),
    ...(includeFloors ? { floors } : {}),
  };
}
