/**
 * The provider-neutral shapes that cross the agent boundary.
 *
 * Whatever sits behind the agent layer (n8n, a proprietary model) receives a
 * job request and answers with a "report". Anything it sends back is
 * untrusted input, so every field is validated/clamped here before it can
 * touch the database.
 */

export const DELIVERABLE_KINDS = [
  "floor_plan",
  "elevation",
  "section",
  "roof_plan",
  "foundation_plan",
  "site_plan",
  "structural",
  "mep",
  "render_2d",
  "render_3d",
  "boq",
  "report",
  "other",
];

// What an Estimator upload asks the agent to produce - sent with every
// estimate job so the workflow knows the full scope without hardcoding it.
// Drawings are a paid add-on, so they're only requested when the client bought
// one for this estimate.
export function estimateDeliverables({ drawings = false } = {}) {
  return {
    cost: ["boq", "cost_breakdown", "timeline"],
    drawings: drawings ? ["floor_plan", "elevation", "section", "roof_plan", "foundation_plan", "site_plan"] : [],
    visuals: drawings ? ["render_2d", "render_3d"] : [],
    // Every drawing should be importable into the tools designers already use.
    drawing_formats: drawings ? ["dwg", "dxf", "ifc", "pdf"] : [],
    visual_formats: drawings ? ["png", "jpg"] : [],
  };
}

// Formats a designer can open in the tools they already use - AutoCAD reads
// DWG/DXF, ArchiCAD/Revit import DWG/DXF/IFC, everything reads PDF.
export const CAD_FORMATS = ["dwg", "dxf", "ifc", "pdf", "svg"];
export const IMAGE_FORMATS = ["png", "jpg", "jpeg", "webp"];

const str = (value, max) => (typeof value === "string" ? value.trim().slice(0, max) : "");
const num = (value) => {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
};
const round2 = (n) => Math.round(n * 100) / 100;

function formatFromUrl(url) {
  const match = url.split(/[?#]/)[0].match(/\.([a-z0-9]{2,5})$/i);
  return match ? match[1].toLowerCase() : null;
}

function isHttpUrl(value) {
  try {
    const { protocol } = new URL(value);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

export function normalizeItems(rawItems) {
  if (!Array.isArray(rawItems)) return [];
  const items = [];
  for (const raw of rawItems.slice(0, 500)) {
    const item_name = str(raw?.item_name ?? raw?.name, 200);
    if (!item_name) continue;
    const quantity = num(raw.quantity);
    const unit_price = num(raw.unit_price);
    let total_price = num(raw.total_price);
    if (total_price == null && quantity != null && unit_price != null) total_price = round2(quantity * unit_price);
    items.push({
      item_name,
      unit: str(raw.unit, 30) || null,
      quantity: quantity != null && quantity >= 0 ? quantity : null,
      unit_price: unit_price != null && unit_price >= 0 ? unit_price : null,
      total_price: total_price != null && total_price >= 0 ? total_price : null,
    });
  }
  return items;
}

export function normalizeDeliverables(rawList) {
  if (!Array.isArray(rawList)) return [];
  const out = [];
  for (const raw of rawList.slice(0, 100)) {
    const url = str(raw?.url, 500);
    if (!url || !isHttpUrl(url)) continue; // no javascript:, data:, file: links, ever
    const kind = DELIVERABLE_KINDS.includes(raw.kind) ? raw.kind : "other";
    const format = (str(raw.format, 20) || formatFromUrl(url) || "").toLowerCase() || null;
    out.push({ kind, format, label: str(raw.label, 200) || kind.replace(/_/g, " "), url });
  }
  return out;
}

/**
 * Cleans a "result" object from the agent (or from an expert typing results
 * in by hand - same shape on purpose, so a human is just another provider).
 */
export function normalizeResult(raw) {
  const result = raw && typeof raw === "object" ? raw : {};
  const items = normalizeItems(result.items);
  const itemsTotal = items.reduce((sum, item) => sum + (item.total_price || 0), 0);
  const declared = num(result.estimated_cost);
  return {
    summary: str(result.summary, 4000) || null,
    timeline: str(result.timeline, 200) || null,
    notes: str(result.notes, 4000) || null,
    currency: str(result.currency, 10).toUpperCase() || "RWF",
    estimated_cost: declared != null && declared >= 0 ? round2(declared) : items.length ? round2(itemsTotal) : null,
    items,
    deliverables: normalizeDeliverables(result.deliverables),
    reply: str(result.reply, 8000) || null, // chat_task answers
  };
}

// What the client is allowed to know about a job - never input, raw result
// or internal error text.
export function publicJob(job) {
  return {
    id: job.id,
    kind: job.kind,
    status: job.status,
    stage: job.stage || null,
    progress: job.progress ?? null,
    estimate_id: job.estimate_id || null,
    conversation_id: job.conversation_id || null,
    updated_at: job.updated_at,
    completed_at: job.completed_at || null,
  };
}
