import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Star, Briefcase, BadgeCheck, ArrowLeft, Loader2 } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import Seo from "../components/Seo";
import MessageButton from "../components/MessageButton";

function formatRating(rating) {
  const n = Number(rating);
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export default function ExpertDetail() {
  const { id } = useParams();
  const { user, token } = useAuth();
  const [expert, setExpert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewNotice, setReviewNotice] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .getExpert(id)
      .then(setExpert)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    api
      .getExpertReviews(id)
      .then(setReviews)
      .catch(() => {});
  }, [id]);

  async function handleSubmitReview(e) {
    e.preventDefault();
    setSubmittingReview(true);
    setReviewNotice(null);
    try {
      const review = await api.submitExpertReview(id, reviewForm, token);
      setReviews((prev) => {
        const others = prev.filter((r) => r.reviewer_id !== review.reviewer_id);
        return [review, ...others];
      });
      setReviewNotice("Thanks for your review!");
      const updated = await api.getExpert(id);
      setExpert(updated);
    } catch (err) {
      setReviewNotice(err.message);
    } finally {
      setSubmittingReview(false);
    }
  }

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
            {expert.avatar_url ? (
              <img
                src={expert.avatar_url}
                alt={expert.full_name}
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-100 text-2xl font-bold text-brand-600">
                {expert.full_name?.[0]}
              </div>
            )}
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
          <div className="flex text-gold-400">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className="h-4 w-4"
                fill={i < Math.round(Number(expert.rating)) ? "currentColor" : "none"}
                strokeWidth={1.5}
              />
            ))}
          </div>
          <span className="text-sm font-semibold text-ink-900">{formatRating(expert.rating)}</span>
          <span className="text-sm text-tertiary">({expert.review_count} reviews)</span>
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

      <div className="mt-10">
        <h2 className="text-xl font-bold text-ink-900">Reviews</h2>

        {user && user.id !== expert.user_id && (
          <form onSubmit={handleSubmitReview} className="mt-4 rounded-2xl border border-slate-200 p-5">
            <p className="text-sm font-semibold text-ink-900">Leave a review</p>
            <div className="mt-2 flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setReviewForm({ ...reviewForm, rating: n })}
                  aria-label={`${n} star${n > 1 ? "s" : ""}`}
                >
                  <Star
                    className="h-6 w-6 text-gold-400"
                    fill={n <= reviewForm.rating ? "currentColor" : "none"}
                    strokeWidth={1.5}
                  />
                </button>
              ))}
            </div>
            <textarea
              rows={3}
              placeholder="How was your experience working with them?"
              className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
              value={reviewForm.comment}
              onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
            />
            {reviewNotice && <p className="mt-2 text-sm text-slate-500">{reviewNotice}</p>}
            <button
              disabled={submittingReview}
              className="mt-3 flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-[background-color,opacity,transform,box-shadow] duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-md active:translate-y-0 disabled:opacity-60"
            >
              {submittingReview && <Loader2 className="h-4 w-4 animate-spin" />}
              {submittingReview ? "Submitting…" : "Submit Review"}
            </button>
          </form>
        )}

        {reviews.length ? (
          <div className="mt-4 space-y-4">
            {reviews.map((r) => (
              <div key={r.id} className="rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-ink-900">{r.reviewer?.full_name || "Anonymous"}</p>
                  <div className="flex text-gold-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5" fill={i < r.rating ? "currentColor" : "none"} strokeWidth={1.5} />
                    ))}
                  </div>
                </div>
                {r.comment && <p className="mt-2 text-sm text-slate-600">{r.comment}</p>}
                <p className="mt-2 text-xs text-tertiary">{new Date(r.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-400">No reviews yet.</p>
        )}
      </div>

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
                  {e.avatar_url ? (
                    <img src={e.avatar_url} alt={e.full_name} className="h-12 w-12 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-600">
                      {e.full_name?.[0]}
                    </div>
                  )}
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
