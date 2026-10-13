import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, MapPin } from "lucide-react";
import { api } from "../lib/api";
import { isRecentlyListed } from "../lib/isNew";
import { formatLocation } from "../lib/locations";
import { fadeUp } from "../lib/motion";

// A true, seamless, low-speed infinite marquee - not a step-by-step
// carousel. The track below renders the property list twice back-to-back
// and animates a linear -50% translateX in CSS (see .marquee-track in
// index.css), so it loops without ever resetting or stuttering, and pauses
// instantly on hover via `animation-play-state: paused`.
//
// Data is real: pulls from the properties API rather than a hardcoded
// array, so this section updates on its own as properties are added -
// admin-marked "featured" ones first, falling back to the newest listings.
//
// It owns its whole section (heading included). With no listings yet it shows
// a short invitation to list the first one instead of vanishing - so an empty
// marketplace looks intentional, not broken. If the listings can't be loaded
// at all (server down), it stays hidden rather than claim there are none.
export default function FeaturedPropertiesCarousel() {
  const [properties, setProperties] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        let rows = await api.getProperties({ featured: true, limit: 10 });
        if (!rows.length) {
          rows = await api.getProperties({ sort: "newest", limit: 10 });
        }
        if (!cancelled) {
          setProperties(rows);
          setLoaded(true);
        }
      } catch {
        // Non-fatal - the section just stays hidden if properties can't load.
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loaded) return null;

  if (!properties.length) {
    return (
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-4xl font-extrabold text-ink-900">Featured Properties</h2>
          <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12">
            <MapPin className="mx-auto h-9 w-9 text-brand-400" />
            <p className="mt-4 text-lg font-bold text-ink-900">No properties listed yet</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              New houses, land plots and developments appear here as soon as they're approved. Have one to sell?
              Be the first to list it.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                to="/list-property"
                className="rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
              >
                List a property
              </Link>
              <Link to="/marketplace" className="rounded-lg border border-slate-300 px-6 py-2.5 text-sm font-semibold text-ink-900 hover:bg-white">
                Browse the marketplace
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Slower for a longer track so the perceived speed (px/sec) stays
  // roughly constant regardless of how many properties are featured.
  const durationSeconds = Math.max(properties.length * 6, 24);

  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-6 text-center">
        <motion.h2
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
          variants={fadeUp}
          className="text-4xl font-extrabold text-ink-900"
        >
          Featured Properties
        </motion.h2>
        <motion.p
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
          variants={fadeUp}
          className="mx-auto mt-4 max-w-2xl text-slate-500"
        >
          A selection of properties across Rwanda.
        </motion.p>
      </div>

      <div className="mt-12 overflow-hidden">
        <div className="marquee-track flex w-max gap-6 px-6" style={{ "--marquee-duration": `${durationSeconds}s` }}>
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
                  {formatLocation(p) && <span> · {formatLocation(p)}</span>}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-4 text-center">
        <Link to="/marketplace" className="inline-flex items-center gap-2 font-semibold text-brand-500 hover:underline">
          Browse all properties <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
