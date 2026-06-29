import {
  Bookmark,
  BookmarkCheck,
  Compass,
  Info,
  Map as MapIcon,
  MapPin,
  Navigation,
  PenLine,
  Phone,
  Share2,
  SquareCheckBig,
  WalletCards,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { Store } from "../data/stores";
import { inferStoreVisualVariant } from "../storeVisuals";
import { getDistanceLabel, openKakaoMap, openNaverMap } from "../utils";
import StoreVisualIcon from "./StoreVisualIcon";

export default function StoreDetailSheet({
  isSaved,
  isVisited,
  note,
  store,
  onClose,
  onPreviewMap,
  onToggleSaved,
  onToggleVisited,
  onChangeNote,
}: {
  isSaved: boolean;
  isVisited: boolean;
  note: string;
  store: Store;
  onClose: () => void;
  onPreviewMap: () => void;
  onToggleSaved: () => void;
  onToggleVisited: () => void;
  onChangeNote: (text: string) => void;
}) {
  const phone = store.sourceMeta?.phone;
  const hasPhone = phone != null && phone.trim().length > 0;
  const variant = inferStoreVisualVariant(store);
  const [shareToast, setShareToast] = useState<"copied" | "shared" | null>(null);
  const shareToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    return () => { if (shareToastTimerRef.current != null) clearTimeout(shareToastTimerRef.current); };
  }, []);

  async function handleShare() {
    const text = `${store.name}\n${store.benefitTitle}\n${store.address}`;
    if (navigator.share) {
      const shared = await navigator.share({ title: store.name, text }).then(() => true).catch(() => false);
      if (!shared) return;
      setShareToast("shared");
    } else {
      await navigator.clipboard.writeText(text).catch(() => {});
      setShareToast("copied");
    }
    if (shareToastTimerRef.current != null) clearTimeout(shareToastTimerRef.current);
    shareToastTimerRef.current = setTimeout(() => setShareToast(null), 2200);
  }

  return (
    <div className="sheet-backdrop" role="presentation" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        className="detail-sheet"
        aria-label={`${store.name} 상세`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sheet-handle" />
        <div className="detail-header">
          <div className="detail-header-main">
            <div className={`detail-store-badge ${variant}`}>
              <StoreVisualIcon variant={variant} />
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
          {store.onnuri !== "none" && (
            <div className="detail-info-row">
              <WalletCards size={18} />
              <span>
                {store.onnuri === "digital" ? (
                  <>
                    <strong className="onnuri-type digital">디지털 온누리</strong>
                    {" — 토스·카드 등 앱에서 결제 가능"}
                  </>
                ) : (
                  <>
                    <strong className="onnuri-type paper">지류 온누리</strong>
                    {" — 종이 상품권으로 결제 가능"}
                  </>
                )}
              </span>
            </div>
          )}
        </div>

        {isSaved && (
          <div className="detail-note">
            <label className="detail-note-label" htmlFor={`note-${store.id}`}>
              <PenLine size={13} />
              메모
            </label>
            <textarea
              id={`note-${store.id}`}
              className="detail-note-input"
              value={note}
              onChange={(e) => onChangeNote(e.target.value)}
              placeholder="월요일 휴무, 주차 가능 등"
              maxLength={80}
              rows={2}
            />
          </div>
        )}

        <div className="detail-actions">
          <button type="button" onClick={onToggleSaved}>
            {isSaved ? <BookmarkCheck size={19} /> : <Bookmark size={19} />}
            {isSaved ? "저장됨" : "저장"}
          </button>
          <button
            className={isVisited ? "visited-active" : ""}
            type="button"
            onClick={onToggleVisited}
          >
            <SquareCheckBig size={19} />
            {isVisited ? "다녀왔어요" : "방문 체크"}
          </button>
          <button type="button" onClick={onPreviewMap}>
            <MapIcon size={19} />
            미리보기
          </button>
          <button type="button" onClick={() => openNaverMap(store)}>
            <Navigation size={19} />
            네이버
          </button>
          <button type="button" onClick={() => openKakaoMap(store)}>
            <MapIcon size={19} />
            카카오
          </button>
          {hasPhone && (
            <a href={`tel:${phone}`}>
              <Phone size={19} />
              전화
            </a>
          )}
          <button type="button" onClick={handleShare}>
            <Share2 size={19} />
            공유
          </button>
        </div>
      </section>
      {shareToast != null && (
        <div className="share-toast" role="status" aria-live="polite">
          {shareToast === "copied" ? "주소를 클립보드에 복사했어요" : "공유했어요"}
        </div>
      )}
    </div>
  );
}
