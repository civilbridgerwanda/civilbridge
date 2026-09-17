import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MapPin, Ruler, BedDouble, Bath, Star, Eye, ArrowLeft, Loader2 } from "lucide-react";
import { api } from "../lib/api";
import Seo from "../components/Seo";
import PlanInquiryModal from "../components/PlanInquiryModal";

function badgeStyle(badge) {
  if (badge === "new") return "bg-brand-500";
  if (badge === "hot") return "bg-orange-500";
  return null;
}

export default function PlanDetail() {
  const { id } = useParams();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showInquiry, setShowInquiry] = useState(false);
  const [similar, setSimilar] = useState([]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .getPlan(id)
      .then(setPlan)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

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

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <Seo
        title={plan.title}
        description={`${plan.title}${plan.city ? ` in ${plan.city}` : ""} - CivilBridge building plan.`}
        path={`/plans/${plan.id}`}
      />

      <Link to="/plans" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-ink-900">
        <ArrowLeft className="h-4 w-4" />
        Back to Plans
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <div className="relative overflow-hidden rounded-2xl" style={{ aspectRatio: "4 / 3" }}>
            {plan.image_url ? (
              <img src={plan.image_url} alt={plan.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-brand-50 text-brand-300">
                <MapPin className="h-12 w-12" />
              </div>
            )}
            {plan.badge && (
              <span className={`absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-semibold capitalize text-white ${badgeStyle(plan.badge)}`}>
                {plan.badge}
              </span>
            )}
          </div>

          <h1 className="mt-6 text-3xl font-extrabold text-ink-900">{plan.title}</h1>
          {plan.city && (
            <p className="mt-2 flex items-center gap-1.5 text-slate-500">
              <MapPin className="h-4 w-4" /> {plan.city}
            </p>
          )}

          <div className="mt-4 flex items-center gap-4">
            <div className="flex text-gold-400">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-4 w-4" fill={i < Math.round(Number(plan.rating)) ? "currentColor" : "none"} strokeWidth={1.5} />
              ))}
            </div>
            <span className="flex items-center gap-1 text-sm text-slate-400">
              <Eye className="h-3.5 w-3.5" /> {plan.view_count} views
            </span>
          </div>

          <div className="mt-6 flex flex-wrap gap-6 border-y border-slate-200 py-5 text-sm text-slate-600">
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
        </div>

        <div className="h-fit rounded-2xl border border-slate-200 p-6">
          <p className="text-2xl font-extrabold text-brand-500">
            {plan.currency} {Number(plan.price).toLocaleString()}
          </p>
          <p className="mt-1 text-sm capitalize text-slate-400">{plan.plan_type} plan</p>

          <Link
            to="/estimator"
            className="mt-6 block rounded-lg bg-brand-500 py-2.5 text-center text-sm font-semibold text-white transition-[background-color,transform,box-shadow] duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-md active:translate-y-0"
          >
            Get a Cost Estimate
          </Link>
          <button
            type="button"
            onClick={() => setShowInquiry(true)}
            className="mt-3 block w-full rounded-lg border border-slate-300 bg-slate-50 py-2.5 text-center text-sm font-semibold text-ink-900 transition-colors duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:bg-slate-100"
          >
            Talk to an Expert
          </button>
        </div>
      </div>

      {showInquiry && <PlanInquiryModal plan={plan} onClose={() => setShowInquiry(false)} />}

      {similar.length > 0 && (
        <div className="mt-14">
          <h2 className="text-xl font-bold text-ink-900">Similar Plans</h2>
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
                  {p.badge && (
                    <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold capitalize text-white ${badgeStyle(p.badge)}`}>
                      {p.badge}
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
  );
}
