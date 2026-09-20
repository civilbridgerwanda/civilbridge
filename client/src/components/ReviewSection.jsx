import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import StarRating from "./StarRating";

// Generic review/comment section for a property, plan, or expert detail
// page - pass in the fetch/submit functions for whichever one this is.
// `onSubmitted` (optional) lets the parent refresh its own aggregate
// rating/review_count display after a new review lands, since that data
// lives on the parent's record, not in the reviews list itself.
export default function ReviewSection({ id, getReviews, submitReview, excludeUserId, onSubmitted }) {
  const { user, token } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [form, setForm] = useState({ rating: 5, comment: "" });
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    getReviews(id, token)
      .then(setReviews)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setNotice(null);
    try {
      const review = await submitReview(id, form, token);
      setReviews((prev) => {
        const others = prev.filter((r) => r.reviewer_id !== review.reviewer_id);
        return [review, ...others];
      });
      setNotice("Thanks for your feedback!");
      onSubmitted?.();
    } catch (err) {
      setNotice(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const canReview = user && user.id !== excludeUserId;

  return (
    <div className="mt-10">
      <h2 className="text-xl font-bold text-ink-900">Reviews &amp; Feedback</h2>

      {canReview && (
        <form onSubmit={handleSubmit} className="mt-4 rounded-2xl border border-slate-200 p-5">
          <p className="text-sm font-semibold text-ink-900">Leave a review</p>
          <div className="mt-2">
            <StarRating
              interactive
              showValue
              size="h-6 w-6"
              value={form.rating}
              onChange={(rating) => setForm({ ...form, rating })}
            />
          </div>
          <textarea
            rows={3}
            placeholder="Share your thoughts or suggestions..."
            className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
            value={form.comment}
            onChange={(e) => setForm({ ...form, comment: e.target.value })}
          />
          {notice && <p className="mt-2 text-sm text-slate-500">{notice}</p>}
          <button
            disabled={submitting}
            className="mt-3 flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-[background-color,opacity,transform,box-shadow] duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-md active:translate-y-0 disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Submitting…" : "Submit Review"}
          </button>
        </form>
      )}

      {reviews.length ? (
        <div className="mt-4 space-y-4">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-ink-900">{r.reviewer?.full_name || "Anonymous"}</p>
                <StarRating value={r.rating} size="h-3.5 w-3.5" />
              </div>
              {r.comment && <p className="mt-2 text-sm text-slate-600">{r.comment}</p>}
              <p className="mt-2 text-xs text-slate-400">{new Date(r.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-400">No reviews yet.</p>
      )}
    </div>
  );
}
