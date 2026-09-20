// Whether a listing counts as "recently added" for the auto-expiring NEW
// badge - computed from created_at, not a stored flag, so it naturally
// disappears on its own once the window passes instead of needing anyone
// to go clear it.
const NEW_BADGE_WINDOW_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

export function isRecentlyListed(createdAt) {
  if (!createdAt) return false;
  return Date.now() - new Date(createdAt).getTime() < NEW_BADGE_WINDOW_MS;
}

// A plan's display badge: "hot" is a deliberate admin call and always wins
// when set; "new" is never stored/trusted from the admin-set field - it's
// computed live from created_at so it disappears on its own after the
// window instead of sitting there forever until someone remembers to
// clear it.
export function getPlanBadge(plan) {
  if (plan.badge === "hot") return "hot";
  if (isRecentlyListed(plan.created_at)) return "new";
  return null;
}
