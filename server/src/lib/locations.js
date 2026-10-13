import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Rwanda's administrative hierarchy as far down as the app needs it:
// province -> district -> sector. (Cells and villages are deliberately left
// out - exact addresses aren't shown publicly.) The same JSON file is copied
// to client/src/data/rwandaLocations.json for the dropdowns; the server is
// the one that enforces it, so a hand-written request can't store a district
// or sector that doesn't exist.
const dataPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "../data/rwandaLocations.json");
const { districts: DISTRICTS } = JSON.parse(fs.readFileSync(dataPath, "utf8"));

const districtByKey = new Map(DISTRICTS.map((d) => [d.name.toLowerCase(), d]));

export class LocationError extends Error {}

const clean = (value) => (typeof value === "string" ? value.trim() : "");

/**
 * Validates a District (+ optional Sector) pair and returns the canonical
 * spelling of each, or { district: null, sector: null } when none was given.
 * Throws LocationError with a user-presentable message otherwise.
 *
 *   resolveLocation(body.district, body.sector, { required: true })
 */
export function resolveLocation(districtInput, sectorInput, { required = false, sectorRequired = false } = {}) {
  const districtName = clean(districtInput);
  const sectorName = clean(sectorInput);

  if (!districtName) {
    if (sectorName) throw new LocationError("Choose a district before choosing a sector.");
    if (required) throw new LocationError("Please choose a district.");
    return { district: null, sector: null };
  }

  const district = districtByKey.get(districtName.toLowerCase());
  if (!district) throw new LocationError(`"${districtName}" isn't one of Rwanda's districts.`);

  if (!sectorName) {
    if (sectorRequired) throw new LocationError(`Please choose a sector in ${district.name}.`);
    return { district: district.name, sector: null };
  }

  const sector = district.sectors.find((s) => s.toLowerCase() === sectorName.toLowerCase());
  if (!sector) throw new LocationError(`"${sectorName}" isn't a sector of ${district.name} district.`);
  return { district: district.name, sector };
}

/** "Kimironko, Gasabo" - falls back to a legacy `city` value on old rows. */
export function formatLocation({ sector, district, city } = {}) {
  const parts = [sector, district].filter(Boolean);
  return parts.length ? parts.join(", ") : city || "";
}
