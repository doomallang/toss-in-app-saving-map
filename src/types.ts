import type { StoreCategory } from "./data/stores";

export type CategoryFilter = "all" | StoreCategory | "onnuri";
export type Tab = "home" | "map" | "saved" | "my";
export type SortOption = "distance" | "name";
export type PriceFilter = "all" | "under10k";
export type RadiusFilter = "all" | "500m" | "1km" | "2km" | "5km";

export const RADIUS_OPTIONS: Array<{
  id: RadiusFilter;
  label: string;
  meters: number | null;
}> = [
  { id: "all", label: "전체", meters: null },
  { id: "500m", label: "500m", meters: 500 },
  { id: "1km", label: "1km", meters: 1000 },
  { id: "2km", label: "2km", meters: 2000 },
  { id: "5km", label: "5km", meters: 5000 },
];

export const REGION_ALL = "전국";
