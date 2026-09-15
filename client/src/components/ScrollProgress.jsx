import { useScrollProgress } from "../lib/useScrollProgress";

// A thin bar sticking to the bottom edge of the navbar that fills up as
// the user scrolls down the page - a quick visual cue for "how much is
// left" on long pages.
export default function ScrollProgress() {
  const progress = useScrollProgress();

  return (
    <div className="h-1 w-full bg-slate-100">
      <div
        className="h-full bg-brand-500 transition-[width] duration-150 ease-out"
        style={{ width: `${progress}%` }}
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Page scroll progress"
      />
    </div>
  );
}
