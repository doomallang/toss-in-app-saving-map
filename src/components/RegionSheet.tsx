import { useEffect } from "react";

import { REGION_ALL } from "../types";

export default function RegionSheet({
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
                aria-pressed={selectedRegion === region}
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
