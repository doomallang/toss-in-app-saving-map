import { useEffect } from "react";

import { PriceFilter, RADIUS_OPTIONS, RadiusFilter, SortOption } from "../types";

export default function FilterSheet({
  hasLocation,
  sortOption,
  priceFilter,
  radiusFilter,
  onChangeSortOption,
  onChangePriceFilter,
  onChangeRadiusFilter,
  onClose,
}: {
  hasLocation: boolean;
  sortOption: SortOption;
  priceFilter: PriceFilter;
  radiusFilter: RadiusFilter;
  onChangeSortOption: (option: SortOption) => void;
  onChangePriceFilter: (filter: PriceFilter) => void;
  onChangeRadiusFilter: (filter: RadiusFilter) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="sheet-backdrop" role="presentation" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
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
                sortOption === item.id ? "filter-option active" : "filter-option"
              }
              type="button"
              aria-pressed={sortOption === item.id}
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
                priceFilter === item.id ? "filter-option active" : "filter-option"
              }
              type="button"
              aria-pressed={priceFilter === item.id}
              onClick={() => onChangePriceFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {hasLocation && (
          <>
            <p className="filter-section-label">반경</p>
            <div className="filter-option-group">
              {RADIUS_OPTIONS.map((item) => (
                <button
                  key={item.id}
                  className={
                    radiusFilter === item.id
                      ? "filter-option active"
                      : "filter-option"
                  }
                  type="button"
                  aria-pressed={radiusFilter === item.id}
                  onClick={() => onChangeRadiusFilter(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </>
        )}

        <button className="filter-close-button" type="button" onClick={onClose}>
          닫기
        </button>
      </section>
    </div>
  );
}
