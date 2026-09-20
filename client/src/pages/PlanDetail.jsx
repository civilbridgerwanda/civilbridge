import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  MapPin,
  Ruler,
  BedDouble,
  Bath,
  Eye,
  FileText,
  ArrowLeft,
  Loader2,
  Download,
  ShieldCheck,
  BadgeCheck,
} from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import Seo from "../components/Seo";
import PlanInquiryModal from "../components/PlanInquiryModal";
import PlanUnlockModal from "../components/PlanUnlockModal";
import ImageGallery from "../components/ImageGallery";
import SpecTable from "../components/SpecTable";
import StarRating from "../components/StarRating";
import ReviewSection from "../components/ReviewSection";
import PremiumBlur from "../components/PremiumBlur";
import OptionSelector from "../components/OptionSelector";
import { getPlanBadge } from "../lib/isNew";

function badgeStyle(badge) {
  if (badge === "new") return "bg-brand-500";
  if (badge === "hot") return "bg-orange-500";
  return null;
}

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "structural", label: "Structural & Engineering" },
  { key: "compliance", label: "Compliance & Zoning" },
  { key: "boq", label: "Bill of Quantities" },
  { key: "reviews", label: "Reviews" },
];

// A real pre-sale question (orientation affects sun exposure, drainage, and
// sometimes foundation engineering) - included with an inquiry below, not
// just decorative.
const LOT_ORIENTATION_OPTIONS = [
  "Standard Flat Terrain / North Facing",
  "Sloped Gradient / South Facing",
  "Corner Lot Optimization",
];

// Free preview photos before the gallery gates the rest behind the paid
// unlock - matches the same "presentation-only paywall, admin bypasses"
// convention PremiumBlur already uses for the Bill of Quantities tab, so
// the two gates behave consistently across the page.
const FREE_IMAGE_PREVIEW_COUNT = 2;

