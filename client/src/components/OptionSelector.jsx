// A labeled dropdown for a real pre-sale question (e.g. "Lot Orientation") -
// controlled from the parent so the selection can be sent along with an
// inquiry. Kept intentionally simple: it doesn't change price/images/specs
// itself, since a plan's price/drawings are fixed - it's just answering a
// question the team would ask anyway.
export default function OptionSelector({ label, options, value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-ink-900">{label}</label>
      <select
        className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-400 focus:outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
