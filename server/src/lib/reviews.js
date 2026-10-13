import { QueryTypes } from "sequelize";
import {
  sequelize,
  User,
  Expert,
  Plan,
  Property,
  Estimate,
  Payment,
  PropertyVisit,
  ExpertReview,
  PlanReview,
  PropertyReview,
} from "../models/index.js";
import { hasPlanLicense } from "./entitlements.js";
import { broadcastStats } from "./stats.js";

/**
 * The verified-client review pipeline - one implementation for experts,
 * plans and properties, so the rules can't drift apart between them.
 *
 * A review is accepted only when ALL of these hold, checked on the server
 * (the UI merely reflects the answer):
 *   1. the reviewer is signed in, not suspended, and has a verified email;
 *   2. they aren't staff, and aren't the owner of what they're rating;
 *   3. they have a real, recorded interaction with it (the "basis"):
 *        plan     -> purchased it (a completed payment) or hold a paid tier
 *        expert   -> the expert verified one of their estimates, or a
 *                    completed paid consultation with them
 *        property -> our team marked their site tour as completed
 *
 * Ratings shown anywhere are only ever the aggregate of rows in the review
 * tables - recomputed in SQL, so they can't drift or be typed in.
 */

const TARGETS = {
  expert: { table: "experts", reviews: "expert_reviews", key: "expert_id", Parent: Expert, Review: ExpertReview },
  plan: { table: "plans", reviews: "plan_reviews", key: "plan_id", Parent: Plan, Review: PlanReview },
  property: {
    table: "properties",
    reviews: "property_reviews",
    key: "property_id",
    Parent: Property,
    Review: PropertyReview,
  },
};

export const REVIEW_KINDS = Object.keys(TARGETS);

export class ReviewError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const COMMENT_MAX = 1000;

/** One atomic statement - no read-modify-write window for concurrent reviews. */
export async function recomputeRating(kind, id) {
  const t = TARGETS[kind];
  await sequelize.query(
    `UPDATE ${t.table} p SET
       p.review_count = (SELECT COUNT(*) FROM ${t.reviews} r WHERE r.${t.key} = p.id),
       p.rating = COALESCE((SELECT ROUND(AVG(r.rating), 1) FROM ${t.reviews} r WHERE r.${t.key} = p.id), 0)
     WHERE p.id = :id`,
    { replacements: { id } }
  );
}

/** After anything that can delete reviews in bulk (a user or listing removed). */
export async function recomputeAllRatings() {
  for (const t of Object.values(TARGETS)) {
    await sequelize.query(
      `UPDATE ${t.table} p SET
         p.review_count = (SELECT COUNT(*) FROM ${t.reviews} r WHERE r.${t.key} = p.id),
         p.rating = COALESCE((SELECT ROUND(AVG(r.rating), 1) FROM ${t.reviews} r WHERE r.${t.key} = p.id), 0)`
    );
  }
}

async function findTarget(kind, id) {
  const target = await TARGETS[kind].Parent.findByPk(id);
  if (!target) throw new ReviewError(`${kind[0].toUpperCase()}${kind.slice(1)} not found`, 404);
  return target;
}

// ---- who may review -------------------------------------------------------

const REASONS = {
  sign_in: "Sign in to leave a review.",
  verify_email: "Verify your email address to leave a review.",
  suspended: "This account can't leave reviews.",
  staff: "Staff accounts can't leave reviews.",
  owner: "You can't review your own listing or profile.",
  no_interaction: {
    plan: "Reviews are open to people who have purchased this plan.",
    expert:
      "Reviews are open to clients whose estimate this expert has verified, or who have completed a paid consultation with them.",
    property: "Reviews are open to people who have toured this property with us. Schedule a tour to be able to review it.",
  },
};

async function findBasis(kind, target, userId, user) {
  if (kind === "plan") {
    if (await hasPlanLicense(userId, target.id)) return "purchase";
    // A Professional/Business subscriber has the whole library unlocked.
    if (user.plan !== "starter") return "purchase";
    return null;
  }

  if (kind === "expert") {
    const verified = await Estimate.count({ where: { user_id: userId, reviewed_by: target.id, status: "verified" } });
    if (verified > 0) return "estimate";
    const consulted = await Payment.count({
      where: { payer_id: userId, recipient_type: "expert", recipient_id: target.id, status: "completed" },
    });
    return consulted > 0 ? "consultation" : null;
  }

  const toured = await PropertyVisit.count({ where: { user_id: userId, property_id: target.id, status: "completed" } });
  return toured > 0 ? "tour" : null;
}

/**
 * @returns {{ can_review, reason, message, basis, my_review }}
 * `reason` is a stable code the UI can switch on; `message` is ready to show.
 */
