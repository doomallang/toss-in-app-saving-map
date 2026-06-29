import { Bookmark, BookmarkCheck, ChevronRight, SquareCheckBig } from "lucide-react";

import type { Store } from "../data/stores";
import { inferStoreVisualVariant } from "../storeVisuals";
import { getDistanceLabel } from "../utils";
import StoreVisualIcon from "./StoreVisualIcon";

export default function StoreCard({
  isActive,
  isSaved,
  isVisited,
  note,
  store,
  onPreviewMap,
  onSelect,
  onToggleSaved,
}: {
  isActive: boolean;
  isSaved: boolean;
  isVisited: boolean;
  note?: string;
  store: Store;
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
        <StoreVisualIcon variant={variant} />
      </button>

      <button className="store-content" type="button" onClick={onSelect}>
        <span className="store-meta">
          {store.source} · {getDistanceLabel(store.distanceMeters)}
          {isVisited && (
            <span className="visited-badge">
              <SquareCheckBig size={11} />
              다녀옴
            </span>
          )}
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
        {note && <span className="store-note">{note}</span>}
      </button>

      <div className="store-actions">
        <button
          className="card-icon-button"
          type="button"
          onClick={onToggleSaved}
          aria-label={isSaved ? "저장 해제" : "저장"}
        >
          {isSaved ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
        </button>
        <button
          className="card-icon-button"
          type="button"
          onClick={onSelect}
          aria-label="상세 보기"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </article>
  );
}
