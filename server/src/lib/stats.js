import { QueryTypes } from "sequelize";
import { sequelize } from "../models/index.js";
import { EVENTS } from "../sockets/index.js";

// Public, real numbers for the homepage counters. Everything here is a
// COUNT/AVG over live tables - there is no stored or hardcoded figure to
// go stale or be faked.
//
// A platform-wide rating built from one or two reviews would be noise (a
// single 5-star review reads as "5.0 overall"), so it's only published once
// there are enough reviews to mean something.
export const MIN_REVIEWS_FOR_PLATFORM_RATING = 5;

const CACHE_MS = 30 * 1000;
let cache = { at: 0, data: null };

async function compute() {
  const [experts] = await sequelize.query(
    `SELECT COUNT(*) AS n
       FROM experts e
       JOIN users u ON u.id = e.user_id
      WHERE e.is_verified = TRUE AND u.is_suspended = FALSE`,
    { type: QueryTypes.SELECT }
  );

  // "Estimated" = an analysis exists (cost filled in and past the draft
  // stage) - not merely that someone submitted a request.
  const [projects] = await sequelize.query(
    `SELECT COUNT(*) AS n
       FROM estimates
      WHERE status IN ('ai_generated', 'under_review', 'verified')
        AND estimated_cost IS NOT NULL AND estimated_cost > 0`,
    { type: QueryTypes.SELECT }
  );

  const [reviews] = await sequelize.query(
    `SELECT COUNT(*) AS n, AVG(rating) AS avg_rating FROM (
       SELECT rating FROM expert_reviews
       UNION ALL SELECT rating FROM plan_reviews
       UNION ALL SELECT rating FROM property_reviews
     ) r`,
    { type: QueryTypes.SELECT }
  );
  const reviewCount = Number(reviews.n) || 0;

  return {
    verified_experts: Number(experts.n) || 0,
    projects_estimated: Number(projects.n) || 0,
    rating:
      reviewCount >= MIN_REVIEWS_FOR_PLATFORM_RATING
        ? { average: Math.round(Number(reviews.avg_rating) * 10) / 10, count: reviewCount }
        : null,
    updated_at: new Date().toISOString(),
  };
}

export async function getPublicStats() {
  if (cache.data && Date.now() - cache.at < CACHE_MS) return cache.data;
  const data = await compute();
  cache = { at: Date.now(), data };
  return data;
}

/** Call after anything that changes a counter; tells open homepages to refetch. */
export function broadcastStats(io) {
  cache = { at: 0, data: null };
  if (io) io.emit(EVENTS.STATS_UPDATED);
}
