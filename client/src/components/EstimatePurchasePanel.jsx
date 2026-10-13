import { Link } from "react-router-dom";
import { Calculator, Ruler, Crown } from "lucide-react";
import { rwf } from "../lib/usePricing";

// Shown in place of the submit button once the free estimate for the month is
// used up: the honest way forward, with the real prices, instead of a dead end.
// The client picks what they want - an estimate on its own, or an estimate
// with the CAD drawing set - and pays; when the team confirms the payment the
// credit lands on their account and the submit button comes back by itself.
export default function EstimatePurchasePanel({ prices, resetsAt, onBuy, pending }) {
  const resets = resetsAt ? new Date(resetsAt).toLocaleDateString(undefined, { day: "numeric", month: "long" }) : null;

  const options = [
    {
      key: "estimate",
      icon: Calculator,
      title: "Cost estimate",
      body: "Your plan analysed and the cost breakdown verified by an expert.",
      price: prices?.estimate,
    },
    {
      key: "estimate_drawings",
      icon: Ruler,
      title: "Estimate + CAD drawings",
      body: "Everything above, plus floor plans, sections, roof and foundation drawings for AutoCAD and ArchiCAD.",
      price: prices?.estimate_with_drawings,
      badge: "Most complete",
    },
  ];

  return (
    <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <p className="font-bold text-ink-900">You've used this month's free estimate</p>
      <p className="mt-1 text-sm text-slate-600">
        Choose how to continue - your uploaded plan stays right here.
        {resets && <> Your free estimate comes back on {resets}.</>}
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {options.map((o) => {
          const Icon = o.icon;
          return (
            <div key={o.key} className="flex flex-col rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-white">
                  <Icon className="h-4 w-4" />
                </span>
                <p className="font-bold text-ink-900">{o.title}</p>
                {o.badge && (
                  <span className="ml-auto rounded-full bg-gold-400 px-2 py-0.5 text-[11px] font-bold text-ink-900">{o.badge}</span>
                )}
              </div>
              <p className="mt-2 flex-1 text-sm text-slate-500">{o.body}</p>
              <p className="mt-3 text-2xl font-extrabold text-ink-900">{o.price ? rwf(o.price) : "-"}</p>
              <button
                type="button"
                disabled={!o.price}
                onClick={() => onBuy(o.key)}
                className="mt-3 rounded-lg bg-brand-500 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
              >
                Pay and continue
              </button>
            </div>
          );
        })}
      </div>

      {pending && (
        <p className="mt-4 rounded-lg bg-white px-4 py-2.5 text-sm text-slate-600">
          Payment received - we'll confirm it and your estimate unlocks here automatically.
        </p>
      )}

      <p className="mt-4 flex flex-wrap items-center gap-x-2 text-sm text-slate-600">
        <Crown className="h-4 w-4 text-gold-500" />
        Estimating often?
        <Link to="/pricing" className="font-semibold text-brand-500 hover:underline">
          Professional gives you unlimited estimates and priority review →
        </Link>
      </p>
    </div>
  );
}
