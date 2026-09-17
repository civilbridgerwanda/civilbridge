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

// Matches the shape of the real AI Studio page (header bar, chat panel,
// history sidebar) so there's no blank/white gap between the route-level
// Suspense fallback and the page's own content finishing its first render.
export function AIStudioSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <SkeletonLine className="h-9 w-9 rounded-lg" />
          <div>
            <SkeletonLine className="h-4 w-24" />
            <SkeletonLine className="mt-2 h-3 w-32" />
          </div>
        </div>
        <SkeletonLine className="h-9 w-28 rounded-lg" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="h-[55vh] min-h-[360px] rounded-2xl border border-slate-200 bg-white p-6">
          <SkeletonLine className="h-4 w-2/3" />
          <SkeletonLine className="mt-4 h-4 w-1/2" />
        </div>
        <div className="h-fit rounded-2xl border border-slate-200 bg-white p-5">
          <SkeletonLine className="h-4 w-16" />
          <SkeletonLine className="mt-4 h-9 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
