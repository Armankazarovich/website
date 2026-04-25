/**
 * Skeleton-загрузчики кабинета.
 * Используются вместо spinner Loader2 — выглядят профессиональнее, держат layout.
 *
 * Дизайн-система: animate-pulse + bg-muted на формы которые повторяют реальный контент.
 * См. DESIGN_SYSTEM.md → 2.10.
 */

export function SkeletonRow() {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-muted shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 rounded bg-muted w-3/4" />
          <div className="h-3 rounded bg-muted w-1/2" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="aspect-square rounded-xl bg-muted" />
      ))}
    </div>
  );
}

export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid gap-2 animate-pulse ${count === 3 ? "grid-cols-3" : "grid-cols-4"}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-card border border-border rounded-2xl p-3 sm:p-4 text-center">
          <div className="w-4 h-4 rounded bg-muted mx-auto mb-2" />
          <div className="h-5 rounded bg-muted mx-auto mb-1.5 w-1/2" />
          <div className="h-2.5 rounded bg-muted mx-auto w-3/4" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonHeader() {
  return (
    <div className="space-y-1 animate-pulse">
      <div className="h-6 rounded bg-muted w-1/3" />
      <div className="h-3 rounded bg-muted w-1/2" />
    </div>
  );
}
