// A Monthly/Annual switch with a sliding thumb behind the active label,
// rather than two independently-colored buttons that just swap color.
// grid-cols-2 keeps both halves exactly equal width so the absolutely
// positioned thumb's translate-x-full lines up perfectly with either side.
export default function BillingToggle({ value, onChange }) {
  return (
    <div className="relative mt-8 inline-grid grid-cols-2 rounded-full border border-slate-200 bg-white p-1">
      <div
        className={`absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-brand-500 transition-transform duration-200 ease-[cubic-bezier(.22,.61,.36,1)] ${
          value === "annual" ? "translate-x-full" : "translate-x-0"
        }`}
        aria-hidden="true"
      />
      <button
        type="button"
        onClick={() => onChange("monthly")}
        aria-pressed={value === "monthly"}
        className={`relative z-10 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors duration-200 ease-[cubic-bezier(.22,.61,.36,1)] ${
          value === "monthly" ? "text-white" : "text-slate-500 hover:text-ink-900"
        }`}
      >
        Monthly
      </button>
      <button
        type="button"
        onClick={() => onChange("annual")}
        aria-pressed={value === "annual"}
        className={`relative z-10 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors duration-200 ease-[cubic-bezier(.22,.61,.36,1)] ${
          value === "annual" ? "text-white" : "text-slate-500 hover:text-ink-900"
        }`}
      >
        Annual <span className="text-xs">(save ~17%)</span>
      </button>
    </div>
  );
}
