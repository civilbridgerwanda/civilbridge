import { useId } from "react";
import { DISTRICTS_BY_PROVINCE, sectorsOf } from "../lib/locations";

const FIELD =
  "w-full min-w-0 truncate rounded-lg border border-slate-300 bg-white text-ink-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";

const SIZES = {
  form: "px-3 py-2.5 text-sm",
  filter: "px-3 py-2 text-sm",
};

/**
 * The site's one location control: District first, then that district's
 * Sectors. Choosing a district fills the second list with only its sectors
 * (and clears any sector that no longer applies); the sector list stays
 * disabled until a district is chosen.
 *
 *   <LocationSelect district={d} sector={s} onChange={({ district, sector }) => ...} required />
 *
 * `mode="filter"` adds "All districts" / "All sectors" and hides the labels'
 * required marks - used on the browse pages. Values are "" when unchosen.
 */
export default function LocationSelect({
  district = "",
  sector = "",
  onChange,
  mode = "form",
  required = false,
  disabled = false,
  labels = true,
  className = "",
}) {
  const id = useId();
  const isFilter = mode === "filter";
  const size = SIZES[isFilter ? "filter" : "form"];
  const sectors = sectorsOf(district);

  return (
    <div className={`grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 ${className}`}>
      <div className="min-w-0">
        {labels && (
          <label htmlFor={`${id}-district`} className="block text-sm font-semibold text-ink-900">
            District{required && !isFilter && <span className="text-red-500"> *</span>}
          </label>
        )}
        <select
          id={`${id}-district`}
          aria-label={labels ? undefined : "District"}
          required={required}
          disabled={disabled}
          className={`${FIELD} ${size} ${labels ? "mt-1" : ""}`}
          value={district}
          // Changing district always resets the sector - a sector from the
          // previous district would otherwise silently stay selected.
          onChange={(e) => onChange({ district: e.target.value, sector: "" })}
        >
          <option value="">{isFilter ? "All districts" : "Select district…"}</option>
          {DISTRICTS_BY_PROVINCE.map((group) => (
            <optgroup key={group.province} label={group.province === "Kigali" ? "Kigali City" : `${group.province} Province`}>
              {group.districts.map((d) => (
                <option key={d.name} value={d.name}>
                  {d.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div className="min-w-0">
        {labels && (
          <label htmlFor={`${id}-sector`} className="block text-sm font-semibold text-ink-900">
            Sector{required && !isFilter && <span className="text-red-500"> *</span>}
          </label>
        )}
        <select
          id={`${id}-sector`}
          aria-label={labels ? undefined : "Sector"}
          required={required}
          disabled={disabled || !district}
          className={`${FIELD} ${size} ${labels ? "mt-1" : ""}`}
          value={sector}
          onChange={(e) => onChange({ district, sector: e.target.value })}
        >
          <option value="">
            {!district ? "Choose a district first" : isFilter ? "All sectors" : "Select sector…"}
          </option>
          {sectors.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
