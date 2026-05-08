import {
  Accuracy,
  Storage,
  getCurrentLocation,
} from "@apps-in-toss/web-framework";
import {
  BookmarkCheck,
  ChevronDown,
  Home,
  LocateFixed,
  Map as MapIcon,
  SlidersHorizontal,
  Sparkles,
  Star,
  UserRound,
  WalletCards,
} from "lucide-react";
import {
  Suspense,
  lazy,
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { SearchField } from "@toss/tds-mobile";
import "./App.css";
import { EmptyResults, EmptySaved } from "./components/EmptyStates";
import FilterSheet from "./components/FilterSheet";
import MapListPanel from "./components/MapListPanel";
import MyPanel from "./components/MyPanel";
import RecentStores from "./components/RecentStores";
import RegionSheet from "./components/RegionSheet";
import { StoreListSkeleton } from "./components/Skeletons";
import StoreCard from "./components/StoreCard";
import StoreDetailSheet from "./components/StoreDetailSheet";
import type { Store } from "./data/stores";
import {
  CategoryFilter,
  PriceFilter,
  RADIUS_OPTIONS,
  REGION_ALL,
  RadiusFilter,
  SortOption,
  Tab,
} from "./types";
import type { Coordinates } from "./utils";

const CATEGORIES: Array<{ id: CategoryFilter; label: string }> = [
  { id: "all", label: "전체" },
  { id: "food", label: "식비" },
  { id: "market", label: "장보기" },
  { id: "life", label: "생활" },
  { id: "mobility", label: "교통" },
  { id: "onnuri", label: "온누리" },
];

const SAVED_KEY = "saving-map.saved-store-ids";
const RECENT_KEY = "saving-map.recent-store-ids";
const RECENT_MAX = 5;
const REGION_ORDER = [
  "서울",
  "경기",
  "인천",
  "부산",
  "대구",
  "광주",
  "대전",
  "울산",
  "세종",
  "강원",
  "충북",
  "충남",
  "전북",
  "전남",
  "경북",
  "경남",
  "제주",
];

type StoreDataResponse = {
  generatedAt: string;
  region: string;
  counts: {
    goodPrice: number;
    onnuri: number;
    total: number;
    geocoded: number;
    geocodeTargets?: number;
  };
  stores: Store[];
};

type DataState = "loading" | "ready" | "error";

const MapPreview = lazy(() => import("./components/MapPreview.tsx"));

function calculateDistanceMeters(from: Coordinates, to: Coordinates) {
  const earthRadiusMeters = 6371000;
  const fromLatitude = (from.latitude * Math.PI) / 180;
  const toLatitude = (to.latitude * Math.PI) / 180;
  const deltaLatitude = ((to.latitude - from.latitude) * Math.PI) / 180;
  const deltaLongitude = ((to.longitude - from.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(deltaLongitude / 2) ** 2;

  return Math.round(
    earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)),
  );
}

function hasCoordinates(store: Store) {
  return store.latitude != null && store.longitude != null;
}

const REGION_ABBREV: Record<string, string> = {
  경상남: "경남",
  경상북: "경북",
  전라남: "전남",
  전라북: "전북",
  충청남: "충남",
  충청북: "충북",
};

function normalizeRegionLabel(value: string) {
  const trimmed = value.trim();

  if (trimmed.length === 0 || trimmed === REGION_ALL) {
    return REGION_ALL;
  }

  const firstToken = trimmed.split(/\s+/)[0] ?? trimmed;
  const shortened = firstToken
    .replace(/특별시|광역시|특별자치시|특별자치도|자치도|도$/, "")
    .trim();

  return REGION_ABBREV[shortened] ?? shortened;
}

function getStoreRegion(store: Store) {
  const regionSource =
    store.sourceMeta?.sido ??
    store.sourceMeta?.regionName ??
    store.address.split(/\s+/)[0] ??
    "";

  return normalizeRegionLabel(regionSource);
}

async function readSavedIds() {
  try {
    const value = await Storage.getItem(SAVED_KEY);
    return value ? (JSON.parse(value) as string[]) : [];
  } catch {
    const value = window.localStorage.getItem(SAVED_KEY);
    return value ? (JSON.parse(value) as string[]) : [];
  }
}

async function readRecentIds() {
  try {
    const value = await Storage.getItem(RECENT_KEY);
    return value ? (JSON.parse(value) as string[]) : [];
  } catch {
    const value = window.localStorage.getItem(RECENT_KEY);
    return value ? (JSON.parse(value) as string[]) : [];
  }
}

async function writeRecentIds(ids: string[]) {
  const value = JSON.stringify(ids);
  try {
    await Storage.setItem(RECENT_KEY, value);
  } catch {
    window.localStorage.setItem(RECENT_KEY, value);
  }
}

async function writeSavedIds(ids: string[]) {
  const value = JSON.stringify(ids);

  try {
    await Storage.setItem(SAVED_KEY, value);
  } catch {
    window.localStorage.setItem(SAVED_KEY, value);
  }
}

function App() {
  const [fullStores, setFullStores] = useState<Store[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const regionCacheRef = useRef(new Map<string, Store[]>());
  const [dataGeneratedAt, setDataGeneratedAt] = useState<string | null>(null);
  const [dataState, setDataState] = useState<DataState>("loading");
  const [dataErrorMessage, setDataErrorMessage] = useState<string | null>(null);
  const [regionLoading, setRegionLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [tab, setTab] = useState<Tab>("home");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [query, setQuery] = useState("");
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [detailStoreId, setDetailStoreId] = useState<string | null>(null);
  const [locationLabel, setLocationLabel] = useState("가까운 순 보기");
  const [isLocating, setIsLocating] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>("distance");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");
  const [radiusFilter, setRadiusFilter] = useState<RadiusFilter>("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isMapListOpen, setIsMapListOpen] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState(REGION_ALL);
  const [isRegionOpen, setIsRegionOpen] = useState(false);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  useEffect(() => {
    readSavedIds().then(setSavedIds);
    readRecentIds().then(setRecentIds);
  }, []);

  useEffect(() => {
    setDataState("loading");
    setDataErrorMessage(null);

    fetch(`${import.meta.env.BASE_URL}data/stores.json`, { cache: "no-cache" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("stores.json을 불러오지 못했어요.");
        }

        return (await response.json()) as StoreDataResponse;
      })
      .then((data) => {
        if (Array.isArray(data.stores) && data.stores.length > 0) {
          setFullStores(data.stores);
          setStores(data.stores);
          setDataGeneratedAt(data.generatedAt);
          setSelectedRegion(normalizeRegionLabel(data.region));
          setDataState("ready");
          return;
        }

        setFullStores([]);
        setStores([]);
        setDataGeneratedAt(data.generatedAt ?? null);
        setSelectedRegion(normalizeRegionLabel(data.region ?? REGION_ALL));
        setDataState("error");
        setDataErrorMessage("표시할 절약처 데이터가 아직 없어요.");
      })
      .catch(() => {
        setFullStores([]);
        setStores([]);
        setDataState("error");
        setDataErrorMessage(
          "공공데이터를 불러오지 못했어요. 잠시 후 다시 열어주세요.",
        );
      });
  }, []);

  // 지역 변경 시 지역별 파일 lazy load
  useEffect(() => {
    if (dataState !== "ready") return;

    if (selectedRegion === REGION_ALL) {
      setStores(fullStores);
      return;
    }

    const cache = regionCacheRef.current;
    if (cache.has(selectedRegion)) {
      setStores(cache.get(selectedRegion)!);
      return;
    }

    setRegionLoading(true);
    fetch(
      `${import.meta.env.BASE_URL}data/regions/${encodeURIComponent(selectedRegion)}.json`,
      { cache: "force-cache" },
    )
      .then(async (res) => {
        if (!res.ok) throw new Error();
        return (await res.json()) as { stores: Store[] };
      })
      .then((data) => {
        cache.set(selectedRegion, data.stores);
        setStores(data.stores);
      })
      .catch(() => {
        // 지역 파일 없으면 전체에서 필터
        const fallback = fullStores.filter(
          (s) => getStoreRegion(s) === selectedRegion,
        );
        cache.set(selectedRegion, fallback);
        setStores(fallback);
      })
      .finally(() => setRegionLoading(false));
  }, [selectedRegion, dataState, fullStores]);

  const storesWithDistance = useMemo(() => {
    if (userLocation == null) {
      return stores;
    }

    return stores.map((store) => {
      if (!hasCoordinates(store)) {
        return store;
      }

      return {
        ...store,
        distanceMeters: calculateDistanceMeters(userLocation, {
          latitude: store.latitude!,
          longitude: store.longitude!,
        }),
      };
    });
  }, [stores, userLocation]);

  const regionCounts = useMemo(() => {
    const counts = new Map<string, number>();

    for (const store of fullStores) {
      const region = getStoreRegion(store);
      counts.set(region, (counts.get(region) ?? 0) + 1);
    }

    return counts;
  }, [fullStores]);

  const regionOptions = useMemo(() => {
    const regions = Array.from(regionCounts.keys()).filter(
      (region) => region !== REGION_ALL,
    );

    regions.sort((a, b) => {
      const aIndex = REGION_ORDER.indexOf(a);
      const bIndex = REGION_ORDER.indexOf(b);

      if (aIndex !== -1 || bIndex !== -1) {
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      }

      return a.localeCompare(b, "ko");
    });

    return [REGION_ALL, ...regions];
  }, [regionCounts]);

  // stores는 이미 선택된 지역 데이터이므로 추가 필터 불필요
  const regionScopedStores = storesWithDistance;

  const filteredStores = useMemo(() => {
    return regionScopedStores
      .filter((store) => {
        if (tab === "saved" && !savedIds.includes(store.id)) {
          return false;
        }

        if (category === "onnuri" && store.onnuri === "none") {
          return false;
        }

        if (
          category !== "all" &&
          category !== "onnuri" &&
          store.category !== category
        ) {
          return false;
        }

        if (priceFilter === "under10k" && store.priceLabel !== "만원 이하") {
          return false;
        }

        if (radiusFilter !== "all") {
          const maxMeters =
            RADIUS_OPTIONS.find((o) => o.id === radiusFilter)?.meters ?? null;
          if (
            maxMeters != null &&
            (store.distanceMeters == null || store.distanceMeters > maxMeters)
          ) {
            return false;
          }
        }

        if (deferredQuery.length === 0) {
          return true;
        }

        return [
          store.name,
          store.address,
          store.benefitTitle,
          store.categoryLabel,
        ]
          .join(" ")
          .toLowerCase()
          .includes(deferredQuery);
      })
      .sort((a, b) => {
        if (sortOption === "name") {
          return a.name.localeCompare(b.name, "ko");
        }
        return (
          (a.distanceMeters ?? Number.MAX_SAFE_INTEGER) -
          (b.distanceMeters ?? Number.MAX_SAFE_INTEGER)
        );
      });
  }, [
    category,
    deferredQuery,
    priceFilter,
    radiusFilter,
    savedIds,
    sortOption,
    regionScopedStores,
    tab,
  ]);

  const mapStores = filteredStores.filter(hasCoordinates);
  const selectedStore =
    storesWithDistance.find(
      (store) => store.id === selectedStoreId && hasCoordinates(store),
    ) ??
    mapStores[0] ??
    null;
  const detailStore =
    storesWithDistance.find((store) => store.id === detailStoreId) ?? null;

  const savedStores = regionScopedStores.filter((store) =>
    savedIds.includes(store.id),
  );
  const totalSavedCount = savedIds.length;
  const regionalSavedCount = savedStores.length;
  const hasGeocodedStores = regionScopedStores.some(hasCoordinates);
  const onnuriCount = regionScopedStores.filter(
    (store) => store.onnuri !== "none",
  ).length;
  const visibleCategories = CATEGORIES.filter(
    (item) => item.id !== "onnuri" || onnuriCount > 0,
  );

  useEffect(() => {
    if (onnuriCount === 0 && category === "onnuri") {
      setCategory("all");
    }
  }, [category, onnuriCount]);

  async function applyLocation(coords: Coordinates) {
    setUserLocation(coords);
    setLocationLabel("내 위치");
    setRadiusFilter("all");
  }

  async function handleLocate() {
    setIsLocating(true);

    try {
      const location = await getCurrentLocation({
        accuracy: Accuracy.Balanced,
      });
      await applyLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch {
      if ("geolocation" in navigator) {
        try {
          const position = await new Promise<GeolocationPosition>(
            (resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: false,
                timeout: 10000,
                maximumAge: 60000,
              });
            },
          );
          await applyLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        } catch {
          setLocationLabel("지역 기준으로 보는 중");
        }
      } else {
        setLocationLabel("위치를 사용할 수 없어요");
      }
    } finally {
      setIsLocating(false);
    }
  }

  function handleToggleSaved(storeId: string) {
    const nextSavedIds = savedIds.includes(storeId)
      ? savedIds.filter((id) => id !== storeId)
      : [...savedIds, storeId];

    setSavedIds(nextSavedIds);
    writeSavedIds(nextSavedIds);
  }

  function handleOpenMap(store: Store) {
    setSelectedStoreId(store.id);
    setTab("map");
  }

  function handleOpenDetail(store: Store) {
    setSelectedStoreId(store.id);
    setDetailStoreId(store.id);

    setRecentIds((prev) => {
      const next = [store.id, ...prev.filter((id) => id !== store.id)].slice(
        0,
        RECENT_MAX,
      );
      writeRecentIds(next);
      return next;
    });
  }

  const visibleStores = filteredStores;
  const [pageSize, setPageSize] = useState(50);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setPageSize(50);
  }, [tab, category, priceFilter, query, selectedRegion, sortOption]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (el == null) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPageSize((prev) => prev + 50);
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visibleStores.length]);

  const pagedStores = visibleStores.slice(0, pageSize);
  const showDataError = dataState === "error";
  const showLocationPrompt = userLocation == null && dataState === "ready";
  const listCountLabel =
    tab === "saved" ? savedStores.length : filteredStores.length;

  const activeFilterCount =
    (sortOption !== "distance" ? 1 : 0) +
    (priceFilter !== "all" ? 1 : 0) +
    (radiusFilter !== "all" ? 1 : 0);

  const recentStores = recentIds
    .map((id) => storesWithDistance.find((s) => s.id === id))
    .filter((s): s is typeof storesWithDistance[number] => s != null);

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <span className="eyebrow">절약지도</span>
          <h1>
            {hasGeocodedStores ? "오늘 가까운 절약처" : "오늘 찾을 절약처"}
          </h1>
        </div>
        <button
          className={activeFilterCount > 0 ? "icon-button active" : "icon-button"}
          type="button"
          aria-label={`필터${activeFilterCount > 0 ? ` (${activeFilterCount}개 적용 중)` : ""}`}
          onClick={() => setIsFilterOpen(true)}
        >
          <SlidersHorizontal size={20} />
          {activeFilterCount > 0 && (
            <span className="filter-badge">{activeFilterCount}</span>
          )}
        </button>
      </header>

      <section className="location-row" aria-label="현재 위치">
        <button
          className="location-button"
          type="button"
          onClick={handleLocate}
        >
          <LocateFixed size={18} />
          <span>{isLocating ? "위치 확인 중" : locationLabel}</span>
        </button>
        <button
          className="location-badge"
          type="button"
          onClick={() => setIsRegionOpen(true)}
          disabled={regionLoading}
        >
          <span>{selectedRegion}</span>
          <span>{regionLoading ? "로딩 중…" : `${listCountLabel}곳`}</span>
          <ChevronDown size={16} />
        </button>
      </section>

      {showDataError && (
        <section className="status-banner error" aria-label="데이터 상태">
          <Info size={18} />
          <div>
            <strong>데이터 확인이 필요해요</strong>
            <p>{dataErrorMessage}</p>
          </div>
        </section>
      )}

      {showLocationPrompt && (
        <section className="status-banner" aria-label="위치 안내">
          <LocateFixed size={18} />
          <div>
            <strong>내 위치</strong>
            <p>위치를 켜면 내 주변 순서로 보여드려요.</p>
          </div>
          <button type="button" onClick={handleLocate}>
            위치 사용
          </button>
        </section>
      )}

      <SearchField
        className="search-box"
        aria-label="절약처 검색"
        value={query}
        onChange={(event) => {
          const nextQuery = event.target.value;
          startTransition(() => setQuery(nextQuery));
        }}
        onDeleteClick={() => setQuery("")}
        placeholder="밥집, 온누리, 세탁 검색"
      />

      <nav className="category-tabs" aria-label="카테고리">
        {visibleCategories.map((item) => (
          <button
            className={
              category === item.id ? "category-tab active" : "category-tab"
            }
            key={item.id}
            type="button"
            aria-pressed={category === item.id}
            onClick={() => setCategory(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {tab === "home" && (
        <>
          <section className="summary-grid" aria-label="절약 요약">
            <div className="summary-card primary">
              <WalletCards size={20} />
              <strong>만원 이하</strong>
              <span>
                {
                  regionScopedStores.filter(
                    (store) => store.priceLabel === "만원 이하",
                  ).length
                }
                곳
              </span>
            </div>
            <div className="summary-card">
              <Sparkles size={20} />
              <strong>온누리</strong>
              <span>{onnuriCount}곳</span>
            </div>
            <div className="summary-card">
              <BookmarkCheck size={20} />
              <strong>저장</strong>
              <span>{regionalSavedCount}곳</span>
            </div>
          </section>

          {dataGeneratedAt != null && (
            <p className="data-updated-label">
              공공데이터{" "}
              {new Date(dataGeneratedAt).toLocaleDateString("ko-KR")} 기준
            </p>
          )}

          {recentStores.length > 0 && (
            <RecentStores
              stores={recentStores}
              savedIds={savedIds}
              onSelect={handleOpenDetail}
              onToggleSaved={handleToggleSaved}
            />
          )}
        </>
      )}

      <Suspense fallback={<MapPanelFallback hidden={tab !== "map"} />}>
        <MapPreview
          hidden={tab !== "map"}
          selectedStore={selectedStore}
          selectedStoreId={selectedStoreId}
          stores={filteredStores}
          userLocation={userLocation}
          onSelectStore={handleOpenDetail}
        />
      </Suspense>

      {tab === "map" && (
        <MapListPanel
          isOpen={isMapListOpen}
          stores={filteredStores}
          savedIds={savedIds}
          selectedStoreId={selectedStoreId}
          onToggle={() => setIsMapListOpen((v) => !v)}
          onSelectStore={(store) => {
            setSelectedStoreId(store.id);
            setIsMapListOpen(false);
          }}
          onOpenDetail={handleOpenDetail}
          onToggleSaved={handleToggleSaved}
        />
      )}

      {tab === "my" ? (
        <MyPanel
          dataGeneratedAt={dataGeneratedAt}
          onnuriCount={onnuriCount}
          regionLabel={selectedRegion}
          regionalSavedCount={regionalSavedCount}
          totalSavedCount={totalSavedCount}
          totalCount={regionScopedStores.length}
          under10kCount={
            regionScopedStores.filter((s) => s.priceLabel === "만원 이하")
              .length
          }
          onLocate={handleLocate}
        />
      ) : dataState === "loading" || regionLoading ? (
        <StoreListSkeleton />
      ) : tab === "saved" && savedStores.length === 0 ? (
        <EmptySaved
          totalSavedCount={totalSavedCount}
          onGoHome={() => setTab("home")}
          onViewAll={() => setSelectedRegion(REGION_ALL)}
        />
      ) : visibleStores.length === 0 ? (
        <EmptyResults
          hasQuery={query.length > 0}
          hasFilter={activeFilterCount > 0 || category !== "all"}
          onClearQuery={() => setQuery("")}
          onResetFilters={() => {
            setQuery("");
            setCategory("all");
            setSortOption("distance");
            setPriceFilter("all");
            setRadiusFilter("all");
          }}
        />
      ) : (
        <section className="store-list" aria-label="절약처 목록">
          <div className="section-title">
            <h2>{tab === "saved" ? "저장한 곳" : "지금 갈만한 곳"}</h2>
            <span>{visibleStores.length}곳</span>
          </div>

          {pagedStores.map((store) => (
            <StoreCard
              isActive={selectedStoreId === store.id}
              isSaved={savedIds.includes(store.id)}
              key={store.id}
              store={store}
              onSelect={() => handleOpenDetail(store)}
              onPreviewMap={() => handleOpenMap(store)}
              onToggleSaved={() => handleToggleSaved(store.id)}
            />
          ))}
          {pageSize < visibleStores.length && (
            <div ref={sentinelRef} style={{ height: 1 }} />
          )}
        </section>
      )}

      {isFilterOpen && (
        <FilterSheet
          hasLocation={userLocation != null}
          sortOption={sortOption}
          priceFilter={priceFilter}
          radiusFilter={radiusFilter}
          onChangeSortOption={setSortOption}
          onChangePriceFilter={setPriceFilter}
          onChangeRadiusFilter={setRadiusFilter}
          onClose={() => setIsFilterOpen(false)}
        />
      )}

      {isRegionOpen && (
        <RegionSheet
          counts={regionCounts}
          options={regionOptions}
          selectedRegion={selectedRegion}
          onClose={() => setIsRegionOpen(false)}
          onSelectRegion={(region) => {
            setSelectedRegion(region);
            setIsRegionOpen(false);
          }}
        />
      )}

      {detailStore != null && (
        <StoreDetailSheet
          isSaved={savedIds.includes(detailStore.id)}
          store={detailStore}
          onClose={() => setDetailStoreId(null)}
          onPreviewMap={() => {
            handleOpenMap(detailStore);
            setDetailStoreId(null);
          }}
          onToggleSaved={() => handleToggleSaved(detailStore.id)}
        />
      )}

      <nav className="bottom-nav" aria-label="하단 메뉴">
        <NavButton
          active={tab === "home"}
          icon={<Home size={20} />}
          label="홈"
          onClick={() => setTab("home")}
        />
        <NavButton
          active={tab === "map"}
          icon={<MapIcon size={20} />}
          label="지도"
          onClick={() => setTab("map")}
        />
        <NavButton
          active={tab === "saved"}
          icon={<Star size={20} />}
          label="저장"
          onClick={() => setTab("saved")}
        />
        <NavButton
          active={tab === "my"}
          icon={<UserRound size={20} />}
          label="마이"
          onClick={() => setTab("my")}
        />
      </nav>
    </main>
  );
}

function MapPanelFallback({ hidden }: { hidden: boolean }) {
  if (hidden) {
    return null;
  }

  return (
    <section className="map-preview" aria-label="지도 불러오는 중">
      <div className="map-canvas loading" />
      <div className="selected-place empty">
        <div className="selected-place-info">
          <strong>지도를 불러오는 중이에요</strong>
          <span>잠시만 기다리면 주변 절약처를 지도에서 확인할 수 있어요.</span>
        </div>
      </div>
    </section>
  );
}



function NavButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={active ? "nav-button active" : "nav-button"}
      type="button"
      aria-current={active ? "page" : undefined}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

export default App;
