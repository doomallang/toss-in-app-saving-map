import {
  Accuracy,
  Storage,
  getCurrentLocation,
} from "@apps-in-toss/web-framework";
import {
  Croissant,
  Bookmark,
  BookmarkCheck,
  Coffee,
  ChevronDown,
  ChevronRight,
  Compass,
  ExternalLink,
  Home,
  Info,
  LocateFixed,
  Map as MapIcon,
  MapPin,
  Phone,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Scissors,
  ShoppingBasket,
  Soup,
  Store as StoreIcon,
  TramFront,
  UserRound,
  WalletCards,
  X,
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
import "./App.css";
import { Store, StoreCategory } from "./data/stores";
import { inferStoreVisualVariant } from "./storeVisuals";

type CategoryFilter = "all" | StoreCategory | "onnuri";
type Tab = "home" | "map" | "saved" | "my";
type SortOption = "distance" | "name";
type PriceFilter = "all" | "under10k";

const CATEGORIES: Array<{ id: CategoryFilter; label: string }> = [
  { id: "all", label: "전체" },
  { id: "food", label: "식비" },
  { id: "market", label: "장보기" },
  { id: "life", label: "생활" },
  { id: "mobility", label: "교통" },
  { id: "onnuri", label: "온누리" },
];

const SAVED_KEY = "saving-map.saved-store-ids";
const REGION_ALL = "전국";
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

type Coordinates = {
  latitude: number;
  longitude: number;
};

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

function normalizeRegionLabel(value: string) {
  const trimmed = value.trim();

  if (trimmed.length === 0 || trimmed === REGION_ALL) {
    return REGION_ALL;
  }

  const firstToken = trimmed.split(/\s+/)[0] ?? trimmed;

  return firstToken
    .replace(/특별시|광역시|특별자치시|특별자치도|자치도|도$/, "")
    .trim();
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

async function writeSavedIds(ids: string[]) {
  const value = JSON.stringify(ids);

  try {
    await Storage.setItem(SAVED_KEY, value);
  } catch {
    window.localStorage.setItem(SAVED_KEY, value);
  }
}

function renderStoreVisualIcon(
  variant: ReturnType<typeof inferStoreVisualVariant>,
) {
  if (variant === "restaurant") {
    return <Soup size={22} />;
  }

  if (variant === "snack") {
    return <Croissant size={22} />;
  }

  if (variant === "cafe") {
    return <Coffee size={22} />;
  }

  if (variant === "beauty") {
    return <Scissors size={22} />;
  }

  if (variant === "market") {
    return <ShoppingBasket size={22} />;
  }

  if (variant === "mobility") {
    return <TramFront size={22} />;
  }

  return <StoreIcon size={22} />;
}

function App() {
  const [stores, setStores] = useState<Store[]>([]);
  const [dataGeneratedAt, setDataGeneratedAt] = useState<string | null>(null);
  const [dataState, setDataState] = useState<DataState>("loading");
  const [dataErrorMessage, setDataErrorMessage] = useState<string | null>(null);
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
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState(REGION_ALL);
  const [isRegionOpen, setIsRegionOpen] = useState(false);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  useEffect(() => {
    readSavedIds().then(setSavedIds);
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
          setStores(data.stores);
          setDataGeneratedAt(data.generatedAt);
          setSelectedRegion(normalizeRegionLabel(data.region));
          setDataState("ready");
          return;
        }

        setStores([]);
        setDataGeneratedAt(data.generatedAt ?? null);
        setSelectedRegion(normalizeRegionLabel(data.region ?? REGION_ALL));
        setDataState("error");
        setDataErrorMessage("표시할 절약처 데이터가 아직 없어요.");
      })
      .catch(() => {
        setStores([]);
        setDataState("error");
        setDataErrorMessage(
          "공공데이터를 불러오지 못했어요. 잠시 후 다시 열어주세요.",
        );
      });
  }, []);

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

    for (const store of storesWithDistance) {
      const region = getStoreRegion(store);
      counts.set(region, (counts.get(region) ?? 0) + 1);
    }

    return counts;
  }, [storesWithDistance]);

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

  const regionScopedStores = useMemo(() => {
    if (selectedRegion === REGION_ALL) {
      return storesWithDistance;
    }

    return storesWithDistance.filter(
      (store) => getStoreRegion(store) === selectedRegion,
    );
  }, [selectedRegion, storesWithDistance]);

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
          className={
            sortOption !== "distance" || priceFilter !== "all"
              ? "icon-button active"
              : "icon-button"
          }
          type="button"
          aria-label="필터"
          onClick={() => setIsFilterOpen(true)}
        >
          <SlidersHorizontal size={20} />
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
        >
          <span>{selectedRegion}</span>
          <span>{listCountLabel}곳</span>
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

      <div className="search-box">
        <Search size={18} />
        <input
          value={query}
          onChange={(event) => {
            const nextQuery = event.target.value;
            startTransition(() => setQuery(nextQuery));
          }}
          placeholder="밥집, 온누리, 세탁 검색"
        />
        {query.length > 0 && (
          <button
            className="search-clear"
            type="button"
            aria-label="검색어 지우기"
            onClick={() => setQuery("")}
          >
            <X size={16} />
          </button>
        )}
      </div>

      <nav className="category-tabs" aria-label="카테고리">
        {visibleCategories.map((item) => (
          <button
            className={
              category === item.id ? "category-tab active" : "category-tab"
            }
            key={item.id}
            type="button"
            onClick={() => setCategory(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {tab === "home" && (
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
      ) : tab === "saved" && savedStores.length === 0 ? (
        <EmptySaved onGoHome={() => setTab("home")} />
      ) : visibleStores.length === 0 ? (
        <EmptyResults />
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
              onOpenMap={() =>
                window.open(getNaverMapUrl(store), "_blank", "noopener")
              }
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
          sortOption={sortOption}
          priceFilter={priceFilter}
          onChangeSortOption={setSortOption}
          onChangePriceFilter={setPriceFilter}
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
          onOpenMap={() =>
            window.open(getNaverMapUrl(detailStore), "_blank", "noopener")
          }
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

function StoreCard({
  isActive,
  isSaved,
  store,
  onOpenMap,
  onPreviewMap,
  onSelect,
  onToggleSaved,
}: {
  isActive: boolean;
  isSaved: boolean;
  store: Store;
  onOpenMap: () => void;
  onPreviewMap: () => void;
  onSelect: () => void;
  onToggleSaved: () => void;
}) {
  const variant = inferStoreVisualVariant(store);

  return (
    <article className={isActive ? "store-card active" : "store-card"}>
      <button
        className={
          isActive ? `store-logo ${variant} active` : `store-logo ${variant}`
        }
        type="button"
        onClick={onPreviewMap}
        aria-label="지도 미리보기"
      >
        {renderStoreVisualIcon(variant)}
      </button>

      <button className="store-content" type="button" onClick={onSelect}>
        <span className="store-meta">
          {store.source} · {getDistanceLabel(store.distanceMeters)}
        </span>
        <strong>{store.name}</strong>
        <span className="benefit">
          {store.benefitTitle}
          {store.onnuri === "digital" && (
            <span className="onnuri-badge digital">디지털</span>
          )}
          {store.onnuri === "paper" && (
            <span className="onnuri-badge paper">지류</span>
          )}
        </span>
        <span className="address">{store.address}</span>
      </button>

      <div className="store-actions">
        <button
          className="card-icon-button"
          type="button"
          onClick={onToggleSaved}
          aria-label="저장"
        >
          {isSaved ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
        </button>
        <button
          className="card-icon-button"
          type="button"
          onClick={onOpenMap}
          aria-label="지도 열기"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </article>
  );
}

function StoreDetailSheet({
  isSaved,
  store,
  onClose,
  onOpenMap,
  onPreviewMap,
  onToggleSaved,
}: {
  isSaved: boolean;
  store: Store;
  onClose: () => void;
  onOpenMap: () => void;
  onPreviewMap: () => void;
  onToggleSaved: () => void;
}) {
  const phone = store.sourceMeta?.phone;
  const hasPhone = phone != null && phone.trim().length > 0;
  const variant = inferStoreVisualVariant(store);

  return (
    <div className="sheet-backdrop" role="presentation" onClick={onClose}>
      <section
        className="detail-sheet"
        aria-label={`${store.name} 상세`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sheet-handle" />
        <div className="detail-header">
          <div className="detail-header-main">
            <div className={`detail-store-badge ${variant}`}>
              {renderStoreVisualIcon(variant)}
            </div>
            <div>
              <span>{store.source}</span>
              <h2>{store.name}</h2>
            </div>
          </div>
          <button
            className="card-icon-button"
            type="button"
            onClick={onClose}
            aria-label="닫기"
          >
            <X size={20} />
          </button>
        </div>

        <div className={`detail-benefit ${variant}`}>
          <strong>{store.benefitTitle}</strong>
          <span>{store.benefitDescription}</span>
        </div>

        <div className="detail-info-list">
          <div className="detail-info-row">
            <MapPin size={18} />
            <span>{store.address}</span>
          </div>
          <div className="detail-info-row">
            <Compass size={18} />
            <span>{getDistanceLabel(store.distanceMeters)}</span>
          </div>
          <div className="detail-info-row">
            <Info size={18} />
            <span>{store.priceLabel}</span>
          </div>
        </div>

        <div className="detail-actions">
          <button type="button" onClick={onToggleSaved}>
            {isSaved ? <BookmarkCheck size={19} /> : <Bookmark size={19} />}
            {isSaved ? "저장됨" : "저장"}
          </button>
          <button type="button" onClick={onPreviewMap}>
            <MapIcon size={19} />
            미리보기
          </button>
          <button type="button" onClick={onOpenMap}>
            <ExternalLink size={19} />
            길찾기
          </button>
          {hasPhone && (
            <a href={`tel:${phone}`}>
              <Phone size={19} />
              전화
            </a>
          )}
        </div>
      </section>
    </div>
  );
}

function FilterSheet({
  sortOption,
  priceFilter,
  onChangeSortOption,
  onChangePriceFilter,
  onClose,
}: {
  sortOption: SortOption;
  priceFilter: PriceFilter;
  onChangeSortOption: (option: SortOption) => void;
  onChangePriceFilter: (filter: PriceFilter) => void;
  onClose: () => void;
}) {
  return (
    <div className="sheet-backdrop" role="presentation" onClick={onClose}>
      <section
        className="filter-sheet"
        aria-label="필터 및 정렬"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-handle" />
        <h2 className="filter-sheet-title">필터 및 정렬</h2>

        <p className="filter-section-label">정렬</p>
        <div className="filter-option-group">
          {(
            [
              { id: "distance", label: "거리순" },
              { id: "name", label: "이름순" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              className={
                sortOption === item.id
                  ? "filter-option active"
                  : "filter-option"
              }
              type="button"
              onClick={() => onChangeSortOption(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <p className="filter-section-label">가격</p>
        <div className="filter-option-group">
          {(
            [
              { id: "all", label: "전체" },
              { id: "under10k", label: "만원 이하" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              className={
                priceFilter === item.id
                  ? "filter-option active"
                  : "filter-option"
              }
              type="button"
              onClick={() => onChangePriceFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <button className="filter-close-button" type="button" onClick={onClose}>
          닫기
        </button>
      </section>
    </div>
  );
}

function RegionSheet({
  counts,
  options,
  selectedRegion,
  onClose,
  onSelectRegion,
}: {
  counts: Map<string, number>;
  options: string[];
  selectedRegion: string;
  onClose: () => void;
  onSelectRegion: (region: string) => void;
}) {
  const totalCount = Array.from(counts.values()).reduce(
    (sum, count) => sum + count,
    0,
  );

  return (
    <div className="sheet-backdrop" role="presentation" onClick={onClose}>
      <section
        className="filter-sheet"
        aria-label="지역 선택"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sheet-handle" />
        <h2 className="filter-sheet-title">지역 선택</h2>

        <div className="region-option-list">
          {options.map((region) => {
            const count =
              region === REGION_ALL ? totalCount : (counts.get(region) ?? 0);

            return (
              <button
                key={region}
                className={
                  selectedRegion === region
                    ? "region-option active"
                    : "region-option"
                }
                type="button"
                onClick={() => onSelectRegion(region)}
              >
                <strong>{region}</strong>
                <span>{count.toLocaleString()}곳</span>
              </button>
            );
          })}
        </div>

        <button className="filter-close-button" type="button" onClick={onClose}>
          닫기
        </button>
      </section>
    </div>
  );
}

function EmptySaved({ onGoHome }: { onGoHome: () => void }) {
  return (
    <section className="empty-state">
      <Compass size={32} />
      <h2>저장한 절약처가 없어요</h2>
      <p>
        자주 가는 밥집이나 온누리 가맹점을 저장해두면 바로 다시 찾을 수 있어요.
      </p>
      <button type="button" onClick={onGoHome}>
        가까운 곳 보기
      </button>
    </section>
  );
}

function EmptyResults() {
  return (
    <section className="empty-state">
      <Compass size={32} />
      <h2>조건에 맞는 절약처가 없어요</h2>
      <p>검색어를 지우거나 다른 카테고리로 바꿔서 다시 확인해보세요.</p>
    </section>
  );
}

function MyPanel({
  dataGeneratedAt,
  onnuriCount,
  regionLabel,
  regionalSavedCount,
  totalSavedCount,
  totalCount,
  under10kCount,
  onLocate,
}: {
  dataGeneratedAt: string | null;
  onnuriCount: number;
  regionLabel: string;
  regionalSavedCount: number;
  totalSavedCount: number;
  totalCount: number;
  under10kCount: number;
  onLocate: () => void;
}) {
  const updatedLabel =
    dataGeneratedAt != null
      ? `공공데이터 ${new Date(dataGeneratedAt).toLocaleDateString("ko-KR")} 기준`
      : "공공데이터 기반";

  return (
    <section className="my-panel" aria-label="마이">
      <div className="my-hero">
        <span>{updatedLabel}</span>
        <strong>
          {totalSavedCount > 0
            ? `${regionalSavedCount}곳 저장해뒀어요`
            : "절약처를 저장해보세요"}
        </strong>
        <p>
          {regionLabel} 기준 저장 {regionalSavedCount}곳, 전체 저장{" "}
          {totalSavedCount}곳이에요.
        </p>
      </div>

      <div className="my-stat-grid">
        <div>
          <strong>{totalCount.toLocaleString()}</strong>
          <span>전체 절약처</span>
        </div>
        <div>
          <strong>{under10kCount.toLocaleString()}</strong>
          <span>만원 이하</span>
        </div>
        <div>
          <strong>{onnuriCount.toLocaleString()}</strong>
          <span>온누리 가맹</span>
        </div>
      </div>

      <button className="my-action" type="button" onClick={onLocate}>
        <LocateFixed size={18} />
        위치 다시 확인
      </button>
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
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

export default App;
