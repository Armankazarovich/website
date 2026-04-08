export default function ProductLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Gallery skeleton */}
        <div className="space-y-3">
          <div className="aspect-[3/4] bg-muted animate-pulse rounded-2xl" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-16 h-16 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        </div>

        {/* Info skeleton */}
        <div className="space-y-4">
          <div className="h-4 w-24 bg-muted animate-pulse rounded-lg" />
          <div className="h-8 w-3/4 bg-muted animate-pulse rounded-xl" />
          <div className="h-4 w-full bg-muted animate-pulse rounded-lg" />
          <div className="h-4 w-2/3 bg-muted animate-pulse rounded-lg" />
          <div className="h-10 w-1/2 bg-muted animate-pulse rounded-xl mt-4" />
          <div className="h-12 bg-muted animate-pulse rounded-2xl mt-2" />
          <div className="h-12 bg-muted animate-pulse rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