export default function PlanDetail() {
  const { id } = useParams();
  const { user, token } = useAuth();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inquiryMode, setInquiryMode] = useState(null); // "expert" | null
  const [showUnlock, setShowUnlock] = useState(false);
  const [lotOrientation, setLotOrientation] = useState(LOT_ORIENTATION_OPTIONS[0]);
  const [similar, setSimilar] = useState([]);
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .getPlan(id, token)
      .then(setPlan)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, token]);

  // Similar plans: same type + city first; widen to just the same type if
  // that's too thin.
  useEffect(() => {
    if (!plan) return;
    let cancelled = false;

    async function loadSimilar() {
      try {
        let results = await api.getPlans({ type: plan.plan_type, city: plan.city });
        results = results.filter((p) => p.id !== plan.id);
        if (results.length < 3) {
          const broader = await api.getPlans({ type: plan.plan_type });
          const seen = new Set(results.map((p) => p.id));
          for (const p of broader) {
            if (p.id !== plan.id && !seen.has(p.id)) {
              results.push(p);
              seen.add(p.id);
            }
          }
        }
        if (!cancelled) setSimilar(results.slice(0, 3));
      } catch {
        // Non-fatal - the detail page still works without recommendations.
      }
    }

    loadSimilar();
    return () => {
      cancelled = true;
    };
  }, [plan]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="text-2xl font-bold text-ink-900">Plan not found</h1>
        <p className="mt-2 text-slate-500">{error || "This plan may have been removed."}</p>
        <Link to="/plans" className="mt-6 inline-block font-semibold text-brand-500 hover:underline">
          ← Back to Plans
        </Link>
      </div>
    );
  }

  const referenceCode = `PL-${plan.id.slice(0, 6).toUpperCase()}`;
  const images = plan.images?.length ? plan.images : plan.image_url ? [plan.image_url] : [];
  const isAdmin = user?.role === "admin";
  const lockedFrom = !isAdmin && images.length > FREE_IMAGE_PREVIEW_COUNT ? FREE_IMAGE_PREVIEW_COUNT : null;

  return (
    <>
      <Seo
        title={plan.title}
        description={`${plan.title}${plan.city ? ` in ${plan.city}` : ""} - CivilBridge building plan.`}
        path={`/plans/${plan.id}`}
      />

      {/* Immersive full-width hero - flush against the navbar, no dead
          space above it. The back-control floats transparently over the
          photo (top-left); extra photos beyond the free preview count
          render locked in the right-edge thumbnail rail and open the
          unlock modal instead of switching the canvas. */}
      <div className="relative w-full px-4 sm:px-6">
        <Link
          to="/plans"
          className="absolute left-4 top-4 z-30 inline-flex items-center gap-2 rounded-full bg-black/30 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-colors duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:bg-black/45 sm:left-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Plans
        </Link>
        <ImageGallery
          images={images}
          videoUrl={plan.video_url}
          alt={plan.title}
          layout="hero"
          lockedFrom={lockedFrom}
          onLockedClick={() => setShowUnlock(true)}
          badge={
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-900 via-ink-900/70 to-transparent px-6 pb-6 pt-24 pr-28 sm:px-10 sm:pb-8 sm:pr-32">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold text-white">
                  ID: {referenceCode}
                </span>
                <span className="rounded-full bg-gold-400 px-2.5 py-1 text-xs font-bold text-ink-900 capitalize">
                  {plan.plan_type} Plan
                </span>
                {plan.is_prime_location && (
                  <span className="rounded-full bg-amber-400/20 px-2.5 py-1 text-xs font-semibold text-amber-300">
                    Prime Location
                  </span>
                )}
                {getPlanBadge(plan) && (
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize text-white ${badgeStyle(getPlanBadge(plan))}`}>
                    {getPlanBadge(plan)}
                  </span>
                )}
              </div>
              <h1 className="mt-3 max-w-2xl text-2xl font-extrabold text-white sm:text-4xl">{plan.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-white/80">
                {plan.city && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" /> {plan.city}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <StarRating value={plan.rating} />
                  {plan.review_count > 0 ? `(${plan.review_count})` : "No reviews yet"}
                </span>
                <span className="flex items-center gap-1 text-white/60">
                  <Eye className="h-3.5 w-3.5" /> {plan.view_count} views
                </span>
              </div>
            </div>
          }
        />
      </div>

      <div className="mx-auto max-w-6xl px-6">
        <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-start">
          <div>
            <div className="flex flex-wrap gap-6 border-y border-slate-200 py-5 text-sm text-slate-600">
              {plan.bedrooms ? (
                <span className="flex items-center gap-2">
                  <BedDouble className="h-4 w-4 text-brand-500" /> {plan.bedrooms} Beds
                </span>
              ) : null}
              {plan.bathrooms ? (
                <span className="flex items-center gap-2">
                  <Bath className="h-4 w-4 text-brand-500" /> {plan.bathrooms} Baths
                </span>
              ) : null}
              {plan.size_sqm ? (
                <span className="flex items-center gap-2">
                  <Ruler className="h-4 w-4 text-brand-500" /> {Number(plan.size_sqm).toLocaleString()} sqm
                </span>
              ) : null}
            </div>

            <div className="mt-6 flex gap-6 overflow-x-auto border-b border-slate-200">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`-mb-px shrink-0 border-b-2 pb-3 text-sm font-semibold transition-colors ${
                    tab === t.key ? "border-brand-500 text-brand-600" : "border-transparent text-slate-500 hover:text-ink-900"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="mt-5">
              {tab === "overview" && (
                <div className="space-y-5">
                  <p className="whitespace-pre-line text-slate-600">
                    This {plan.plan_type} plan is ready for review. Talk to an expert below for the
                    full design brief, or get a cost estimate tailored to this layout.
                  </p>
                  <SpecTable
                    rows={[
                      { label: "Plan Type", value: plan.plan_type },
                      { label: "Bedrooms", value: plan.bedrooms },
                      { label: "Bathrooms", value: plan.bathrooms },
                      { label: "Size", value: plan.size_sqm ? `${Number(plan.size_sqm).toLocaleString()} sqm` : null },
                      { label: "City", value: plan.city },
                      { label: "Prime Location", value: plan.is_prime_location ? "Yes" : null },
                    ]}
                  />
                  {plan.document_url && (
                    <div>
                      <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink-900">
                        <FileText className="h-4 w-4 text-brand-500" /> Drawing Document Preview
                      </p>
                      <iframe
                        src={plan.document_url}
                        title="Plan document preview"
                        className="h-[420px] w-full rounded-xl border border-slate-200"
                      />
                    </div>
                  )}
                </div>
              )}

              {tab === "structural" && (
                <SpecTable
                  rows={[
                    { label: "Foundation Type", value: "Reinforced concrete slab" },
                    { label: "Wall Materials", value: "Eco-brick / insulated concrete forms" },
                    { label: "Roofing Specs", value: "Galvanized standing seam steel" },
                    { label: "Electrical Load", value: "Three-phase 100A baseline" },
                    { label: "HVAC", value: "Natural ventilation with optional split-unit provisioning" },
                  ]}
                />
              )}

              {tab === "compliance" && (
                <SpecTable
                  rows={[
                    { label: "Structural Setbacks", value: "Per local municipal zoning guidelines" },
                    { label: "Building Height", value: "Within standard residential/commercial thresholds" },
                    { label: "Environmental Approval", value: "Required before groundbreaking" },
                    { label: "Wastewater Disposal", value: "Connects to municipal sewage or septic system" },
                  ]}
                />
              )}

              {tab === "boq" && (
                <PremiumBlur title="Full Bill of Quantities Locked">
                  <SpecTable
                    rows={[
                      { label: "Concrete Volume", value: "Estimated cubic meters" },
                      { label: "Structural Steel", value: "Estimated weight" },
                      { label: "Finish Grade", value: "Recommended materials" },
                      { label: "Format", value: "Zipped file, ready for execution" },
                    ]}
                  />
                </PremiumBlur>
              )}

              {tab === "reviews" && (
                <ReviewSection
                  id={plan.id}
                  getReviews={api.getPlanReviews}
                  submitReview={api.submitPlanReview}
                  onSubmitted={() => api.getPlan(id, token).then(setPlan).catch(() => {})}
                />
              )}
            </div>
          </div>

          {/* Sidebar - simplified for Plans: no tour button, just price,
              the download/unlock CTA, and Talk to an Expert. */}
          <div className="space-y-5 lg:sticky lg:top-24">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase text-slate-400">Starting Construction Estimate</p>
              <p className="text-2xl font-extrabold text-brand-500">
                {plan.currency} {Number(plan.price).toLocaleString()}
              </p>
              {plan.license_price && (
                <>
                  <p className="mt-3 text-xs font-semibold uppercase text-slate-400">Blueprint License</p>
                  <p className="text-lg font-bold text-ink-900">
                    {plan.currency} {Number(plan.license_price).toLocaleString()}
                  </p>
                </>
              )}

              <div className="mt-5 border-t border-slate-100 pt-5">
                <OptionSelector
                  label="Lot Orientation / Foundation Style"
                  options={LOT_ORIENTATION_OPTIONS}
                  value={lotOrientation}
                  onChange={setLotOrientation}
                />
                <p className="mt-1.5 text-xs text-slate-400">
                  Tell us your land's orientation - it's included when you contact us below.
                </p>
              </div>

              {isAdmin ? (
                <>
                  <div className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 py-2.5 text-center text-sm font-semibold text-emerald-700">
                    <ShieldCheck className="h-4 w-4" /> Full Access (Admin)
                  </div>
                  {plan.zip_url ? (
                    <a
                      href={plan.zip_url}
                      download
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-ink-900 py-2.5 text-center text-sm font-semibold text-white transition-[background-color,transform,box-shadow] duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:-translate-y-0.5 hover:bg-black hover:shadow-md active:translate-y-0"
                    >
                      <Download className="h-4 w-4" /> Download Everything
                    </a>
                  ) : (
                    <p className="mt-3 text-center text-xs text-slate-400">No deliverable ZIP uploaded for this plan yet.</p>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowUnlock(true)}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-ink-900 py-2.5 text-center text-sm font-semibold text-white transition-[background-color,transform,box-shadow] duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:-translate-y-0.5 hover:bg-black hover:shadow-md active:translate-y-0"
                >
                  <Download className="h-4 w-4" /> Download Everything
                </button>
              )}

              <button
                type="button"
                onClick={() => setInquiryMode("expert")}
                className="mt-2 block w-full rounded-lg border border-slate-300 bg-slate-50 py-2.5 text-center text-sm font-semibold text-ink-900 transition-colors duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:bg-slate-100"
              >
                Talk to an Expert
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-500">
                  <ShieldCheck className="h-4.5 w-4.5" />
                </span>
                <div>
                  <p className="flex items-center gap-1 text-sm font-bold text-ink-900">
                    CivilBridge Certified Plans <BadgeCheck className="h-3.5 w-3.5 text-brand-500" />
                  </p>
                  <p className="text-xs text-slate-500">Reviewed by our in-house engineering team</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {similar.length > 0 && (
          <div className="mt-14">
            <h2 className="text-xl font-bold text-ink-900">You Might Also Like</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-3">
              {similar.map((p) => (
                <Link
                  key={p.id}
                  to={`/plans/${p.id}`}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(.22,.61,.36,1)] hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="relative" style={{ aspectRatio: "4 / 3" }}>
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.title} loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-brand-50 text-brand-300">
                        <MapPin className="h-8 w-8" />
                      </div>
                    )}
                    {getPlanBadge(p) && (
                      <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold capitalize text-white ${badgeStyle(getPlanBadge(p))}`}>
                        {getPlanBadge(p)}
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-ink-900">{p.title}</h3>
                    {p.city && (
                      <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                        <MapPin className="h-3.5 w-3.5" /> {p.city}
                      </p>
                    )}
                    <p className="mt-2 font-bold text-brand-500">
                      {p.currency} {Number(p.price).toLocaleString()}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {inquiryMode && (
        <PlanInquiryModal plan={plan} mode={inquiryMode} lotOrientation={lotOrientation} onClose={() => setInquiryMode(null)} />
      )}
      {showUnlock && (
        <PlanUnlockModal
          licensePrice={plan.license_price}
          currency={plan.currency}
          planTitle={plan.title}
          onClose={() => setShowUnlock(false)}
        />
      )}
    </>
  );
}
