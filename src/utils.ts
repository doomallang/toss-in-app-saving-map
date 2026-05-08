import { openURL } from "@apps-in-toss/native-modules";

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

export function openKakaoMap(store: Store): void {
  const url =
    store.latitude != null && store.longitude != null
      ? `kakaomap://look?p=${store.latitude},${store.longitude}`
      : `https://map.kakao.com/link/search/${encodeURIComponent(`${store.name} ${store.address}`)}`;

  openURL(url);
}
