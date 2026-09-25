// Single source of truth for what things cost when a payment request is
// created. The amount is always computed here (or from the Plan's own
// license_price) and never taken from the client - otherwise anyone could
// submit a "plan_upgrade" for RWF 1 and, once carelessly reconciled, get
// the tier for it.
//
// These figures mirror what Pricing.jsx currently advertises and are NOT
// final - change them here and the payment flow, receipts, and admin
// reconciliation all follow. The Business tier is custom-quoted, so it has
// no self-serve price on purpose.
export const PLAN_PRICES = {
  professional: { monthly: 15000, annual: 150000 },
};

// The "download + cost estimate" bundle is the plan's license price plus a
// premium. Kept in one place so the modal's displayed price and the price
// the server actually records can't drift apart.
export const ESTIMATE_BUNDLE_MULTIPLIER = 1.15;

export const PAYMENT_METHODS = ["mobile_money", "bank_transfer", "card"];

export const SELF_SERVE_TIERS = Object.keys(PLAN_PRICES);
