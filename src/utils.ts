import { openURL } from "@apps-in-toss/web-bridge";

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

// AIT openURL → React Native Linking.openURL → 앱 스킴 / 웹 URL 모두 처리
export function openNaverMap(store: Store): void {
  const url =
    store.latitude != null && store.longitude != null
      ? `nmap://place?lat=${store.latitude}&lng=${store.longitude}&name=${encodeURIComponent(store.name)}&appname=im.toss.app`
      : `https://map.naver.com/p/search/${encodeURIComponent(`${store.name} ${store.address}`)}`;

  openURL(url);
}

export type DataFreshnessLevel = "fresh" | "normal" | "stale" | "old";

export function getDataFreshness(generatedAt: string): {
  days: number;
  level: DataFreshnessLevel;
  label: string;
} {
  const ms = Date.now() - new Date(generatedAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) {
    return { days: 0, level: "normal", label: "날짜 확인 불가" };
  }
  const days = Math.floor(ms / 86_400_000);

  if (days < 7)  return { days, level: "fresh",  label: days < 1 ? "오늘 업데이트" : `${days}일 전 업데이트` };
  if (days < 30) return { days, level: "normal", label: `${days}일 전 업데이트` };
  if (days < 90) return { days, level: "stale",  label: `${days}일 전 업데이트` };
  return           { days, level: "old",    label: `${days}일 전 업데이트` };
}

export function openKakaoMap(store: Store): void {
  const url =
    store.latitude != null && store.longitude != null
      ? `kakaomap://look?p=${store.latitude},${store.longitude}`
      : `https://map.kakao.com/link/search/${encodeURIComponent(`${store.name} ${store.address}`)}`;

  openURL(url);
}
