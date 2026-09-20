import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { api } from "../lib/api";
import { isRecentlyListed } from "../lib/isNew";

// A true, seamless, low-speed infinite marquee - not a step-by-step
// carousel. The track below renders the property list twice back-to-back
// and animates a linear -50% translateX in CSS (see .marquee-track in
// index.css), so it loops without ever resetting or stuttering, and pauses
// instantly on hover via `animation-play-state: paused`.
//
// Data is real: pulls from the properties API rather than a hardcoded
// array, so this section updates on its own as properties are added -
// admin-marked "featured" ones first, falling back to the newest listings
// so the section is never empty.
export default function FeaturedPropertiesCarousel() {
  const [properties, setProperties] = useState([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        let rows = await api.getProperties({ featured: true, limit: 10 });
        if (!rows.length) {
          rows = await api.getProperties({ sort: "newest", limit: 10 });
        }
        if (!cancelled) setProperties(rows);
      } catch {
        // Non-fatal - the section just stays empty if properties can't load.
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!properties.length) return null;

  // Slower for a longer track so the perceived speed (px/sec) stays
  // roughly constant regardless of how many properties are featured.
  const durationSeconds = Math.max(properties.length * 6, 24);

  return (
    <div className="mt-12 overflow-hidden">
      <div
        className="marquee-track flex w-max gap-6 px-6"
        style={{ "--marquee-duration": `${durationSeconds}s` }}
      >
        {[...properties, ...properties].map((p, i) => (
          <Link
            key={`${p.id}-${i}`}
            to={`/marketplace/${p.id}`}
            className="group relative h-72 w-72 shrink-0 overflow-hidden rounded-2xl shadow-md md:w-80"
          >
            {p.image_url ? (
              <img
                src={p.image_url}
                alt={p.title}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-300 ease-[cubic-bezier(.22,.61,.36,1)] group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-brand-50 text-brand-300">
                <MapPin className="h-12 w-12" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            {isRecentlyListed(p.created_at) && (
              <span className="absolute right-3 top-3 rounded-full bg-brand-500 px-2.5 py-1 text-xs font-semibold text-white">
                NEW
              </span>
            )}
            <div className="absolute bottom-4 left-4 right-4">
              <p className="text-lg font-bold text-white">{p.title}</p>
              <p className="mt-0.5 text-sm text-white/80">
                {p.currency} {Number(p.price).toLocaleString()}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
