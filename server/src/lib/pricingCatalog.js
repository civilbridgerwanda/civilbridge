import { DRAWINGS_ADDON_PRICE, ESTIMATE_PRICES, PLAN_PRICES, TIERS } from "../config/pricing.js";

/**
 * What the Pricing page shows, generated from config/pricing.js - the very
 * numbers the server enforces. Every limit that appears in a feature line is
 * read from the config, never typed here, so the page can't drift from what
 * the system actually allows.
 */

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const fee = (n) => `RWF ${n.toLocaleString()}`;

export function buildCatalog() {
  const { starter, professional, business } = TIERS;

  const estimates = (tier) =>
    tier.estimates_per_month === null
      ? "Unlimited cost estimates"
      : `${plural(tier.estimates_per_month, "free cost estimate", "free cost estimates")} per month`;
  const messaging = (tier) =>
    tier.expert_conversations_per_month === null
      ? "Unlimited expert messaging"
      : `Message up to ${plural(tier.expert_conversations_per_month, "expert", "experts")} per month`;
  const listings = (tier) =>
    tier.active_listings === null
      ? "Unlimited property listings"
      : `List ${tier.active_listings === 1 ? "1 property" : `up to ${tier.active_listings} properties`}`;

  return {
    currency: "RWF",
    tiers: [
      {
        key: "starter",
        name: starter.label,
        tagline: "For individuals exploring a project",
        monthly: 0,
        annual: 0,
        features: [
          estimates(starter),
          "Browse the property marketplace and building plans",
          "Instant answers from the AI assistant",
          messaging(starter),
          listings(starter),
          "Email support",
        ],
      },
      {
        key: "professional",
        planValue: "professional",
        name: professional.label,
        tagline: "For clients actively building",
        monthly: PLAN_PRICES.professional.monthly,
        annual: PLAN_PRICES.professional.annual,
        highlighted: true,
        features: [
          "Everything in Starter",
          estimates(professional),
          professional.priority_review ? "Priority review - your estimates go to the front of the queue" : null,
          "Every building plan included - no per-plan fees",
          messaging(professional),
          listings(professional),
          "Payment history & receipts",
          "Priority support",
        ].filter(Boolean),
      },
      {
        key: "business",
        name: business.label,
        tagline: "For contractors, agencies & teams",
        monthly: null,
        annual: null,
        features: [
          "Everything in Professional",
          "Multiple team member seats",
          "Priority placement in the expert directory",
          "Bulk property & plan listings",
          "Dedicated account manager",
          "Custom invoicing",
        ],
      },
    ],
    // For anyone who's used their allowance or doesn't subscribe.
    payAsYouGo: [
      {
        key: "estimate",
        label: "Cost estimate",
        price: ESTIMATE_PRICES.estimate,
        description: "Your plan analysed and the cost breakdown verified by an expert.",
      },
      {
        key: "estimate_drawings",
        label: "Estimate + CAD drawings",
        price: ESTIMATE_PRICES.estimate_with_drawings,
        description: "The estimate plus the drawing set - floor plans, sections, roof and foundation - for AutoCAD and ArchiCAD.",
      },
      {
        key: "drawings_addon",
        label: "CAD drawing set add-on",
        price: DRAWINGS_ADDON_PRICE,
        description: "Add the drawing set to any estimate, whether it's free, bought or included in your plan.",
      },
      {
        key: "plan_estimate",
        label: "Building plan + cost estimate",
        price: null,
        addOn: ESTIMATE_PRICES.estimate,
        description: `Each plan has its own price. Add a cost estimate to any plan for ${fee(ESTIMATE_PRICES.estimate)}.`,
      },
    ],
  };
}
