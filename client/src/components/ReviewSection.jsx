import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, Loader2, Lock, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import StarRating from "./StarRating";

// Why a reviewer was allowed to review - shown as a badge on each review.
const BASIS_LABEL = {
  purchase: "Verified purchase",
  estimate: "Verified estimate",
  consultation: "Verified consultation",
  tour: "Verified tour",
};

// Reviews for an expert, plan or property (`kind`). Everything about *who may
// review* comes from the server: it answers "can this viewer review, and if
// not, why" with each list of reviews, so the rules can't drift between what
// the page shows and what the API accepts. `onChanged` lets the parent
// refresh its own aggregate display after a review is added or removed.
export default function ReviewSection({ kind, id, onChanged }) {
  const { user, token } = useAuth();
  const [data, setData] = useState(null); // { reviews, summary, eligibility }
  const [loadError, setLoadError] = useState(null);
  const [form, setForm] = useState({ rating: 0, comment: "" });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: "ok" | "error", text }

  const load = useCallback(async () => {
    try {
      const fresh = await api.getReviews(kind, id, token);
      setData(fresh);
      setLoadError(null);
      // Start the form from their existing review, so editing is one click.
      const mine = fresh.eligibility.my_review;
      setForm(mine ? { rating: mine.rating, comment: mine.comment || "" } : { rating: 0, comment: "" });
    } catch (err) {
      setLoadError(err.message);
    }
  }, [kind, id, token]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.rating) {
      setFeedback({ type: "error", text: "Please choose a star rating first." });
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      const result = await api.submitReview(kind, id, form, token);
      await load();
      setFeedback({ type: "ok", text: result.created ? "Thanks - your review is live." : "Your review was updated." });
      onChanged?.();
    } catch (err) {
      setFeedback({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  async function removeMine() {
    if (!confirm("Remove your review?")) return;
    try {
      await api.removeMyReview(kind, id, token);
      setFeedback(null);
      await load();
      onChanged?.();
    } catch (err) {
      setFeedback({ type: "error", text: err.message });
    }
  }

  async function moderate(review) {
    if (!confirm("Remove this review? This can't be undone.")) return;
    try {
      await api.adminRemoveReview(kind, review.id, token);
      await load();
      onChanged?.();
    } catch (err) {
      setFeedback({ type: "error", text: err.message });
    }
  }

  if (loadError) {
    return (
      <div className="mt-10">
        <h2 className="text-xl font-bold text-ink-900">Reviews</h2>
        <p className="mt-3 text-sm text-red-600">Couldn't load reviews: {loadError}</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="mt-10 flex items-center gap-2 text-sm text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading reviews…
      </div>
    );
  }

  const { reviews, summary, eligibility } = data;
  const isAdmin = user?.role === "admin";

  return (
    <div className="mt-10">
      <h2 className="flex items-center gap-2 text-xl font-bold text-ink-900">
        Reviews <span className="text-sm font-normal text-slate-400">from verified clients</span>
      </h2>

      {summary.count > 0 && <Overall summary={summary} />}

      {eligibility.can_review ? (
        <form onSubmit={handleSubmit} className="mt-4 rounded-2xl border border-slate-200 p-5">
          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink-900">
            {eligibility.my_review ? "Update your review" : "Leave a review"}
            {eligibility.basis && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                <BadgeCheck className="h-3.5 w-3.5" /> {BASIS_LABEL[eligibility.basis] || "Verified"}
              </span>
            )}
          </p>
          <div className="mt-2">
            <StarRating interactive showValue size="h-7 w-7" value={form.rating} onChange={(rating) => setForm({ ...form, rating })} />
          </div>
          <textarea
            rows={3}
            maxLength={1000}
            placeholder="What was it like? (optional)"
            className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
            value={form.comment}
            onChange={(e) => setForm({ ...form, comment: e.target.value })}
          />
          {feedback && (
            <p className={`mt-2 text-sm ${feedback.type === "ok" ? "text-emerald-600" : "text-red-600"}`}>{feedback.text}</p>
          )}
          <div className="mt-3 flex items-center gap-3">
            <button
              disabled={submitting || !form.rating}
              className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-[background-color,opacity,transform,box-shadow] duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-md active:translate-y-0 disabled:translate-y-0 disabled:opacity-50 disabled:hover:shadow-none"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? "Submitting…" : eligibility.my_review ? "Update review" : "Submit review"}
            </button>
            {eligibility.my_review && (
              <button type="button" onClick={removeMine} className="text-sm font-semibold text-slate-400 hover:text-red-600">
                Remove my review
              </button>
            )}
          </div>
        </form>
      ) : (
        <WhyNot eligibility={eligibility} />
      )}

      {reviews.length ? (
        <div className="mt-4 space-y-4">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-2xl border border-slate-200 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex flex-wrap items-center gap-2 font-semibold text-ink-900">
                  {r.reviewer_name}
                  {BASIS_LABEL[r.basis] && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                      <BadgeCheck className="h-3 w-3" /> {BASIS_LABEL[r.basis]}
                    </span>
                  )}
                </p>
                <StarRating value={r.rating} size="h-3.5 w-3.5" />
              </div>
              {r.comment && <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{r.comment}</p>}
              <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                <span>{new Date(r.created_at).toLocaleDateString()}</span>
                {isAdmin && (
                  <button type="button" onClick={() => moderate(r)} className="flex items-center gap-1 font-semibold hover:text-red-600">
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-400">No reviews yet.</p>
      )}
    </div>
  );
}

// Big average + the 5-to-1 breakdown.
function Overall({ summary }) {
  return (
    <div className="mt-4 grid gap-6 rounded-2xl border border-slate-200 p-5 sm:grid-cols-[auto_1fr] sm:items-center">
      <div className="text-center sm:pr-6">
        <p className="text-5xl font-extrabold text-ink-900">{summary.average.toFixed(1)}</p>
        <div className="mt-2 flex justify-center">
          <StarRating value={summary.average} size="h-4 w-4" />
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {summary.count} verified review{summary.count === 1 ? "" : "s"}
        </p>
      </div>
      <div className="space-y-1.5">
        {[5, 4, 3, 2, 1].map((stars) => {
          const n = summary.distribution[stars] || 0;
          const pct = summary.count ? (n / summary.count) * 100 : 0;
          return (
            <div key={stars} className="flex items-center gap-3 text-xs text-slate-500">
              <span className="w-8 shrink-0">{stars} ★</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-gold-400" style={{ width: `${pct}%` }} />
              </div>
              <span className="w-6 shrink-0 text-right">{n}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// The reason this viewer can't review, in words - with the way forward when there is one.
function WhyNot({ eligibility }) {
  const { reason, message } = eligibility;
  let action = null;
  if (reason === "sign_in") {
    action = (
      <Link to="/sign-in" state={{ from: window.location.pathname }} className="font-semibold text-brand-500 hover:underline">
        Sign in
      </Link>
    );
  } else if (reason === "verify_email") {
    action = (
      <Link to="/settings" className="font-semibold text-brand-500 hover:underline">
        Verify your email
      </Link>
    );
  }
  return (
    <div className="mt-4 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
      <Lock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <p>
        {message} {action}
      </p>
    </div>
  );
}
