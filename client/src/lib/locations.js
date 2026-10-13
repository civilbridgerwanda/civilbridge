import data from "../data/rwandaLocations.json";

// Rwanda's administrative areas down to sector level - the only granularity
// the site works with. A person picks a District, and only then that
// district's Sectors; exact addresses are never collected or shown.
// (server/src/data/rwandaLocations.json is the same file - the server is what
// actually enforces it, so a hand-made request can't invent a place.)

export const RWANDA_DISTRICTS = data.districts; // [{ name, province, sectors: [] }]

const byName = new Map(RWANDA_DISTRICTS.map((d) => [d.name, d]));

const PROVINCE_ORDER = ["Kigali", "East", "North", "South", "West"];

// [{ province: "Kigali", districts: [...] }, ...] - used to group the
// district dropdown so 30 entries are easy to scan.
export const DISTRICTS_BY_PROVINCE = PROVINCE_ORDER.map((province) => ({
  province,
  districts: RWANDA_DISTRICTS.filter((d) => d.province === province),
})).filter((group) => group.districts.length);

export function sectorsOf(districtName) {
  return byName.get(districtName)?.sectors ?? [];
}

/**
 * "Kimironko, Gasabo" - the one way a place is written across the site.
 * Older rows only have a free-text `city`, so that's the fallback.
 */
export function formatLocation(item) {
  if (!item) return "";
  const parts = [item.sector, item.district].filter(Boolean);
  return parts.length ? parts.join(", ") : item.city || "";
}
