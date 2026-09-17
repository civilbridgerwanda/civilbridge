import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, MapPin, ArrowRight, SlidersHorizontal } from "lucide-react";
import { api } from "../lib/api";
import { socket } from "../lib/socket";
import { fadeUp, stagger } from "../lib/motion";
import Seo from "../components/Seo";
import { SkeletonGrid, PropertyCardSkeleton } from "../components/Skeleton";
import { RWANDA_LOCATIONS } from "../lib/locations";

const categories = [
  { value: "all", label: "All Properties" },
  { value: "house", label: "Houses" },
  { value: "land", label: "Land" },
  { value: "commercial", label: "Commercial" },
  { value: "apartment", label: "Apartments" },
];

const sortOptions = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
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

const bathroomOptions = [
  { value: "any", label: "Any" },
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4+", label: "4+" },
];

const PAGE_SIZE = 6;

function badgeLabel(type) {
  if (type === "land") return "Land";
  if (type === "commercial") return "Commercial";
  return "For Sale";
}

function metaLine(p) {
  if (p.property_type === "land") {
    const acres = p.size_sqm ? (Number(p.size_sqm) / 4046.86).toFixed(1) : null;
    return acres ? `${acres} acres` : null;
  }
  if (p.property_type === "commercial") {
    return p.size_sqm ? `${Number(p.size_sqm).toLocaleString()} sqm` : null;
  }
  const parts = [];
  if (p.bedrooms) parts.push(`${p.bedrooms} Beds`);
  if (p.bathrooms) parts.push(`${p.bathrooms} Baths`);
  if (p.size_sqm) parts.push(`${Number(p.size_sqm).toLocaleString()} sqm`);
  return parts.join(" \u00B7 ");
}

export default function Marketplace() {
  const [searchParams] = useSearchParams();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [justAdded, setJustAdded] = useState(null);

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get("search") || "");
  const [activeType, setActiveType] = useState("all");
  const [city, setCity] = useState("all");
  const [priceRange, setPriceRange] = useState("");
  const [bedrooms, setBedrooms] = useState("any");
  const [bathrooms, setBathrooms] = useState("any");
  const [sizeMin, setSizeMin] = useState("");
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [sort, setSort] = useState("featured");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Debounce the search box so we're not hitting the API on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Re-fetch from the backend whenever a filter changes.
  useEffect(() => {
    const [price_min, price_max] = priceRange ? priceRange.split("-") : [undefined, undefined];

    setLoading(true);
    setError(null);
    api
      .getProperties({
        type: activeType,
        city,
        bedrooms,
        bathrooms,
        size_min: sizeMin || undefined,
        price_min: price_min || undefined,
        price_max: price_max || undefined,
        search: debouncedSearch || undefined,
        sort: sort === "featured" ? undefined : sort,
      })
      .then((data) => {
        setProperties(data);
        setVisibleCount(PAGE_SIZE);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [activeType, city, priceRange, bedrooms, bathrooms, sizeMin, debouncedSearch, sort]);

  // Live updates: a newly created property slides in immediately if it
  // matches the current filters - no refresh, no re-fetch.
  useEffect(() => {
    function handleCreated(property) {
      const matchesType = activeType === "all" || property.property_type === activeType;
      if (!matchesType) return;
      setProperties((prev) => [property, ...prev]);
      setJustAdded(property.id);
      setTimeout(() => setJustAdded(null), 3000);
    }

    socket.on("property:created", handleCreated);
    return () => socket.off("property:created", handleCreated);
  }, [activeType]);

  const visibleProperties = useMemo(
    () => properties.slice(0, visibleCount),
    [properties, visibleCount]
  );

  return (
    <>
      <Seo
        title="Marketplace"
        description="Browse verified houses, commercial properties, and land plots for sale across Rwanda on CivilBridge."
        path="/marketplace"
      />

      {/* Hero */}
      <section className="bg-gradient-to-r from-brand-700 to-brand-400 py-16 text-white">
        <div className="mx-auto max-w-7xl px-6">
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl font-extrabold md:text-5xl"
          >
            Property Marketplace
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-3 max-w-xl text-brand-50"
          >
            Discover properties and land across Rwanda. Find your perfect investment or
            dream home.
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
            placeholder="Search properties by location, type, or price..."
            className="w-full rounded-xl border border-slate-300 py-3.5 pl-12 pr-4 text-sm shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>

        {/* Category pills */}
        <div className="mt-6 flex flex-wrap gap-3">
          {categories.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setActiveType(cat.value)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200 ease-[cubic-bezier(.22,.61,.36,1)] ${
                activeType === cat.value
                  ? "bg-brand-500 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Filter dropdowns */}
        <div className="mt-4 flex flex-wrap gap-3">
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
                : "border-slate-300 text-ink-900 hover:bg-slate-50"
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
                {bathroomOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
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
            {loading ? "Searching…" : `${properties.length} ${properties.length === 1 ? "property" : "properties"} found`}
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
            count={6}
            className="mt-8 grid gap-6 md:grid-cols-3"
          />
        )}

        {!loading && (
          <motion.div
            initial="hidden"
            animate="show"
            variants={stagger}
            className="mt-8 grid gap-6 md:grid-cols-3"
          >
            {visibleProperties.map((p) => (
              <motion.div
                key={p.id}
                variants={fadeUp}
                whileHover={{ y: -4, transition: { duration: 0.3, ease: [0.22, 0.61, 0.36, 1] } }}
                className={`overflow-hidden rounded-2xl border bg-white transition-shadow duration-300 ease-[cubic-bezier(.22,.61,.36,1)] hover:shadow-lg ${
                  justAdded === p.id ? "border-brand-500 ring-2 ring-brand-200" : "border-slate-200"
                }`}
              >
                <Link to={`/marketplace/${p.id}`} className="block">
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
                        <MapPin className="h-10 w-10" />
                      </div>
                    )}
                    <span className="absolute right-3 top-3 rounded-full bg-brand-500 px-3 py-1 text-xs font-semibold text-white">
                      {badgeLabel(p.property_type)}
                    </span>
                  </div>

                  <div className="p-5">
                    <h3 className="text-lg font-bold text-ink-900">{p.title}</h3>
                    {(p.city || p.district) && (
                      <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                        <MapPin className="h-4 w-4" />
                        {p.city}
                        {p.district ? `, ${p.district}` : ""}
                      </p>
                    )}
                    {metaLine(p) && <p className="mt-2 text-sm text-slate-500">{metaLine(p)}</p>}
                    <p className="mt-3 text-xl font-bold text-brand-500">
                      {p.currency} {Number(p.price).toLocaleString()}
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}

        {!loading && !properties.length && (
          <p className="mt-10 text-center text-slate-500">
            No properties match your filters. Try a different search or category.
          </p>
        )}

        {!loading && visibleCount < properties.length && (
          <div className="mt-10 text-center">
            <button
              type="button"
              onClick={() => setVisibleCount((c) => c + 3)}
              className="rounded-lg bg-brand-500 px-8 py-3 font-semibold text-white transition-colors duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:bg-brand-600"
            >
              Load More
            </button>
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-brand-700 to-brand-400 py-16 text-center text-white">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-3xl font-extrabold md:text-4xl">Ready to List Your Property?</h2>
          <p className="mt-3 text-brand-50">
            Reach thousands of potential buyers and investors on CivilBridge.
          </p>
          <Link
            to="/list-property"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 font-semibold text-brand-600 transition-colors duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:bg-brand-50"
          >
            List Property <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
