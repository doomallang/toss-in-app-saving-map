import { Bookmark, Compass } from "lucide-react";

export function EmptySaved({
  totalSavedCount,
  onGoHome,
  onViewAll,
}: {
  totalSavedCount: number;
  onGoHome: () => void;
  onViewAll: () => void;
}) {
  if (totalSavedCount > 0) {
    return (
      <section className="empty-state">
        <Bookmark size={32} />
        <h2>이 지역엔 저장한 곳이 없어요</h2>
        <p>
          다른 지역에 저장한 절약처가{" "}
          <strong>{totalSavedCount}곳</strong> 있어요. 지역을 전국으로 바꾸면
          모두 볼 수 있어요.
        </p>
        <button type="button" onClick={onViewAll}>
          전국 저장 목록 보기
        </button>
      </section>
    );
  }

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

export function EmptyResults({
  hasQuery,
  hasFilter,
  onClearQuery,
  onResetFilters,
}: {
  hasQuery: boolean;
  hasFilter: boolean;
  onClearQuery: () => void;
  onResetFilters: () => void;
}) {
  return (
    <section className="empty-state">
      <Compass size={32} />
      <h2>조건에 맞는 절약처가 없어요</h2>
      <p>검색어나 필터를 바꿔서 다시 확인해보세요.</p>
      <div className="empty-actions">
        {hasQuery && (
          <button type="button" onClick={onClearQuery}>
            검색어 지우기
          </button>
        )}
        {hasFilter && (
          <button type="button" className="secondary" onClick={onResetFilters}>
            필터 초기화
          </button>
        )}
        {!hasQuery && !hasFilter && (
          <button type="button" onClick={onResetFilters}>
            전체 보기
          </button>
        )}
      </div>
    </section>
  );
}
