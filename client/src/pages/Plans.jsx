import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Star, MapPin, SlidersHorizontal, ArrowRight } from "lucide-react";
import { api } from "../lib/api";
import Seo from "../components/Seo";
import { SkeletonGrid, PropertyCardSkeleton } from "../components/Skeleton";
import { fadeUp, stagger } from "../lib/motion";
import { RWANDA_LOCATIONS } from "../lib/locations";
import { useAuth } from "../lib/AuthContext";
import AuthGate from "../components/AuthGate";
import { isAuthGateDismissed, dismissAuthGate } from "../lib/authGate";
import { getPlanBadge } from "../lib/isNew";

const pills = [
  { value: "all", label: "All Plans" },
  { value: "newly_listed", label: "Newly Listed" },
  { value: "best_value", label: "Best Value" },
  { value: "prime_locations", label: "Prime Locations" },
];

const typeOptions = [
  { value: "all", label: "Any type" },
  { value: "house", label: "House" },
  { value: "apartment", label: "Apartment" },
  { value: "land", label: "Land" },
  { value: "commercial", label: "Commercial" },
];

const priceOptions = [
  { value: "", label: "Any price" },
  { value: "0-50000000", label: "Under RWF 50M" },
  { value: "50000000-100000000", label: "RWF 50M - 100M" },
  { value: "100000000-200000000", label: "RWF 100M - 200M" },
  { value: "200000000-", label: "RWF 200M+" },
];

const bedroomOptions = [
  { value: "any", label: "Any" },
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
  { value: "5+", label: "5+" },
];

const sortOptions = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "rating", label: "Highest Rated" },
];

const PAGE_SIZE = 5;

function badgeStyle(badge) {
  if (badge === "new") return "bg-brand-500";
  if (badge === "hot") return "bg-orange-500";
  return null;
}

