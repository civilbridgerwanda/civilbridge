import { getReviews, submitReview, removeReview, ReviewError, REVIEW_KINDS } from "../lib/reviews.js";

// One set of handlers for all three review targets - `kind` is bound in the
// route file ("expert" | "plan" | "property"). The rules themselves live in
// lib/reviews.js.

function fail(res, err, fallback) {
  if (err instanceof ReviewError) {
    return res.status(err.status).json({ success: false, message: err.message });
  }
  console.error(err);
  res.status(500).json({ success: false, message: fallback });
}

// GET /:id/reviews - the reviews, the aggregate, and whether *this viewer*
// may add one (and if not, why). Public: viewers who aren't signed in just
// get eligibility.reason = "sign_in".
export const list = (kind) => async (req, res) => {
  try {
    res.json({ success: true, data: await getReviews(kind, req.params.id, req.user?.sub) });
  } catch (err) {
    fail(res, err, "Failed to fetch reviews");
  }
};

// POST /:id/reviews  { rating: 1-5, comment? }
export const submit = (kind) => async (req, res) => {
  try {
    const result = await submitReview(kind, req.params.id, req.user.sub, req.body, req.app.get("io"));
    res.status(result.created ? 201 : 200).json({ success: true, data: result });
  } catch (err) {
    fail(res, err, "Failed to submit review");
  }
};

// DELETE /:id/reviews/mine - remove your own review
export const removeMine = (kind) => async (req, res) => {
  try {
    await removeReview(kind, req.params.id, req.user.sub, {}, req.app.get("io"));
    res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    fail(res, err, "Failed to remove review");
  }
};

// DELETE /api/admin/reviews/:kind/:reviewId - moderation
export async function adminRemove(req, res) {
  try {
    const { kind, reviewId } = req.params;
    if (!REVIEW_KINDS.includes(kind)) {
      return res.status(400).json({ success: false, message: `kind must be one of: ${REVIEW_KINDS.join(", ")}` });
    }
    await removeReview(kind, reviewId, null, { asAdmin: true }, req.app.get("io"));
    res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    fail(res, err, "Failed to remove review");
  }
}
