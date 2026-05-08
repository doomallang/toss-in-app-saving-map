import { Bookmark, BookmarkCheck } from "lucide-react";

import type { Store } from "../data/stores";
import { inferStoreVisualVariant } from "../storeVisuals";
import StoreVisualIcon from "./StoreVisualIcon";

export default function RecentStores({
  stores,
  savedIds,
  onSelect,
  onToggleSaved,
}: {
  stores: Store[];
  savedIds: string[];
  onSelect: (store: Store) => void;
  onToggleSaved: (id: string) => void;
}) {
  return (
    <section className="recent-stores" aria-label="최근 본 곳">
      <div className="section-title">
        <h2>최근 본 곳</h2>
      </div>
      <div className="recent-scroll">
        {stores.map((store) => {
          const variant = inferStoreVisualVariant(store);
          const isSaved = savedIds.includes(store.id);
          return (
            <button
              key={store.id}
              className="recent-card"
              type="button"
              onClick={() => onSelect(store)}
            >
              <div className={`recent-card-icon ${variant}`}>
                <StoreVisualIcon variant={variant} size={18} />
              </div>
              <span className="recent-card-name">{store.name}</span>
              <span className="recent-card-benefit">{store.benefitTitle}</span>
              <button
                className={`recent-card-save${isSaved ? " saved" : ""}`}
                type="button"
                aria-label={isSaved ? "저장 해제" : "저장"}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSaved(store.id);
                }}
              >
                {isSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
              </button>
            </button>
          );
        })}
      </div>
    </section>
  );
}
