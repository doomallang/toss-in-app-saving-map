import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import { Map as MapIcon, Navigation } from "lucide-react";
import { useEffect, useRef } from "react";

import { Store } from "../data/stores";
import { inferStoreVisualVariant, StoreVisualVariant } from "../storeVisuals";
import { Coordinates, getDistanceLabel, openKakaoMap, openNaverMap } from "../utils";

const markerIconCache = new Map<string, L.DivIcon>();

const userMarkerIcon = L.divIcon({
  className: "",
  html: `<span class="leaflet-user-pin"></span>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const SEOUL_CENTER: [number, number] = [37.5665, 126.978];

function getStoreMarkerIcon(store: Store, isSelected: boolean) {
  const variant: StoreVisualVariant = inferStoreVisualVariant(store);
  const cacheKey = `${variant}-${isSelected ? "selected" : "default"}`;
  const cached = markerIconCache.get(cacheKey);
  if (cached) return cached;

  const icon = L.divIcon({
    className: "",
    html: `<span class="leaflet-store-pin ${variant}${isSelected ? " selected" : ""}"><i></i></span>`,
    iconSize: isSelected ? [34, 34] : [28, 28],
    iconAnchor: isSelected ? [17, 17] : [14, 14],
  });

  markerIconCache.set(cacheKey, icon);
  return icon;
}

export default function MapPreview({
  hidden,
  selectedStore,
  selectedStoreId,
  stores,
  userLocation,
  onSelectStore,
}: {
  hidden: boolean;
  selectedStore: Store | null;
  selectedStoreId: string | null;
  stores: Store[];
  userLocation: Coordinates | null;
  onSelectStore: (store: Store) => void;
}) {
  const mapElRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const userLayerRef = useRef<L.LayerGroup | null>(null);
  const storeMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const userMarkerRef = useRef<L.Marker | null>(null);
  const prevSelectedStoreIdRef = useRef<string | null>(null);
  const onSelectStoreRef = useRef(onSelectStore);
  onSelectStoreRef.current = onSelectStore;

  // Map init
  useEffect(() => {
    if (mapElRef.current == null || mapRef.current != null) return;

    const initialCenter: [number, number] = userLocation
      ? [userLocation.latitude, userLocation.longitude]
      : SEOUL_CENTER;

    const map = L.map(mapElRef.current, {
      center: initialCenter,
      zoom: 14,
      zoomControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    const clusterGroup = L.markerClusterGroup({
      maxClusterRadius: 48,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction(cluster) {
        const count = cluster.getChildCount();
        const size = count < 10 ? "sm" : count < 50 ? "md" : "lg";
        return L.divIcon({
          html: `<span class="cluster-pin ${size}">${count}</span>`,
          className: "",
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });
      },
    });
    clusterGroup.addTo(map);

    const userLayer = L.layerGroup().addTo(map);

    clusterGroupRef.current = clusterGroup;
    userLayerRef.current = userLayer;
    mapRef.current = map;
    const storeMarkers = storeMarkersRef.current;

    return () => {
      storeMarkers.clear();
      userMarkerRef.current = null;
      clusterGroupRef.current = null;
      userLayerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 전체 마커 동기화 — hidden일 때 건너뛰고, 탭이 열릴 때 한 번에 반영
  useEffect(() => {
    const clusterGroup = clusterGroupRef.current;
    if (clusterGroup == null || hidden) return;

    const storesWithCoords = stores.filter(
      (s) => s.latitude != null && s.longitude != null,
    );
    const nextIds = new Set(storesWithCoords.map((s) => s.id));
    const existingMarkers = storeMarkersRef.current;

    // 사라진 마커 제거
    for (const [id, marker] of existingMarkers.entries()) {
      if (!nextIds.has(id)) {
        clusterGroup.removeLayer(marker);
        existingMarkers.delete(id);
      }
    }

    // 새 마커 추가, 기존 마커 아이콘 갱신
    const toAdd: L.Marker[] = [];
    for (const store of storesWithCoords) {
      const isSelected = store.id === selectedStoreId;
      const existing = existingMarkers.get(store.id);

      if (existing != null) {
        existing.setIcon(getStoreMarkerIcon(store, isSelected));
        continue;
      }

      const marker = L.marker([store.latitude!, store.longitude!], {
        icon: getStoreMarkerIcon(store, isSelected),
      });
      marker.on("click", () => onSelectStoreRef.current(store));
      existingMarkers.set(store.id, marker);
      toAdd.push(marker);
    }

    if (toAdd.length > 0) {
      clusterGroup.addLayers(toAdd);
    }
  }, [stores, selectedStoreId, hidden]);

  // 내 위치 마커
  useEffect(() => {
    const userLayer = userLayerRef.current;
    if (userLayer == null) return;

    if (userLocation) {
      if (userMarkerRef.current == null) {
        userMarkerRef.current = L.marker(
          [userLocation.latitude, userLocation.longitude],
          { icon: userMarkerIcon },
        ).addTo(userLayer);
      } else {
        userMarkerRef.current.setLatLng([
          userLocation.latitude,
          userLocation.longitude,
        ]);
      }
    } else if (userMarkerRef.current != null) {
      userLayer.removeLayer(userMarkerRef.current);
      userMarkerRef.current = null;
    }
  }, [userLocation]);

  // 선택 가게로 지도 이동 + 클러스터 펼치기 — hidden 해제 시에도 실행
  useEffect(() => {
    const map = mapRef.current;
    const clusterGroup = clusterGroupRef.current;
    if (map == null || clusterGroup == null || hidden) return;
    if (selectedStoreId == null) return;

    // hidden에서 복귀하거나 새 가게가 선택될 때만 이동
    if (
      selectedStoreId === prevSelectedStoreIdRef.current &&
      prevSelectedStoreIdRef.current != null
    ) {
      return;
    }

    prevSelectedStoreIdRef.current = selectedStoreId;

    if (selectedStore?.latitude == null) return;

    const marker = storeMarkersRef.current.get(selectedStoreId);
    if (marker) {
      clusterGroup.zoomToShowLayer(marker, () => {
        map.setView(
          [selectedStore.latitude!, selectedStore.longitude!],
          Math.max(map.getZoom(), 15),
          { animate: true },
        );
      });
    } else {
      map.setView(
        [selectedStore.latitude, selectedStore.longitude!],
        Math.max(map.getZoom(), 15),
        { animate: true },
      );
    }
  }, [selectedStore, selectedStoreId, hidden]);

  // 탭 전환 시 지도 크기 재계산
  useEffect(() => {
    const map = mapRef.current;
    if (hidden || map == null) return;

    map.invalidateSize();

    if (userLocation) {
      map.setView([userLocation.latitude, userLocation.longitude], 14, {
        animate: true,
      });
    }
  }, [hidden, userLocation]);

  return (
    <section
      className="map-preview"
      aria-label="지도"
      style={{ display: hidden ? "none" : undefined }}
    >
      <div ref={mapElRef} className="map-canvas" />

      {selectedStore != null ? (
        <div className="selected-place">
          <button
            className="selected-place-info"
            type="button"
            onClick={() => onSelectStore(selectedStore)}
          >
            <strong>{selectedStore.name}</strong>
            <span>
              {selectedStore.benefitTitle} ·{" "}
              {getDistanceLabel(selectedStore.distanceMeters)}
            </span>
            <span className="selected-place-hint">탭해서 상세 보기</span>
          </button>
          <div className="map-actions">
            <button
              className="round-action"
              type="button"
              aria-label="네이버 지도"
              onClick={() => openNaverMap(selectedStore)}
            >
              <Navigation size={19} />
            </button>
            <button
              className="round-action kakao"
              type="button"
              aria-label="카카오맵"
              onClick={() => openKakaoMap(selectedStore)}
            >
              <MapIcon size={19} />
            </button>
          </div>
        </div>
      ) : (
        <div className="selected-place empty">
          <div className="selected-place-info">
            <strong>지도에 표시할 좌표가 부족해요</strong>
            <span>
              현재 조건에서는 목록으로 먼저 확인하는 편이 더 정확해요.
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
