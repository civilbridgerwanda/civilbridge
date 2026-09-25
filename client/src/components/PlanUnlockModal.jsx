import { useState } from "react";
import { Link } from "react-router-dom";
import { Lock, FileCheck, Calculator } from "lucide-react";
import Modal from "./Modal";
import PaymentRequestModal from "./PaymentRequestModal";
import { ESTIMATE_BUNDLE_MULTIPLIER } from "../lib/paymentMethods";

// The ways to get a plan's full drawing pack, opened from the plan page's
// "Download Everything" button:
//   - subscribe (Professional/Business include unlimited downloads)
//   - buy just this plan (pay as you go)
//   - buy it bundled with an expert cost estimate
// The two purchases open the shared payment flow; once the team confirms
// the payment, the plan page unlocks by itself - nothing to re-request.
export default function PlanUnlockModal({ onClose, licensePrice, currency, planTitle, planId, onPurchased }) {
  const [checkout, setCheckout] = useState(null); // null | "license" | "bundle"

  // Priced a little above the plain license - framed as an upgrade you get
  // more from, not a consolation for losing the standalone estimator link.
  const bundlePrice = licensePrice ? Math.round(Number(licensePrice) * ESTIMATE_BUNDLE_MULTIPLIER) : null;

  if (checkout) {
    const withEstimate = checkout === "bundle";
    return (
      <PaymentRequestModal
        title={withEstimate ? "Download + Cost Estimate" : "Download this plan"}
        summary={`${planTitle || "Plan"} - ${withEstimate ? "full drawing pack plus an expert-verified cost estimate" : "full drawing pack, every file and CAD source"}`}
        amount={withEstimate ? bundlePrice : licensePrice}
        currency={currency}
        payload={{ purpose: "plan_license", reference_id: planId, include_estimate: withEstimate }}
        onSubmitted={onPurchased}
        onClose={onClose}
      />
    );
  }

  return (
    <Modal title="Download Everything" onClose={onClose} maxWidth="max-w-md">
      <p className="text-sm text-slate-500">
        Choose how you'd like to get the full drawing pack{planTitle ? ` for "${planTitle}"` : ""} - every file,
        CAD source, and document owed to you on purchase.
      </p>

      <div className="mt-4 space-y-3">
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-white">
              <Lock className="h-4 w-4" />
            </span>
            <p className="font-bold text-ink-900">Subscription</p>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Unlock unlimited plan downloads with a Professional or Business plan.
          </p>
          <Link
            to="/pricing"
            className="mt-3 block rounded-lg bg-brand-500 py-2 text-center text-sm font-semibold text-white transition-[background-color,transform,box-shadow] duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-md active:translate-y-0"
          >
            See Plans
          </Link>
        </div>

        <div className="rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600">
              <FileCheck className="h-4 w-4" />
            </span>
            <p className="font-bold text-ink-900">Pay As You Go</p>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            {licensePrice
              ? `Download this single drawing pack for ${currency} ${Number(licensePrice).toLocaleString()}.`
              : "Download just this single drawing pack, no subscription needed."}
          </p>
          {licensePrice ? (
            <button
              type="button"
              onClick={() => setCheckout("license")}
              className="mt-3 block w-full rounded-lg border border-slate-300 bg-slate-50 py-2 text-center text-sm font-semibold text-ink-900 transition-colors duration-200 hover:bg-slate-100"
            >
              Buy This Plan
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
            <p className="font-bold text-ink-900">Download + Cost Estimate</p>
            <span className="ml-auto rounded-full bg-gold-400 px-2 py-0.5 text-[11px] font-bold text-ink-900">Best Value</span>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            {bundlePrice
              ? `Get the drawing pack plus a full expert-verified cost estimate for ${currency} ${bundlePrice.toLocaleString()}.`
              : "Get the drawing pack plus a full expert-verified cost estimate for this plan."}
          </p>
          {bundlePrice ? (
            <button
              type="button"
              onClick={() => setCheckout("bundle")}
              className="mt-3 block w-full rounded-lg bg-gold-500 py-2 text-center text-sm font-semibold text-ink-900 transition-[background-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
            >
              Buy This Bundle
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
      </div>

      <p className="mt-4 text-center text-xs text-slate-400">
        Pay by Mobile Money, bank transfer, or card. Once our team confirms your payment, your download unlocks
        automatically.
      </p>
    </Modal>
  );
}
