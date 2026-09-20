import { useState } from "react";
import { Star } from "lucide-react";

// Read-only display mode (the default) - used anywhere a rating is just
// being shown (detail pages, cards). Pass `interactive` + `onChange` to let
// the person pick a rating, for the review form. `showValue` prints the
// locked-in numeric score (e.g. "4/5") next to the stars once one is
// picked - only meaningful in interactive mode.
export default function StarRating({ value, onChange, interactive = false, size = "h-4 w-4", showValue = false }) {
  const [hovered, setHovered] = useState(0);
  const display = interactive && hovered ? hovered : Math.round(Number(value) || 0);

  return (
    <div className="flex items-center gap-2">
      <div className={`flex text-gold-400 ${interactive ? "cursor-pointer" : ""}`}>
        {Array.from({ length: 5 }).map((_, i) => {
          const starValue = i + 1;
          return (
            <Star
              key={i}
              className={`${size} transition-transform duration-150 ${interactive && hovered === starValue ? "scale-110" : ""}`}
              fill={starValue <= display ? "currentColor" : "none"}
              strokeWidth={1.5}
              onClick={interactive ? () => onChange(starValue) : undefined}
              onMouseEnter={interactive ? () => setHovered(starValue) : undefined}
              onMouseLeave={interactive ? () => setHovered(0) : undefined}
            />
          );
        })}
      </div>
      {interactive && showValue && Number(value) > 0 && (
        <span className="text-sm font-semibold text-ink-900">{Math.round(Number(value))}/5</span>
      )}
    </div>
  );
}
