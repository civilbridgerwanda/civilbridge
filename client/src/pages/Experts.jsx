import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Star, Briefcase, BadgeCheck, ArrowRight, SlidersHorizontal } from "lucide-react";
import { api } from "../lib/api";
import Seo from "../components/Seo";
import { SkeletonGrid, ExpertCardSkeleton } from "../components/Skeleton";
import { fadeUp, stagger } from "../lib/motion";
import { RWANDA_LOCATIONS } from "../lib/locations";

const categories = [
  { value: "all", label: "All Experts" },
  { value: "engineer", label: "Engineers" },
  { value: "architect", label: "Architects" },
  { value: "contractor", label: "Contractors" },
  { value: "surveyor", label: "Surveyors" },
  { value: "interior_designer", label: "Interior Designers" },
];

const sortOptions = [
  { value: "rating", label: "Highest Rated" },
  { value: "reviews", label: "Most Reviewed" },
  { value: "experience", label: "Most Experienced" },
  { value: "projects", label: "Most Projects" },
];

const ratingOptions = [
  { value: "", label: "Any rating" },
  { value: "4.5", label: "4.5+ stars" },
  { value: "4", label: "4+ stars" },
  { value: "3.5", label: "3.5+ stars" },
];

const experienceOptions = [
  { value: "", label: "Any experience" },
  { value: "3", label: "3+ years" },
  { value: "5", label: "5+ years" },
  { value: "10", label: "10+ years" },
];

const PAGE_SIZE = 6;

function formatRating(rating) {
  const n = Number(rating);
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export default function Experts() {
  const [searchParams] = useSearchParams();
  const [experts, setExperts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get("search") || "");
  const [activeCategory, setActiveCategory] = useState("all");
  const [city, setCity] = useState("all");
  const [minRating, setMinRating] = useState("");
  const [minExperience, setMinExperience] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [sort, setSort] = useState("rating");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .getExperts({
        category: activeCategory,
        city,
        search: debouncedSearch || undefined,
        sort,
        min_rating: minRating || undefined,
        min_experience: minExperience || undefined,
        verified_only: verifiedOnly || undefined,
      })
      .then((data) => {
        setExperts(data);
        setVisibleCount(PAGE_SIZE);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [activeCategory, city, debouncedSearch, sort, minRating, minExperience, verifiedOnly]);

  const visibleExperts = useMemo(() => experts.slice(0, visibleCount), [experts, visibleCount]);
  const activeExtraFilters = minRating || minExperience || verifiedOnly;

  return (
    <>
      <Seo
        title="Experts"
        description="Find and connect with verified engineers, architects, and contractors across Rwanda on CivilBridge."
        path="/experts"
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
            Expert Directory
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-3 max-w-xl text-brand-100"
          >
            Connect with verified construction professionals across Rwanda. Engineers,
            architects, contractors, and more.
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
            placeholder="Search experts by name, profession, or specialization..."
            className="w-full rounded-xl border border-slate-300 py-3.5 pl-12 pr-4 text-sm shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>

        {/* Category pills */}
        <div className="mt-6 flex flex-wrap gap-3">
          {categories.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setActiveCategory(cat.value)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200 ease-[cubic-bezier(.22,.61,.36,1)] ${
                activeCategory === cat.value
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

          <button
            type="button"
            onClick={() => setShowMoreFilters((v) => !v)}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors duration-200 ease-[cubic-bezier(.22,.61,.36,1)] ${
              showMoreFilters || activeExtraFilters
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
              <span className="mb-1 block font-semibold text-ink-900">Minimum Rating</span>
              <select
                value={minRating}
                onChange={(e) => setMinRating(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
              >
                {ratingOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-slate-600">
              <span className="mb-1 block font-semibold text-ink-900">Experience</span>
              <select
                value={minExperience}
                onChange={(e) => setMinExperience(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
              >
                {experienceOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 pb-2 text-sm font-semibold text-ink-900">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
              />
              Verified only
            </label>

            {activeExtraFilters && (
              <button
                type="button"
                onClick={() => {
                  setMinRating("");
                  setMinExperience("");
                  setVerifiedOnly(false);
                }}
                className="pb-2 text-sm font-semibold text-brand-500 hover:underline"
              >
                Clear
              </button>
            )}
          </motion.div>
        )}

        {/* Results count + sort */}
        <div className="mt-6 flex items-center justify-between border-b border-slate-200 pb-4">
          <p className="text-sm text-slate-500">
            {loading ? "Searching…" : `${experts.length} verified ${experts.length === 1 ? "expert" : "experts"}`}
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
            Card={ExpertCardSkeleton}
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
            {visibleExperts.map((e) => (
              <motion.div
                key={e.id}
                variants={fadeUp}
                whileHover={{ y: -4, transition: { duration: 0.3, ease: [0.22, 0.61, 0.36, 1] } }}
                className="rounded-2xl border border-slate-200 p-6 shadow-sm transition-shadow duration-300 ease-[cubic-bezier(.22,.61,.36,1)] hover:shadow-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0">
                    {e.avatar_url ? (
                      <img
                        src={e.avatar_url}
                        alt={e.full_name}
                        loading="lazy"
                        decoding="async"
                        className="h-16 w-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-600">
                        {e.full_name?.[0]}
                      </div>
                    )}
                    {e.is_verified ? (
                      <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-white ring-2 ring-white">
                        <BadgeCheck className="h-4 w-4" />
                      </span>
                    ) : null}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-ink-900">{e.full_name}</h3>
                    <p className="text-sm text-brand-500">{e.specialty}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <div className="flex text-gold-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className="h-4 w-4"
                        fill={i < Math.round(Number(e.rating)) ? "currentColor" : "none"}
                        strokeWidth={1.5}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-semibold text-ink-900">{formatRating(e.rating)}</span>
                  <span className="text-sm text-tertiary">({e.review_count} reviews)</span>
                </div>

                {e.specialization && <p className="mt-3 text-sm text-slate-600">{e.specialization}</p>}

                <p className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                  <Briefcase className="h-4 w-4" />
                  {e.completed_projects} completed projects
                </p>

                <Link
                  to={`/experts/${e.id}`}
                  className="mt-5 block rounded-lg bg-brand-500 py-2.5 text-center font-semibold text-white transition-[background-color,transform,box-shadow] duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-md active:translate-y-0"
                >
                  View Profile
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}

        {!loading && !experts.length && (
          <p className="mt-10 text-center text-slate-500">
            No experts match your filters — try a different search or category.
          </p>
        )}

        {!loading && visibleCount < experts.length && (
          <div className="mt-10 text-center">
            <button
              type="button"
              onClick={() => setVisibleCount((c) => c + 3)}
              className="rounded-lg bg-brand-500 px-8 py-3 font-semibold text-white transition-[background-color,transform,box-shadow] duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-md active:translate-y-0"
            >
              Load More Experts
            </button>
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-brand-700 to-brand-400 py-16 text-center text-white">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-3xl font-extrabold md:text-4xl">Are You a Construction Professional?</h2>
          <p className="mt-3 text-brand-50">
            Join our network of verified experts and grow your business on CivilBridge.
          </p>
          <Link
            to="/join-as-expert"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 font-semibold text-brand-600 transition-colors duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:bg-brand-50"
          >
            Join as Expert <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
