import { Star } from "lucide-react";
import StarRating from "./StarRating";

// The one way a rating is shown anywhere on the site.
//
// A rating only exists once there's at least one real review behind it. With
// none, this renders the (optional) `emptyLabel` in muted text - never empty
// stars, never "0", never a made-up score. The numbers come from the server's
// aggregate of verified reviews; nothing here computes or defaults one.
//
//   variant="stars"   ★★★★☆  4.6 (12 reviews)     - detail pages
//   variant="compact" ★ 4.6 (12)                    - cards and lists
export default function RatingBadge({
  rating,
  reviewCount,
  variant = "stars",
  emptyLabel = null,
  size = "h-4 w-4",
  tone = "dark", // "light" = white text, for use over dark photos
  className = "",
}) {
  const count = Number(reviewCount) || 0;
  const value = Number(rating);
  const strong = tone === "light" ? "text-white" : "text-ink-900";
  const muted = tone === "light" ? "text-white/70" : "text-slate-500";

  if (count < 1 || !Number.isFinite(value) || value <= 0) {
    return emptyLabel ? (
      <span className={`text-sm ${tone === "light" ? "text-white/60" : "text-slate-400"} ${className}`}>{emptyLabel}</span>
    ) : null;
  }

  const shown = value.toFixed(1);

  if (variant === "compact") {
    return (
      <span className={`inline-flex items-center gap-1 text-sm ${className}`}>
        <Star className="h-3.5 w-3.5 text-gold-400" fill="currentColor" strokeWidth={0} />
        <span className={`font-semibold ${strong}`}>{shown}</span>
        <span className={muted}>({count})</span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <StarRating value={value} size={size} />
      <span className={`text-sm font-semibold ${strong}`}>{shown}</span>
      <span className={`text-sm ${muted}`}>
        ({count} review{count === 1 ? "" : "s"})
      </span>
    </span>
  );
}
