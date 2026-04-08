export default function CatalogLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header skeleton */}
      <div className="mb-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded-xl mb-2" />
        <div className="h-4 w-32 bg-muted animate-pulse rounded-lg" />
      </div>

      {/* Filter bar skeleton */}
      <div className="flex gap-2 mb-6 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-9 w-20 bg-muted animate-pulse rounded-xl shrink-0" />
        ))}
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className="rounded-2xl overflow-hidden border border-border bg-card">
            <div
              className="bg-muted animate-pulse"
              style={{
                aspectRatio: "var(--photo-aspect, 3/4)",
                animationDelay: `${i * 40}ms`,
              }}
            />
            <div className="p-3 space-y-2">
              <div className="h-4 bg-muted animate-pulse rounded-lg w-3/4" style={{ animationDelay: `${i * 40}ms` }} />
              <div className="h-3 bg-muted animate-pulse rounded-lg w-1/2" style={{ animationDelay: `${i * 40}ms` }} />
              <div className="h-5 bg-muted animate-pulse rounded-lg w-2/3" style={{ animationDelay: `${i * 40}ms` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
