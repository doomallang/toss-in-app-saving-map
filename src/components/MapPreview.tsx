import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Navigation } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Store } from "../data/stores";
import { inferStoreVisualVariant, StoreVisualVariant } from "../storeVisuals";

type Coordinates = {
  latitude: number;
  longitude: number;
};

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
  const cachedIcon = markerIconCache.get(cacheKey);

  if (cachedIcon) {
    return cachedIcon;
  }

  const icon = L.divIcon({
    className: "",
    html: `<span class="leaflet-store-pin ${variant}${isSelected ? " selected" : ""}"><i></i></span>`,
    iconSize: isSelected ? [34, 34] : [28, 28],
    iconAnchor: isSelected ? [17, 17] : [14, 14],
  });

  markerIconCache.set(cacheKey, icon);
  return icon;
}

function getDistanceLabel(distanceMeters?: number) {
  if (distanceMeters == null) {
    return "지역 기준";
  }

  if (distanceMeters < 1000) {
    return `${distanceMeters}m`;
  }

  return `${(distanceMeters / 1000).toFixed(1)}km`;
}

function getNaverMapUrl(store: Store) {
  return `https://map.naver.com/p/search/${encodeURIComponent(`${store.name} ${store.address}`)}`;
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
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const storeMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const userMarkerRef = useRef<L.Marker | null>(null);
  const prevSelectedStoreIdRef = useRef<string | null>(null);
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);

  const storesWithCoords = stores.filter(
    (store) => store.latitude != null && store.longitude != null,
  );

  const center = useMemo<[number, number]>(() => {
    if (userLocation) {
      return [userLocation.latitude, userLocation.longitude];
    }

    if (selectedStore != null) {
      return [selectedStore.latitude!, selectedStore.longitude!];
    }

    return SEOUL_CENTER;
  }, [selectedStore, userLocation]);
  const initialCenterRef = useRef(center);

  const markersToRender = useMemo(() => {
    const inView = mapBounds
      ? storesWithCoords.filter((store) =>
          mapBounds.contains([store.latitude!, store.longitude!]),
        )
      : storesWithCoords.slice(0, 100);

    const capped = inView.slice(0, 200);

    if (
      selectedStore != null &&
      selectedStore.latitude != null &&
      !capped.find((store) => store.id === selectedStore.id)
    ) {
      capped.push(selectedStore);
    }

    return capped;
  }, [storesWithCoords, mapBounds, selectedStore]);

  useEffect(() => {
    if (mapElRef.current == null || mapRef.current != null) {
      return;
    }

    const map = L.map(mapElRef.current, {
      center: initialCenterRef.current,
      zoom: 14,
      zoomControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    const updateBounds = () => setMapBounds(map.getBounds());
    map.on("moveend zoomend", updateBounds);
    map.whenReady(() => setMapBounds(map.getBounds()));

    const markerLayer = L.layerGroup().addTo(map);
    markerLayerRef.current = markerLayer;
    mapRef.current = map;
    const storeMarkers = storeMarkersRef.current;

    return () => {
      storeMarkers.clear();
      userMarkerRef.current = null;
      markerLayerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const markerLayer = markerLayerRef.current;
    if (markerLayer == null) {
      return;
    }

    if (userLocation) {
      if (userMarkerRef.current == null) {
        userMarkerRef.current = L.marker(
          [userLocation.latitude, userLocation.longitude],
          {
            icon: userMarkerIcon,
          },
        ).addTo(markerLayer);
      } else {
        userMarkerRef.current.setLatLng([
          userLocation.latitude,
          userLocation.longitude,
        ]);
      }
    } else if (userMarkerRef.current != null) {
      markerLayer.removeLayer(userMarkerRef.current);
      userMarkerRef.current = null;
    }
  }, [userLocation]);

  useEffect(() => {
    const markerLayer = markerLayerRef.current;
    if (markerLayer == null) {
      return;
    }

    const nextIds = new Set(markersToRender.map((store) => store.id));

    for (const [storeId, marker] of storeMarkersRef.current.entries()) {
      if (!nextIds.has(storeId)) {
        markerLayer.removeLayer(marker);
        storeMarkersRef.current.delete(storeId);
      }
    }

    markersToRender.forEach((store) => {
      const isSelected = store.id === selectedStore?.id;
      const existingMarker = storeMarkersRef.current.get(store.id);

      if (existingMarker != null) {
        existingMarker.setLatLng([store.latitude!, store.longitude!]);
        existingMarker.setIcon(getStoreMarkerIcon(store, isSelected));
        existingMarker.off("click");
        existingMarker.on("click", () => onSelectStore(store));
        return;
      }

      const marker = L.marker([store.latitude!, store.longitude!], {
        icon: getStoreMarkerIcon(store, isSelected),
      }).addTo(markerLayer);
      marker.on("click", () => onSelectStore(store));
      storeMarkersRef.current.set(store.id, marker);
    });
  }, [markersToRender, onSelectStore, selectedStore]);

  useEffect(() => {
    const map = mapRef.current;
    if (map == null || selectedStoreId == null) {
      return;
    }

    if (selectedStoreId === prevSelectedStoreIdRef.current) {
      return;
    }

    prevSelectedStoreIdRef.current = selectedStoreId;

    if (selectedStore?.latitude != null) {
      map.setView(
        [selectedStore.latitude, selectedStore.longitude!],
        map.getZoom(),
        { animate: true },
      );
    }
  }, [selectedStore, selectedStoreId]);

  useEffect(() => {
    const map = mapRef.current;
    if (hidden || map == null) {
      return;
    }

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
          <a
            className="round-action"
            href={getNaverMapUrl(selectedStore)}
            target="_blank"
            rel="noreferrer"
            aria-label="길찾기"
          >
            <Navigation size={19} />
          </a>
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
