import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Sparkles, Clock, Calculator, Ruler, FileCheck, Loader2 } from "lucide-react";
import Seo from "../components/Seo";
import BillingToggle from "../components/BillingToggle";
import { useAuth } from "../lib/AuthContext";
import PaymentRequestModal from "../components/PaymentRequestModal";
import { rwf, usePricing } from "../lib/usePricing";

// Where each plan's button leads for someone who isn't upgrading in-app.
const CTA = {
  starter: { label: "Get Started Free", to: "/get-started" },
  professional: { label: "Get Started", to: "/get-started" },
  business: { label: "Contact Sales", to: "/contact" },
};

const PAYG_ICONS = { estimate: Calculator, estimate_drawings: Ruler, drawings_addon: Ruler, plan_estimate: FileCheck };

function formatPrice(amount) {
  if (amount === null) return "Custom";
  if (amount === 0) return "Free";
  return rwf(amount);
}

export default function Pricing() {
  const { user, token } = useAuth();
  // Everything on this page - plan features, limits, prices - comes from the
  // server's pricing config, the same numbers it enforces. Nothing is typed
  // here, so the page can't promise more (or less) than the system allows.
  const catalog = usePricing();
  const [billing, setBilling] = useState("monthly");
  const [checkoutPlan, setCheckoutPlan] = useState(null); // the tier being paid for
  const [requestedPlan, setRequestedPlan] = useState(user?.requested_plan ?? null);

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <Seo
        title="Pricing"
        description="CivilBridge pricing plans for clients, experts, and businesses in Rwanda."
        path="/pricing"
      />

      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600">
          <Sparkles className="h-3.5 w-3.5" /> Simple, transparent pricing
        </span>
        <h1 className="mt-4 text-4xl font-extrabold text-ink-900">Plans for every stage of building</h1>
        <p className="mx-auto mt-3 max-w-xl text-slate-500">
          Start free, upgrade when you need more - or just pay for what you use. Every estimate is verified by a real expert.
        </p>

        <BillingToggle value={billing} onChange={setBilling} />
      </div>

      {!catalog ? (
        <div className="flex justify-center py-24 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {catalog.tiers.map((plan) => {
              const price = billing === "monthly" ? plan.monthly : plan.annual;
              const cta = CTA[plan.key];
              return (
                <div
                  key={plan.key}
                  className={`relative flex flex-col rounded-2xl border p-8 ${
                    plan.highlighted
                      ? "border-brand-500 shadow-card-featured ring-2 ring-brand-100"
                      : "border-slate-200 shadow-card-rest"
                  }`}
                >
                  {plan.highlighted && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-500 px-3 py-1 text-xs font-semibold text-white">
                      Most Popular
                    </span>
                  )}

                  <h2 className="text-lg font-bold text-ink-900">{plan.name}</h2>
                  <p className="mt-1 text-sm text-slate-500">{plan.tagline}</p>

                  <div className="mt-6">
                    {price !== null && price > 0 ? (
                      <span className="text-3xl font-extrabold text-ink-900">
                        <span className="mr-1 align-top text-lg font-bold text-slate-500">RWF</span>
                        {price.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-3xl font-extrabold text-ink-900">{formatPrice(price)}</span>
                    )}
                    {price !== null && price > 0 && (
                      <span className="text-sm text-slate-500"> / {billing === "monthly" ? "month" : "year"}</span>
                    )}
                  </div>

                  <ul className="mt-6 flex-1 space-y-3">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {plan.planValue && token && user?.plan === plan.planValue ? (
                    <span className="mt-8 block rounded-lg border border-emerald-200 bg-emerald-50 py-2.5 text-center text-sm font-semibold text-emerald-700">
                      Current Plan
                    </span>
                  ) : plan.planValue && token && requestedPlan === plan.planValue ? (
                    <span className="mt-8 flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 py-2.5 text-center text-sm font-semibold text-slate-500">
                      <Clock className="h-4 w-4" /> Request Pending
                    </span>
                  ) : plan.planValue && token ? (
                    <button
                      type="button"
                      onClick={() => setCheckoutPlan(plan)}
                      className="mt-8 block w-full rounded-lg bg-brand-500 py-2.5 text-center text-sm font-semibold text-white transition-[background-color,opacity,transform,box-shadow] duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-md active:translate-y-0"
                    >
                      Upgrade to {plan.name}
                    </button>
                  ) : (
                    <Link
                      to={cta.to}
                      className={`mt-8 block rounded-lg py-2.5 text-center text-sm font-semibold transition-colors duration-200 ease-[cubic-bezier(.22,.61,.36,1)] ${
                        plan.highlighted
                          ? "bg-brand-500 text-white transition-[background-color,transform,box-shadow] duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-md active:translate-y-0"
                          : "border border-slate-300 bg-slate-50 text-ink-900 hover:bg-slate-100"
                      }`}
                    >
                      {cta.label}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pay as you go - for anyone who's used their allowance or would
              rather not subscribe. Drawings are an extra on any estimate. */}
          <section className="mt-16">
            <div className="text-center">
              <h2 className="text-2xl font-extrabold text-ink-900">Or pay as you go</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
                No subscription needed. Buy exactly what you need, when you need it.
              </p>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {catalog.payAsYouGo.map((item) => {
                const Icon = PAYG_ICONS[item.key] || Calculator;
                return (
                  <div key={item.key} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500 text-white">
                      <Icon className="h-5 w-5" />
                    </span>
                    <p className="mt-4 font-bold text-ink-900">{item.label}</p>
                    <p className="mt-2 flex-1 text-sm text-slate-500">{item.description}</p>
                    <p className="mt-4 text-2xl font-extrabold text-ink-900">
                      {item.price != null ? rwf(item.price) : `+ ${rwf(item.addOn)}`}
                    </p>
                    {item.price == null && <p className="text-xs text-slate-400">on top of the plan's own price</p>}
                  </div>
                );
              })}
            </div>
            <div className="mt-6 text-center">
              <Link
                to="/estimator"
                className="inline-block rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
              >
                Get an estimate
              </Link>
              <Link to="/plans" className="ml-4 text-sm font-semibold text-brand-500 hover:underline">
                Browse building plans →
              </Link>
            </div>
          </section>
        </>
      )}

      <div className="mt-12 rounded-xl bg-amber-50 px-5 py-4 text-center text-sm text-amber-800">
        <strong>How payment works:</strong> choose Mobile Money, bank transfer, or card, and submit
        your request. Our team confirms the payment, and what you bought unlocks automatically.
        Prices shown are not final and may change before launch.
      </div>

      {checkoutPlan && (
        <PaymentRequestModal
          title={`Upgrade to ${checkoutPlan.name}`}
          summary={`${checkoutPlan.name} plan - billed ${billing === "monthly" ? "monthly" : "annually"}`}
          amount={billing === "monthly" ? checkoutPlan.monthly : checkoutPlan.annual}
          payload={{ purpose: "plan_upgrade", target_plan: checkoutPlan.planValue, billing_period: billing }}
          onSubmitted={() => setRequestedPlan(checkoutPlan.planValue)}
          onClose={() => setCheckoutPlan(null)}
        />
      )}

      <div className="mt-16 text-center">
        <p className="text-slate-500">Have questions about which plan fits your project?</p>
        <Link to="/contact" className="mt-2 inline-block font-semibold text-brand-500 hover:underline">
          Talk to our team →
        </Link>
      </div>
    </div>
  );
}
