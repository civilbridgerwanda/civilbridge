import { useState } from "react";
import { Link } from "react-router-dom";
import { Lock, FileCheck, Calculator } from "lucide-react";
import Modal from "./Modal";
import PaymentRequestModal from "./PaymentRequestModal";
import { usePricing } from "../lib/usePricing";

// The ways to get a plan's full drawing pack, opened from the plan page's
// "Download Everything" button. The client chooses:
//   - subscribe (Professional/Business include every plan)
//   - buy the plan on its own
//   - buy the plan together with a cost estimate
// The two purchases open the shared payment flow; once the team confirms the
// payment the plan page unlocks by itself (and, for the bundle, an estimate
// credit lands on the account) - nothing to re-request.
export default function PlanUnlockModal({ onClose, licensePrice, currency, planTitle, planId, onPurchased }) {
  const [checkout, setCheckout] = useState(null); // null | "plan_only" | "plan_estimate"
  const pricing = usePricing();

  // The estimate is added at its standard price - the same as buying one
  // separately - so the bundle has no hidden mark-up. Read from the server's
  // pricing config, never hardcoded here.
  const estimateAddOn = pricing?.payAsYouGo.find((p) => p.key === "plan_estimate")?.addOn ?? null;
  const base = licensePrice ? Number(licensePrice) : null;
  const bundlePrice = base != null && estimateAddOn != null ? base + estimateAddOn : null;
  const money = (n) => `${currency} ${Number(n).toLocaleString()}`;

  if (checkout) {
    const withEstimate = checkout === "plan_estimate";
    return (
      <PaymentRequestModal
        title={withEstimate ? "Plan + Cost Estimate" : "Download this plan"}
        summary={`${planTitle || "Plan"} - ${withEstimate ? "full drawing pack plus an expert-verified cost estimate" : "full drawing pack, every file and CAD source"}`}
        amount={withEstimate ? bundlePrice : base}
        currency={currency}
        payload={{ purpose: "plan_license", reference_id: planId, include_estimate: withEstimate }}
        onSubmitted={onPurchased}
        onClose={onClose}
      />
    );
  }

  return (
    <Modal title="Get this plan" onClose={onClose} maxWidth="max-w-md">
      <p className="text-sm text-slate-500">
        Choose how you'd like to get the full drawing pack{planTitle ? ` for "${planTitle}"` : ""} - every file, CAD
        source, and document owed to you on purchase.
      </p>

      <div className="mt-4 space-y-3">
        <div className="rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600">
              <FileCheck className="h-4 w-4" />
            </span>
            <p className="font-bold text-ink-900">Plan only</p>
            {base != null && <span className="ml-auto text-lg font-extrabold text-ink-900">{money(base)}</span>}
          </div>
          <p className="mt-2 text-sm text-slate-600">The full drawing pack for this plan, no subscription needed.</p>
          {base != null ? (
            <button
              type="button"
              onClick={() => setCheckout("plan_only")}
              className="mt-3 block w-full rounded-lg border border-slate-300 bg-slate-50 py-2 text-center text-sm font-semibold text-ink-900 transition-colors duration-200 hover:bg-slate-100"
            >
              Buy the plan only
            </button>
          ) : (
            <Link
              to="/contact"
              className="mt-3 block rounded-lg border border-slate-300 bg-slate-50 py-2 text-center text-sm font-semibold text-ink-900 transition-colors duration-200 hover:bg-slate-100"
            >
              Ask for a Quote
            </Link>
          )}
        </div>

        <div className="rounded-xl border border-gold-400 bg-gradient-to-br from-white to-amber-50 p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-500 text-white">
              <Calculator className="h-4 w-4" />
            </span>
            <p className="font-bold text-ink-900">Plan + cost estimate</p>
            {bundlePrice != null && <span className="ml-auto text-lg font-extrabold text-ink-900">{money(bundlePrice)}</span>}
          </div>
          <p className="mt-2 text-sm text-slate-600">
            The drawing pack plus an expert-verified cost estimate for your project
            {estimateAddOn != null && base != null ? ` - the estimate adds ${money(estimateAddOn)} to the plan price.` : "."}
          </p>
          {bundlePrice != null ? (
            <button
              type="button"
              onClick={() => setCheckout("plan_estimate")}
              className="mt-3 block w-full rounded-lg bg-gold-500 py-2 text-center text-sm font-semibold text-ink-900 transition-[background-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
            >
              Buy the plan + estimate
            </button>
          ) : (
            <Link
              to="/contact"
              className="mt-3 block rounded-lg bg-gold-500 py-2 text-center text-sm font-semibold text-ink-900 transition-[background-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
            >
              Ask for a Quote
            </Link>
          )}
        </div>

        <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-white">
              <Lock className="h-4 w-4" />
            </span>
            <p className="font-bold text-ink-900">Every plan, one subscription</p>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Professional and Business include every building plan - no per-plan fees.
          </p>
          <Link
            to="/pricing"
            className="mt-3 block rounded-lg bg-brand-500 py-2 text-center text-sm font-semibold text-white transition-[background-color,transform,box-shadow] duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-md active:translate-y-0"
          >
            See Plans
          </Link>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-slate-400">
        Pay by Mobile Money, bank transfer, or card. Once our team confirms your payment, your download unlocks
        automatically.
      </p>
    </Modal>
  );
}
