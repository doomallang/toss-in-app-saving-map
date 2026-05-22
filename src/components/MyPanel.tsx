import { LocateFixed } from "lucide-react";

import type { Store } from "../data/stores";
import { getDataFreshness } from "../utils";

const CATEGORY_LABELS: Array<{ id: Store["category"]; label: string }> = [
  { id: "food", label: "식비" },
  { id: "market", label: "장보기" },
  { id: "life", label: "생활" },
  { id: "mobility", label: "교통" },
];

export default function MyPanel({
  dataGeneratedAt,
  onnuriCount,
  regionLabel,
  regionalSavedCount,
  savedStores,
  totalSavedCount,
  totalCount,
  under10kCount,
  visitedIds,
  visitedCount,
  onLocate,
}: {
  dataGeneratedAt: string | null;
  onnuriCount: number;
  regionLabel: string;
  regionalSavedCount: number;
  savedStores: Store[];
  totalSavedCount: number;
  totalCount: number;
  under10kCount: number;
  visitedIds: string[];
  visitedCount: number;
  onLocate: () => void;
}) {
  const freshness = dataGeneratedAt != null ? getDataFreshness(dataGeneratedAt) : null;
  const updatedLabel =
    dataGeneratedAt != null
      ? `공공데이터 ${new Date(dataGeneratedAt).toLocaleDateString("ko-KR")} 기준`
      : "공공데이터 기반";

  const savedUnder10k = savedStores.filter((s) => s.priceLabel === "만원 이하").length;
  const savedOnnuri = savedStores.filter((s) => s.onnuri !== "none").length;
  const savedVisited = savedStores.filter((s) => visitedIds.includes(s.id)).length;

  const categoryBreakdown = CATEGORY_LABELS.map(({ id, label }) => ({
    id,
    label,
    count: savedStores.filter((s) => s.category === id).length,
  })).filter((c) => c.count > 0);

  return (
    <section className="my-panel" aria-label="마이">
      <div className="my-hero">
        <div className="my-hero-meta">
          <span>{updatedLabel}</span>
          {freshness != null && (
            <span className={`freshness-badge level-${freshness.level}`}>
              {freshness.label}
            </span>
          )}
        </div>
        <strong>
          {visitedCount > 0
            ? `${visitedCount}곳 다녀왔어요`
            : totalSavedCount > 0
              ? `${regionalSavedCount}곳 저장해뒀어요`
              : "절약처를 저장해보세요"}
        </strong>
        <p>
          저장 {totalSavedCount}곳 · 방문 {visitedCount}곳이에요.
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

      <div className="my-stat-grid cols-2">
        <div>
          <strong>{regionalSavedCount.toLocaleString()}</strong>
          <span>{regionLabel} 저장</span>
        </div>
        <div>
          <strong>{visitedCount.toLocaleString()}</strong>
          <span>방문 기록</span>
        </div>
      </div>

      {savedStores.length > 0 && (
        <div className="my-saved-analysis">
          <p className="my-section-label">저장 분석</p>

          {categoryBreakdown.length > 0 && (
            <div className="my-category-chips">
              {categoryBreakdown.map(({ id, label, count }) => (
                <div key={id} className={`my-category-chip cat-${id}`}>
                  <span>{label}</span>
                  <strong>{count}</strong>
                </div>
              ))}
            </div>
          )}

          <div className="my-stat-grid" style={{ marginTop: 8 }}>
            <div>
              <strong>{savedUnder10k}</strong>
              <span>만원 이하</span>
            </div>
            <div>
              <strong>{savedOnnuri}</strong>
              <span>온누리 가능</span>
            </div>
            <div>
              <strong>{savedVisited}</strong>
              <span>다녀온 곳</span>
            </div>
          </div>
        </div>
      )}

      {freshness != null && (freshness.level === "stale" || freshness.level === "old") && (
        <div className={`my-freshness-warning level-${freshness.level}`}>
          <strong>데이터가 {freshness.days}일 지났어요</strong>
          <p>업소 정보가 바뀌었을 수 있어요. 방문 전 확인해보세요.</p>
        </div>
      )}

      <button className="my-action" type="button" onClick={onLocate}>
        <LocateFixed size={18} />
        위치 다시 확인
      </button>
    </section>
  );
}
