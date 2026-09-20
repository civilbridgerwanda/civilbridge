import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Star, Briefcase, BadgeCheck, ArrowLeft, Loader2 } from "lucide-react";
import { api } from "../lib/api";
import Seo from "../components/Seo";
import MessageButton from "../components/MessageButton";
import StarRating from "../components/StarRating";
import ReviewSection from "../components/ReviewSection";
import Avatar from "../components/Avatar";

function formatRating(rating) {
  const n = Number(rating);
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export default function ExpertDetail() {
  const { id } = useParams();
  const [expert, setExpert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [similar, setSimilar] = useState([]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .getExpert(id)
      .then(setExpert)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  // Similar experts: same category + city first; widen to just the same
  // category if that's too thin.
  useEffect(() => {
    if (!expert) return;
    let cancelled = false;

    async function loadSimilar() {
      try {
        let results = await api.getExperts({ category: expert.category, city: expert.city });
        results = results.filter((e) => e.id !== expert.id);
        if (results.length < 3) {
          const broader = await api.getExperts({ category: expert.category });
          const seen = new Set(results.map((e) => e.id));
          for (const e of broader) {
            if (e.id !== expert.id && !seen.has(e.id)) {
              results.push(e);
              seen.add(e.id);
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
  }, [expert]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error || !expert) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="text-2xl font-bold text-ink-900">Expert not found</h1>
        <p className="mt-2 text-slate-500">{error || "This profile may no longer be available."}</p>
        <Link to="/experts" className="mt-6 inline-block font-semibold text-brand-500 hover:underline">
          ← Back to Expert Directory
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Seo
        title={expert.full_name}
        description={`${expert.specialty}${expert.city ? ` in ${expert.city}` : ""} - CivilBridge verified expert.`}
        path={`/experts/${expert.id}`}
      />

      <Link to="/experts" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-ink-900">
        <ArrowLeft className="h-4 w-4" />
        Back to Expert Directory
      </Link>

      <div className="mt-6 rounded-2xl border border-slate-200 p-8">
        <div className="flex items-center gap-5">
          <div className="relative shrink-0">
            <Avatar
              gravatarUrl={expert.gravatar_url}
              avatarUrl={expert.avatar_url}
              name={expert.full_name}
              className="h-20 w-20"
              textClassName="text-2xl"
            />
            {expert.is_verified ? (
              <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 text-white ring-2 ring-white">
                <BadgeCheck className="h-4 w-4" />
              </span>
            ) : null}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-ink-900">{expert.full_name}</h1>
            <p className="text-brand-500">{expert.specialty}</p>
            {expert.city && <p className="text-sm text-slate-400">{expert.city}, Rwanda</p>}
          </div>
        </div>

        <div className="mt-6 flex items-center gap-2">
          <StarRating value={expert.rating} />
          <span className="text-sm font-semibold text-ink-900">{formatRating(expert.rating)}</span>
          <span className="text-sm text-tertiary">
            {expert.review_count > 0 ? `(${expert.review_count} reviews)` : "No reviews yet"}
          </span>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">Specialization</p>
            <p className="mt-1 text-ink-900">{expert.specialization || "—"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">Experience</p>
            <p className="mt-1 text-ink-900">{expert.years_experience} years</p>
          </div>
          <div className="sm:col-span-2 flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-brand-500" />
            <span className="text-ink-900">{expert.completed_projects} completed projects</span>
          </div>
        </div>

        {expert.bio && (
          <div className="mt-6 border-t border-slate-100 pt-6">
            <p className="text-xs font-semibold uppercase text-slate-400">About</p>
            <p className="mt-2 whitespace-pre-line text-slate-600">{expert.bio}</p>
          </div>
        )}

        <div className="mt-8">
          <MessageButton
            userId={expert.user_id}
            label={`Message ${expert.full_name?.split(" ")[0]}`}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 py-3 text-sm font-semibold text-white transition-[background-color,opacity,transform,box-shadow] duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-md active:translate-y-0 disabled:opacity-60"
          />
        </div>
      </div>

      {expert.portfolio?.length > 0 && (
        <div className="mt-10">
          <h2 className="text-xl font-bold text-ink-900">Recent Work</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {expert.portfolio.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 p-5">
                {item.image_url && (
                  <img src={item.image_url} alt={item.title} className="mb-3 h-40 w-full rounded-lg object-cover" />
                )}
                <p className="font-bold text-ink-900">{item.title}</p>
                {item.description && <p className="mt-1 text-sm text-slate-500">{item.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      <ReviewSection
        id={expert.id}
        getReviews={api.getExpertReviews}
        submitReview={api.submitExpertReview}
        excludeUserId={expert.user_id}
        onSubmitted={() => api.getExpert(id).then(setExpert).catch(() => {})}
      />

      {similar.length > 0 && (
        <div className="mt-14">
          <h2 className="text-xl font-bold text-ink-900">Similar Experts</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-3">
            {similar.map((e) => (
              <Link
                key={e.id}
                to={`/experts/${e.id}`}
                className="rounded-2xl border border-slate-200 p-5 transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(.22,.61,.36,1)] hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex items-center gap-3">
                  <Avatar gravatarUrl={e.gravatar_url} avatarUrl={e.avatar_url} name={e.full_name} className="h-12 w-12" />
                  <div className="min-w-0">
                    <p className="truncate font-bold text-ink-900">{e.full_name}</p>
                    <p className="truncate text-sm text-brand-500">{e.specialty}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-sm text-slate-600">
                  <Star className="h-3.5 w-3.5 text-gold-400" fill="currentColor" />
                  {formatRating(e.rating)} ({e.review_count})
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
