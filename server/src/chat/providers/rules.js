/**
 * Layer 1 responder that needs no API key: keyword rules with fixed,
 * reviewed wording. Always available - it's also the fallback whenever the
 * language-model provider is switched off or fails.
 *
 * It never states a price, quantity, size or timeline. Those are facts the
 * backend agent (or a verified expert) has to produce; a chat responder
 * guessing them would be exactly the kind of made-up number the platform is
 * meant to replace. Anything needing figures is routed to Layer 2 before it
 * gets here (see ../intent.js).
 */

const ABOUT_US =
  "I can explain how CivilBridge works, help you choose between the [Estimator](/estimator), ready-made [Plans](/plans), verified [Experts](/experts) and the [Marketplace](/marketplace), and answer general construction questions.";

export function rulesReply(message) {
  const text = String(message || "").toLowerCase();

  if (/^(hi|hello|hey|muraho|mwiriwe|bite|good (morning|afternoon|evening))\b/.test(text.trim())) {
    return `Hello! ${ABOUT_US}\n\nFor an actual cost estimate or drawings, tell me about your project - or upload your plans in the [Estimator](/estimator).`;
  }

  if (/\b(how|where)\b.*\b(estimate|estimator|quote)\b|\bget an estimate\b/.test(text)) {
    return [
      "Getting an estimate takes three steps:",
      "",
      "**1.** Open the [Estimator](/estimator) and upload your plan (PDF, DWG, DXF, PLN, IFC or a ZIP of sheets).",
      "**2.** Choose the district and sector where you'll build.",
      "**3.** Submit it. We analyse your file, an expert verifies the result, and you're notified when your cost breakdown is ready.",
    ].join("\n");
  }

  if (/\b(subscription|pricing|upgrade|free credits?|professional plan|starter plan)\b/.test(text)) {
    return "You can see what each account level includes, and upgrade, on the [Pricing](/pricing) page. Everyone can use the free daily estimates; paid levels remove the daily limit and unlock the full plan downloads.";
  }

  if (/\b(expert|engineer|architect|contractor|surveyor)\b/.test(text)) {
    return "Every expert on the platform has a profile with their specialty, location and client reviews. Browse them on the [Experts](/experts) page, filter by district, and message one directly to talk through your project.";
  }

  if (/\b(ready[- ]?made|buy a plan|plans? (catalog|library)|browse plans|house plans?)\b/.test(text)) {
    return "The [Plans](/plans) page has ready-made designs. Each shows its layout and details up front, and the full drawing pack unlocks once you purchase it - so you can compare before you commit.";
  }

  if (/\b(property|properties|land for sale|for sale|for rent|marketplace)\b/.test(text)) {
    return "Listings are on the [Marketplace](/marketplace). Filter by district and sector, and use Schedule a Tour on any listing to arrange a visit through our team.";
  }

  if (/\bbrick\b/.test(text) && /\bblock\b/.test(text)) {
    return [
      "A quick comparison for the Rwandan market:",
      "",
      "**Burnt brick:** better thermal performance and a classic look, but slower to lay and more variable in quality between suppliers.",
      "**Concrete block:** faster to build with, consistent in size, and easy to source almost everywhere, with somewhat less insulation.",
      "",
      "Which is cheaper for *your* project depends on current local prices and wall area - that's something the [Estimator](/estimator) can work out from your plans.",
    ].join("\n");
  }

  if (/\bcommercial\b/.test(text)) {
    return [
      "Commercial buildings add a few things beyond a house:",
      "",
      "**Permits and zoning** for the intended use",
      "**Structural loads and fire safety** requirements",
      "**Parking and accessibility** provisions",
      "",
      "If you have a plan or brief, upload it in the [Estimator](/estimator); otherwise an architect from [Experts](/experts) can scope it with you.",
    ].join("\n");
  }

  if (/\b(sqm|plot|land|upi)\b/.test(text)) {
    return [
      "To work out what fits on a plot, an expert would want:",
      "",
      "**1.** The plot's size and shape (or its UPI number)",
      "**2.** Where it is - district and sector",
      "**3.** What you want to build, and roughly how many bedrooms",
      "",
      "Share those and I can point you to the right next step - or start in the [Estimator](/estimator).",
    ].join("\n");
  }

  return `Happy to help. ${ABOUT_US}\n\nTell me a little about what you're planning - what you want to build and where - and I'll point you to the right next step.`;
}

// Replies for a Layer 2 request when the backend agent isn't switched on.
// Honest about it, and useful: each points at something that works today.
export function agentUnavailableReply(intent) {
  const estimator = "the [Estimator](/estimator)";
  switch (intent) {
    case "drawings":
      return `Generating drawing sets from chat isn't switched on yet. You can browse ready-made designs with full drawing packs on the [Plans](/plans) page, or ask an architect from [Experts](/experts) about a custom design.`;
    case "pricing_lookup":
      return `I don't quote material prices from memory - they move, and a guess could cost you real money. Live price lookups aren't switched on yet. For a project-specific figure, upload your plan in ${estimator} and an expert will produce a verified breakdown.`;
    case "planning":
      return `Detailed planning analysis from chat isn't switched on yet. A verified expert can do this properly - browse [Experts](/experts) - or start in ${estimator} if you have a plan to work from.`;
    default:
      return `A proper cost estimate needs your actual plan, and that analysis isn't switched on in chat yet. The quickest way is ${estimator}: upload your plan, choose the district and sector, and you'll get an expert-verified cost breakdown. You'll be notified as soon as it's ready.`;
  }
}

// The "working on it" text shown while a Layer 2 job runs.
export function workingReply(intent) {
  const subject =
    { drawings: "your drawings", pricing_lookup: "the current prices", planning: "your planning analysis" }[intent] ||
    "your estimate";
  return `On it - I've handed this to our estimating engine to prepare ${subject}. Work like this can take a few minutes. You can keep chatting or leave this page; I'll notify you as soon as it's ready.`;
}
