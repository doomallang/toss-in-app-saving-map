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

// 딥링크 시도 → 앱 미설치 시 웹 폴백
export function openNaverMap(store: Store): void {
  const appUrl =
    store.latitude != null && store.longitude != null
      ? `nmap://place?lat=${store.latitude}&lng=${store.longitude}&name=${encodeURIComponent(store.name)}&appname=im.toss.app`
      : `nmap://search?query=${encodeURIComponent(`${store.name} ${store.address}`)}&appname=im.toss.app`;

  const webUrl = `https://map.naver.com/p/search/${encodeURIComponent(`${store.name} ${store.address}`)}`;

  const start = Date.now();
  window.location.href = appUrl;

  setTimeout(() => {
    if (Date.now() - start < 2000) {
      window.open(webUrl, "_blank", "noopener");
    }
  }, 1200);
}

export function openKakaoMap(store: Store): void {
  const appUrl =
    store.latitude != null && store.longitude != null
      ? `kakaomap://look?p=${store.latitude},${store.longitude}`
      : `kakaomap://search?q=${encodeURIComponent(`${store.name} ${store.address}`)}`;

  const webUrl =
    store.latitude != null && store.longitude != null
      ? `https://map.kakao.com/link/to/${encodeURIComponent(store.name)},${store.latitude},${store.longitude}`
      : `https://map.kakao.com/link/search/${encodeURIComponent(`${store.name} ${store.address}`)}`;

  const start = Date.now();
  window.location.href = appUrl;

  setTimeout(() => {
    if (Date.now() - start < 2000) {
      window.open(webUrl, "_blank", "noopener");
    }
  }, 1200);
}