export async function checkEligibility(kind, target, userId) {
  const t = TARGETS[kind];
  const deny = (reason, message) => ({ can_review: false, reason, message, basis: null, my_review: null });

  if (!userId) return deny("sign_in", REASONS.sign_in);
  const user = await User.findByPk(userId, { attributes: ["id", "role", "plan", "email_verified", "is_suspended"] });
  if (!user) return deny("sign_in", REASONS.sign_in);

  const mine = await t.Review.findOne({ where: { [t.key]: target.id, reviewer_id: userId } });
  const my_review = mine ? { id: mine.id, rating: mine.rating, comment: mine.comment } : null;
  const withMine = (result) => ({ ...result, my_review });

  if (user.is_suspended) return withMine(deny("suspended", REASONS.suspended));
  if (user.role === "admin") return withMine(deny("staff", REASONS.staff));
  if (!user.email_verified) return withMine(deny("verify_email", REASONS.verify_email));
  const ownerId = kind === "expert" ? target.user_id : kind === "property" ? target.owner_id : null;
  if (ownerId && ownerId === userId) return withMine(deny("owner", REASONS.owner));

  // Someone who already reviewed keeps the right to edit or remove it, even
  // if the qualifying record later changes.
  const basis = mine?.basis || (await findBasis(kind, target, userId, user));
  if (!basis) return withMine(deny("no_interaction", REASONS.no_interaction[kind]));

  return withMine({ can_review: true, reason: "ok", message: null, basis });
}

// ---- reading --------------------------------------------------------------

// "Marie Uwase" -> "Marie U." - enough to look human, not enough to identify.
function displayName(fullName) {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "Verified client";
  return parts.length === 1 ? parts[0] : `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

async function summarize(kind, id) {
  const t = TARGETS[kind];
  const rows = await sequelize.query(
    `SELECT rating, COUNT(*) AS n FROM ${t.reviews} WHERE ${t.key} = :id GROUP BY rating`,
    { replacements: { id }, type: QueryTypes.SELECT }
  );
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let count = 0;
  let sum = 0;
  for (const row of rows) {
    distribution[row.rating] = Number(row.n);
    count += Number(row.n);
    sum += Number(row.rating) * Number(row.n);
  }
  return { count, average: count ? Math.round((sum / count) * 10) / 10 : null, distribution };
}

export async function getReviews(kind, id, viewerId) {
  const t = TARGETS[kind];
  const target = await findTarget(kind, id);
  const rows = await t.Review.findAll({
    where: { [t.key]: id },
    include: [{ model: User, as: "reviewer", attributes: ["full_name"] }],
    order: [["created_at", "DESC"]],
  });
  return {
    reviews: rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      basis: r.basis,
      created_at: r.created_at,
      reviewer_name: displayName(r.reviewer?.full_name),
      is_mine: Boolean(viewerId) && r.reviewer_id === viewerId,
    })),
    summary: await summarize(kind, id),
    eligibility: await checkEligibility(kind, target, viewerId),
  };
}

// ---- writing --------------------------------------------------------------

function parseReview(body) {
  const rating = Number(body?.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new ReviewError("Please choose a rating from 1 to 5 stars.");
  }
  let comment = typeof body?.comment === "string" ? body.comment : "";
  // eslint-disable-next-line no-control-regex
  comment = comment.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();
  if (comment.length > COMMENT_MAX) throw new ReviewError(`Please keep your review under ${COMMENT_MAX} characters.`);
  return { rating, comment: comment || null };
}

export async function submitReview(kind, id, userId, body, io) {
  const t = TARGETS[kind];
  const { rating, comment } = parseReview(body);
  const target = await findTarget(kind, id);

  const eligibility = await checkEligibility(kind, target, userId);
  if (!eligibility.can_review) {
    throw new ReviewError(eligibility.message, eligibility.reason === "sign_in" ? 401 : 403);
  }

  const [review, created] = await t.Review.findOrCreate({
    where: { [t.key]: target.id, reviewer_id: userId },
    defaults: { rating, comment, basis: eligibility.basis },
  });
  if (!created) {
    review.rating = rating;
    review.comment = comment;
    if (!review.basis) review.basis = eligibility.basis;
    await review.save();
  }

  await recomputeRating(kind, target.id);
  broadcastStats(io);
  return { review_id: review.id, created };
}

/** The reviewer removing their own review, or an admin moderating one. */
export async function removeReview(kind, id, userId, { asAdmin = false } = {}, io) {
  const t = TARGETS[kind];
  const where = asAdmin ? { id } : { [t.key]: id, reviewer_id: userId };
  const review = await t.Review.findOne({ where });
  if (!review) throw new ReviewError("Review not found", 404);
  const targetId = review[t.key];
  await review.destroy();
  await recomputeRating(kind, targetId);
  broadcastStats(io);
}
