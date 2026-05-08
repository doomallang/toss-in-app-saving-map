import { LocateFixed } from "lucide-react";

export default function MyPanel({
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
