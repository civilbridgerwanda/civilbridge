// The single source of truth for what things cost AND what each account level
// may do. Three things read this file and nothing else decides these numbers:
//   1. enforcement  - estimate quotas, messaging and listing caps (lib/allowance.js,
//                     lib/limits.js) and what a payment request is charged;
//   2. the payment flow - amounts are always computed here (or from a Plan's own
//                     license_price), never taken from the client;
//   3. the Pricing page - GET /api/pricing builds its plan cards from these
//                     limits, so the page cannot promise more than the system
//                     enforces (or less).
//
// All RWF figures below are PLACEHOLDERS until pricing is finalised: change
// them here and enforcement, receipts, the Pricing page and the purchase
// screens all follow. `null` for a limit means unlimited.

// Subscription prices. Business is custom-quoted, so it has no self-serve price.
export const PLAN_PRICES = {
  professional: { monthly: 15000, annual: 150000 },
};

// Pay-as-you-go: for anyone who's used their allowance or doesn't subscribe.
export const ESTIMATE_PRICES = {
  estimate: 20000, // analysis + cost breakdown, verified by an expert
  estimate_with_drawings: 50000, // the same, plus the CAD-ready drawing set
};

// Drawings are an extra on ANY estimate - free, paid-for or included in a
// subscription. Bought on their own, the add-on is the difference between the
// two prices above, so "estimate + drawings" costs the same either way you buy it.
export const DRAWINGS_ADDON_PRICE = ESTIMATE_PRICES.estimate_with_drawings - ESTIMATE_PRICES.estimate;

// What each account level may do.
export const TIERS = {
  starter: {
    label: "Starter",
    estimates_per_month: 1,
    expert_conversations_per_month: 3,
    active_listings: 1,
    priority_review: false,
  },
  professional: {
    label: "Professional",
    estimates_per_month: null, // unlimited - the team controls the pace by assigning the work
    expert_conversations_per_month: null,
    active_listings: 10,
    priority_review: true, // goes to the front of the assignment queue
  },
  business: {
    label: "Business",
    estimates_per_month: null,
    expert_conversations_per_month: null,
    active_listings: null,
    priority_review: true,
  },
};

export function tierFor(plan) {
  return TIERS[plan] || TIERS.starter;
}

export const PAYMENT_METHODS = ["mobile_money", "bank_transfer", "card"];

export const SELF_SERVE_TIERS = Object.keys(PLAN_PRICES);

// What can be bought as a one-off, and what it grants when its payment is
// confirmed (see lib/entitlements.js). `estimate` / `drawings` are counts of
// credits added to the buyer's account.
export const ESTIMATE_PURCHASE_OPTIONS = {
  estimate: { price: ESTIMATE_PRICES.estimate, estimate: 1, drawings: 0, label: "Cost estimate" },
  estimate_drawings: {
    price: ESTIMATE_PRICES.estimate_with_drawings,
    estimate: 1,
    drawings: 1,
    label: "Cost estimate + CAD drawings",
  },
};