export default function Plans() {
  const { user, loading: authLoading } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAuthGate, setShowAuthGate] = useState(false);

  useEffect(() => {
    if (!authLoading && !user && !isAuthGateDismissed()) setShowAuthGate(true);
  }, [authLoading, user]);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activePill, setActivePill] = useState("all");
  const [type, setType] = useState("all");
  const [city, setCity] = useState("all");
  const [priceRange, setPriceRange] = useState("");
  const [bedrooms, setBedrooms] = useState("any");
  const [bathrooms, setBathrooms] = useState("any");
  const [sizeMin, setSizeMin] = useState("");
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [sort, setSort] = useState("featured");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const [price_min, price_max] = priceRange ? priceRange.split("-") : [undefined, undefined];

    setLoading(true);
    setError(null);
    api
      .getPlans({
        pill: activePill === "all" ? undefined : activePill,
        type,
        city,
        bedrooms,
        bathrooms,
        size_min: sizeMin || undefined,
        price_min: price_min || undefined,
        price_max: price_max || undefined,
        search: debouncedSearch || undefined,
        sort,
      })
      .then((data) => {
        setPlans(data);
        setVisibleCount(PAGE_SIZE);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [activePill, type, city, priceRange, bedrooms, bathrooms, sizeMin, debouncedSearch, sort]);

  const visiblePlans = useMemo(() => plans.slice(0, visibleCount), [plans, visibleCount]);

  return (
    <div className="relative">
      {showAuthGate && (
        <AuthGate
          variant="soft"
          from="/plans"
          title="Sign in for the full experience"
          message="Browsing is always free. Sign in to open a plan's full details, drawings, and media."
          onDismiss={() => {
            dismissAuthGate();
            setShowAuthGate(false);
          }}
        />
      )}
      <Seo
        title="Architectural Building Plans"
        description="Review professionally designed architectural building plans across Rwanda, complete with drawings and structural details, or generate a custom plan with AI."
        path="/plans"
      />

      {/* Hero */}
      <section className="bg-gradient-to-r from-ink-900 to-brand-700 py-16 text-white">
        <div className="mx-auto max-w-7xl px-6">
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl font-extrabold md:text-5xl"
          >
            Architectural Building Plans
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-3 max-w-xl text-brand-100"
          >
            Review ready-made architectural plans - drawings, renders, and structural
            details - and find your perfect design, or generate a custom plan with AI.
          </motion.p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by location, type, or features..."
            className="w-full rounded-xl border border-slate-300 py-3.5 pl-12 pr-4 text-sm shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>

        {/* Curated pills */}
        <div className="mt-6 flex flex-wrap gap-3">
          {pills.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setActivePill(p.value)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200 ease-[cubic-bezier(.22,.61,.36,1)] ${
                activePill === p.value
                  ? "bg-brand-500 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Filter dropdowns */}
        <div className="mt-4 flex flex-wrap gap-3">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-ink-900 focus:border-brand-400 focus:outline-none"
          >
            {typeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label === "Any type" ? "Property Type" : opt.label}
              </option>
            ))}
          </select>

          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-ink-900 focus:border-brand-400 focus:outline-none"
          >
            <option value="all">Location</option>
            {RWANDA_LOCATIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={priceRange}
            onChange={(e) => setPriceRange(e.target.value)}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-ink-900 focus:border-brand-400 focus:outline-none"
          >
            {priceOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.value === "" ? "Price Range" : opt.label}
              </option>
            ))}
          </select>

          <select
            value={bedrooms}
            onChange={(e) => setBedrooms(e.target.value)}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-ink-900 focus:border-brand-400 focus:outline-none"
          >
            <option value="any">Bedrooms</option>
            {bedroomOptions.slice(1).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} bed{opt.value !== "1" ? "s" : ""}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setShowMoreFilters((v) => !v)}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors duration-200 ease-[cubic-bezier(.22,.61,.36,1)] ${
              showMoreFilters
                ? "border-brand-500 bg-brand-50 text-brand-600"
                : "border-slate-300 bg-slate-50 text-ink-900 hover:bg-slate-100"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            More Filters
          </button>
        </div>

        {showMoreFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-4 flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
          >
            <label className="text-sm text-slate-600">
              <span className="mb-1 block font-semibold text-ink-900">Bathrooms</span>
              <select
                value={bathrooms}
                onChange={(e) => setBathrooms(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
              >
                <option value="any">Any</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4+">4+</option>
              </select>
            </label>

            <label className="text-sm text-slate-600">
              <span className="mb-1 block font-semibold text-ink-900">Min. Size (sqm)</span>
              <input
                type="number"
                min="0"
                placeholder="e.g. 150"
                value={sizeMin}
                onChange={(e) => setSizeMin(e.target.value)}
                className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
              />
            </label>

            {(bathrooms !== "any" || sizeMin) && (
              <button
                type="button"
                onClick={() => {
                  setBathrooms("any");
                  setSizeMin("");
                }}
                className="text-sm font-semibold text-brand-500 hover:underline"
              >
                Clear
              </button>
            )}
          </motion.div>
        )}

        {/* Results count + sort */}
        <div className="mt-6 flex items-center justify-between border-b border-slate-200 pb-4">
          <p className="text-sm text-slate-500">
            {loading
              ? "Searching…"
              : user?.role === "admin"
                ? `${plans.length} ${plans.length === 1 ? "plan" : "plans"} available`
                : "Showing results"}
          </p>
          <label className="flex items-center gap-2 text-sm text-slate-500">
            Sort by:
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-ink-900 focus:border-brand-400 focus:outline-none"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error && <p className="mt-6 text-red-600">{error}</p>}

        {loading && (
          <SkeletonGrid
            Card={PropertyCardSkeleton}
            count={5}
            className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-5"
          />
        )}

        {!loading && (
          <motion.div
            initial="hidden"
            animate="show"
            variants={stagger}
            className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-5"
          >
            {visiblePlans.map((p) => (
              <motion.div
                key={p.id}
                variants={fadeUp}
                whileHover={{ y: -4, transition: { duration: 0.3, ease: [0.22, 0.61, 0.36, 1] } }}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition-shadow duration-300 ease-[cubic-bezier(.22,.61,.36,1)] hover:shadow-lg"
              >
                <Link to={`/plans/${p.id}`} className="block">
                  <div className="relative" style={{ aspectRatio: "4 / 3" }}>
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.title}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-brand-50 text-brand-300">
                        <MapPin className="h-8 w-8" />
                      </div>
                    )}
                    {getPlanBadge(p) && (
                      <span
                        className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold capitalize text-white ${badgeStyle(getPlanBadge(p))}`}
                      >
                        {getPlanBadge(p)}
                      </span>
                    )}
                  </div>

                  <div className="p-4">
                    <h3 className="text-base font-bold leading-snug text-ink-900">{p.title}</h3>

                    <div className="mt-2 flex text-gold-400">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className="h-4 w-4"
                          fill={i < Math.round(Number(p.rating)) ? "currentColor" : "none"}
                          strokeWidth={1.5}
                        />
                      ))}
                    </div>

                    {p.city && <p className="mt-2 text-sm text-slate-500">{p.city}</p>}

                    <p className="mt-2 text-lg font-bold text-brand-500">
                      {p.currency} {Number(p.price).toLocaleString()}
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}

        {!loading && !plans.length && (
          <p className="mt-10 text-center text-slate-500">
            No plans match your filters — try widening your search.
          </p>
        )}

        {!loading && visibleCount < plans.length && (
          <div className="mt-10 text-center">
            <button
              type="button"
              onClick={() => setVisibleCount((c) => c + 5)}
              className="rounded-lg bg-brand-500 px-8 py-3 font-semibold text-white transition-[background-color,transform,box-shadow] duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-md active:translate-y-0"
            >
              Load More Plans
            </button>
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-brand-700 to-brand-400 py-16 text-center text-white">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-3xl font-extrabold md:text-4xl">Don't See What You're Looking For?</h2>
          <p className="mt-3 text-brand-50">
            Generate a custom plan using our AI-powered design tool, tailored to your
            budget and requirements.
          </p>
          <Link
            to="/ai-studio"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 font-semibold text-brand-600 transition-colors duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:bg-brand-50"
          >
            Create Custom Plan <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
