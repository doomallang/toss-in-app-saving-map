import type { Store } from "./data/stores";

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export function getDistanceLabel(distanceMeters?: number): string {
  if (distanceMeters == null) {
    return "지역 기준";
  }

  if (distanceMeters < 1000) {
    return `${distanceMeters}m`;
  }

  return `${(distanceMeters / 1000).toFixed(1)}km`;
}

export function getNaverMapUrl(store: Store): string {
  return `https://map.naver.com/p/search/${encodeURIComponent(`${store.name} ${store.address}`)}`;
}

export function getKakaoMapUrl(store: Store): string {
  if (store.latitude != null && store.longitude != null) {
    return `https://map.kakao.com/link/to/${encodeURIComponent(store.name)},${store.latitude},${store.longitude}`;
  }
  return `https://map.kakao.com/link/search/${encodeURIComponent(`${store.name} ${store.address}`)}`;
}
