/**
 * Layer routing for the hybrid chat.
 *
 *   Layer 1 - conversational: greetings, how the platform works, general
 *             construction questions. Answered instantly by the chat provider.
 *   Layer 2 - agent work: anything that needs real data or heavy compute -
 *             cost estimates, live material prices (database lookups), full
 *             drawing sets, feasibility/scheduling analysis. Handed to the
 *             backend agent as a job; the chat shows "working on it" and the
 *             answer replaces that message when the job finishes.
 *
 * This is deliberately plain, deterministic rules: free, instant, testable,
 * and it can never "decide" to burn agent time on small talk. When Layer 1 is
 * later a real language model, this file is the one seam to replace - expose
 * a single `request_agent_task` tool to the model and let it decide. Nothing
 * downstream (jobs, callback, the chat UI) has to change, because they only
 * see the { layer, intent } this returns.
 */

export const INTENTS = {
  estimate: "estimate",
  drawings: "drawings",
  pricing_lookup: "pricing_lookup",
  planning: "planning",
  general: "general",
};

// Questions ABOUT CivilBridge itself always stay in Layer 1, even when they
// contain cost-ish words ("how much does CivilBridge cost?").
const PLATFORM =
  /\b(civilbridge|civil bridge|this (site|website|platform|app)|your (plans?|pricing|prices|subscription|service|platform|fees?)|subscription|sign ?(up|in)|log ?in|register|my account|password|payment methods?|mobile money|contact (you|support|us)|free credits?|upgrade)\b/;

const MATERIALS =
  "cement|rebar|steel|sand|gravel|aggregate|bricks?|blocks?|roofing|iron sheets?|tiles?|paint|timber|concrete|labou?r";

const DRAWING =
  /\b(floor ?plans?|elevations?|section drawings?|sections?|roof plans?|foundation plans?|site plans?|structural drawings?|drawing sets?|3d (model|view|render(ing)?s?)|renders?|autocad|archicad|dwg|dxf|ifc|cad (files?|drawings?)|blueprints?)\b/;
const DRAFT_VERB =
  /\b(generate|create|draw|draft|design|make|produce|prepare|give me|i need|i want|can you|could you|please)\b/;
const PRICE_LOOKUP = new RegExp(
  [
    `\\b(price|prices|rate|rates|cost|costs)\\b.*\\b(${MATERIALS})\\b`,
    `\\b(${MATERIALS})\\b.*\\b(price|prices|rate|rates|cost|costs)\\b`,
    `\\bhow much\\b.*\\b(${MATERIALS})\\b`,
    `\\b(${MATERIALS})\\b.*\\bper (kg|bag|m2|m3|sqm|tonne|ton|piece|sheet|day)\\b`,
  ].join("|")
);
const ESTIMATE =
  /\b(estimate|estimation|how much (would|will|does|do|is|for)|cost (of|to|for)|total cost|building cost|budget (breakdown|for)|bill of quantities|boq|quantity take-?off)\b/;
const BUILD_WITH_BUDGET = /\b(build|construct)\b.*\b\d[\d,.]*\s*(million|m|rwf|frw)\b/;
const PLANNING =
  /\b(schedule|timeline|phasing|programme|structural (design|analysis|calculations?)|load calculations?|feasib(le|ility)|compare (quotes|contractors|bids))\b/;

/** @returns {{ layer: 1 | 2, intent: keyof typeof INTENTS }} */
export function routeMessage(message) {
  const text = String(message || "").toLowerCase().replace(/\s+/g, " ").trim();
  const general = { layer: 1, intent: INTENTS.general };

  // Too little to task an agent with - Layer 1 asks for the missing detail.
  if (text.split(" ").length < 4) return general;

  if (DRAWING.test(text) && DRAFT_VERB.test(text)) return { layer: 2, intent: INTENTS.drawings };
  if (PLATFORM.test(text)) return general;
  if (PRICE_LOOKUP.test(text)) return { layer: 2, intent: INTENTS.pricing_lookup };
  if (ESTIMATE.test(text) || BUILD_WITH_BUDGET.test(text)) return { layer: 2, intent: INTENTS.estimate };
  if (PLANNING.test(text)) return { layer: 2, intent: INTENTS.planning };
  return general;
}
