import { ChevronDown } from "lucide-react";

import type { Store } from "../data/stores";
import StoreCard from "./StoreCard";

export default function MapListPanel({
  isOpen,
  stores,
  savedIds,
  visitedIds,
  storeNotes,
  selectedStoreId,
  onToggle,
  onSelectStore,
  onOpenDetail,
  onToggleSaved,
}: {
  isOpen: boolean;
  stores: Store[];
  savedIds: string[];
  visitedIds: string[];
  storeNotes: Record<string, string>;
  selectedStoreId: string | null;
  onToggle: () => void;
  onSelectStore: (store: Store) => void;
  onOpenDetail: (store: Store) => void;
  onToggleSaved: (id: string) => void;
}) {
  return (
    <div className={`map-list-panel${isOpen ? " open" : ""}`}>
      <button
        className="map-list-toggle"
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <span className="map-list-handle" />
        <span className="map-list-label">
          {isOpen ? "지도로 보기" : `목록 보기 · ${stores.length}곳`}
        </span>
        <ChevronDown
          size={18}
          className={`map-list-chevron${isOpen ? " up" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="map-list-body">
          {stores.length === 0 ? (
            <p className="map-list-empty">조건에 맞는 가게가 없어요.</p>
          ) : (
            stores.slice(0, 100).map((store) => (
              <StoreCard
                key={store.id}
                isActive={selectedStoreId === store.id}
                isSaved={savedIds.includes(store.id)}
                isVisited={visitedIds.includes(store.id)}
                note={storeNotes[store.id]}
                store={store}
                onSelect={() => onOpenDetail(store)}
                onPreviewMap={() => onSelectStore(store)}
                onToggleSaved={() => onToggleSaved(store.id)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
