/**
 * Generates AI Studio replies.
 *
 * IMPORTANT: this is a rule-based placeholder, not a real language model.
 * It's wired up so the chat is genuinely functional end-to-end (message in,
 * saved, replied to, saved, streamed back to the UI) without requiring an
 * API key to demo. To upgrade to real AI, swap the body of this function
 * for a call to an LLM provider (e.g. the Anthropic API) with the
 * conversation history as context - everything else (persistence, the
 * chat UI, history sidebar) already works either way.
 */

const NUMBER_WORD_MULTIPLIERS = { million: 1_000_000, m: 1_000_000, billion: 1_000_000_000 };

function extractBudget(text) {
  const match = text.match(/(\d[\d,.]*)\s*(million|billion|m)\b/i);
  if (!match) return null;
  const raw = Number(match[1].replace(/,/g, ""));
  const mult = NUMBER_WORD_MULTIPLIERS[match[2].toLowerCase()] || 1;
  return Math.round(raw * mult);
}

function extractBedrooms(text) {
  const match = text.match(/(\d+)\s*[- ]?bedroom/i);
  return match ? Number(match[1]) : null;
}

function extractLocation(text) {
  const known = [
    "Kigali", "Gasabo", "Kicukiro", "Nyarugenge", "Kimihurura", "Gacuriro",
    "Rusororo", "Nyamirambo", "Kacyiru", "Nyarutarama", "Bugesera", "Remera", "Kimironko",
  ];
  const found = known.find((loc) => text.toLowerCase().includes(loc.toLowerCase()));
  return found || null;
}

function formatRWF(n) {
  return `RWF ${n.toLocaleString()}`;
}

export function generateReply(message) {
  const text = message.toLowerCase();
  const budget = extractBudget(message);
  const bedrooms = extractBedrooms(message);
  const location = extractLocation(message);

  // Someone described a specific building project with a budget.
  if (budget && (bedrooms || text.includes("build") || text.includes("house"))) {
    const perBedroomLow = 12_000_000;
    const perBedroomHigh = 18_000_000;
    const bd = bedrooms || 3;
    const suitable = budget >= bd * perBedroomLow;
    const sizeLow = 50 + bd * 40;
    const sizeHigh = 60 + bd * 50;

    return [
      `Great! A ${formatRWF(budget)} budget for a ${bd}-bedroom house${location ? ` in ${location}` : ""} is ${suitable ? "realistic and achievable" : "tight but workable with some trade-offs"}. Let me help you understand what's possible:`,
      "",
      "**Feasibility Analysis:**",
      `${suitable ? "✓" : "⚠"} Budget is ${suitable ? "suitable for a quality" : "workable for a modest"} ${bd}-bedroom house`,
      `✓ Estimated building size: ${sizeLow}-${sizeHigh} sqm`,
      `✓ Construction timeline: ${6 + bd}-${8 + bd} months`,
      "",
      "**What I can do next:**",
      "1. Generate a detailed cost estimate",
      "2. Create custom design options",
      "3. Analyze your land requirements",
      "4. Connect you with verified engineers",
      "",
      "What would you like to explore first?",
    ].join("\n");
  }

  // Material comparison question.
  if (text.includes("brick") && text.includes("block")) {
    return [
      "Here's a quick comparison for the Rwandan market:",
      "",
      "**Burnt brick:** Better thermal performance, classic look, typically 10-15% more expensive per sqm, slightly longer construction time.",
      "**Concrete block:** Faster to build with, more consistent pricing, easier to source everywhere, slightly less thermal insulation.",
      "",
      "For most residential builds we'd suggest block for cost predictability, with brick as an accent on street-facing walls. Want a cost comparison for your specific project size?",
    ].join("\n");
  }

  // Commercial building.
  if (text.includes("commercial")) {
    return [
      "Commercial builds have a few extra considerations beyond residential:",
      "",
      "**Feasibility Analysis:**",
      "✓ Zoning and commercial permits (allow 4-8 weeks)",
      "✓ Higher structural loads and fire-safety requirements",
      "✓ Parking and accessibility requirements",
      "",
      "**What I can do next:**",
      "1. Generate a detailed cost estimate",
      "2. Create custom design options",
      "3. Connect you with a commercial-experienced contractor",
      "",
      "Tell me the size and location and I can narrow this down further.",
    ].join("\n");
  }

  // Land / plot question.
  if (text.includes("sqm") || text.includes("plot") || text.includes("land")) {
    return [
      "Happy to help think through what fits on a plot like that.",
      "",
      "**What I'll need to give you a solid answer:**",
      "1. The plot's exact size and dimensions (or a UPI number, if you have one)",
      "2. Your target number of bedrooms or building type",
      "3. Your approximate budget",
      "",
      "Share those and I can outline realistic building options and next steps.",
    ].join("\n");
  }

  // Generic fallback.
  return [
    "I can help with that. To give you a useful answer, it helps to know your budget, the number of bedrooms (or building type), and the location.",
    "",
    "You can also try one of the quick actions below, or ask me things like construction costs, material choices, or land feasibility.",
  ].join("\n");
}
