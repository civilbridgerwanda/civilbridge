// Reusable skeleton building blocks. Compose these into page-specific
// skeletons (see PropertyCardSkeleton / ExpertCardSkeleton below) so the
// loading state matches the shape of the real content instead of a blank
// spinner - it feels faster and avoids layout jump when data arrives.

export function SkeletonLine({ className = "" }) {
  return <div className={`animate-pulse rounded bg-slate-200 ${className}`} />;
}

export function PropertyCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <div className="animate-pulse bg-slate-200" style={{ aspectRatio: "4 / 3" }} />
      <div className="p-5">
        <SkeletonLine className="h-5 w-3/4" />
        <SkeletonLine className="mt-3 h-4 w-1/2" />
        <SkeletonLine className="mt-3 h-4 w-2/3" />
        <SkeletonLine className="mt-4 h-6 w-1/2" />
      </div>
    </div>
  );
}

export function ExpertCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 p-6">
      <SkeletonLine className="h-5 w-2/3" />
      <SkeletonLine className="mt-2 h-4 w-1/3" />
      <SkeletonLine className="mt-4 h-4 w-full" />
      <SkeletonLine className="mt-2 h-4 w-3/4" />
      <SkeletonLine className="mt-4 h-3 w-1/2" />
    </div>
  );
}

// Repeats a skeleton card N times inside a grid.
export function SkeletonGrid({ Card, count = 6, className = "" }) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} />
      ))}
    </div>
  );
}
