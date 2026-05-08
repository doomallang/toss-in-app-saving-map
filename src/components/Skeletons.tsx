export function StoreCardSkeleton() {
  return (
    <div className="store-card-skeleton" aria-hidden="true">
      <div className="skeleton sk-logo" />
      <div className="sk-lines">
        <div className="skeleton sk-line w-half" />
        <div className="skeleton sk-line w-full" />
        <div className="skeleton sk-line w-three" />
        <div className="skeleton sk-line w-half" />
      </div>
      <div className="sk-actions">
        <div className="skeleton sk-btn" />
        <div className="skeleton sk-btn" />
      </div>
    </div>
  );
}

export function StoreListSkeleton() {
  return (
    <section className="store-list" aria-label="불러오는 중" aria-busy="true">
      <div className="section-title">
        <div
          className="skeleton"
          style={{ width: 100, height: 18, borderRadius: 6 }}
        />
      </div>
      {Array.from({ length: 6 }, (_, i) => (
        <StoreCardSkeleton key={i} />
      ))}
    </section>
  );
}
