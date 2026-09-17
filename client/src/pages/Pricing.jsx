import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Sparkles } from "lucide-react";
import Seo from "../components/Seo";

const PLANS = [
  {
    name: "Starter",
    tagline: "For individuals exploring a project",
    monthly: 0,
    annual: 0,
    cta: { label: "Get Started Free", to: "/get-started" },
    features: [
      "AI-assisted cost estimates",
      "Browse the property marketplace",
      "Browse building plans",
      "Message up to 3 experts per month",
      "Email support",
    ],
  },
  {
    name: "Professional",
    tagline: "For clients actively building",
    monthly: 15000,
    annual: 150000,
    highlighted: true,
    // Softened from "Get Started" - this tier has a specific paid price
    // that the disclosure above says isn't final yet, so an urgent
    // sign-up CTA right under that disclosure reads as a contradiction.
    cta: { label: "Join the Waitlist", to: "/get-started" },
    features: [
      "Everything in Starter",
      "Unlimited expert messaging",
      "Priority estimate review",
      "List properties with featured placement",
      "Payment history & receipts",
      "Priority support",
    ],
  },
  {
    name: "Business",
    tagline: "For contractors, agencies & teams",
    monthly: null,
    annual: null,
    cta: { label: "Contact Sales", to: "/contact" },
    features: [
      "Everything in Professional",
      "Multiple team member seats",
      "Verified expert badge & directory boost",
      "Bulk property & plan listings",
      "Dedicated account manager",
      "Custom invoicing",
    ],
  },
];

function formatPrice(amount) {
  if (amount === null) return "Custom";
  if (amount === 0) return "Free";
  return `RWF ${amount.toLocaleString()}`;
}

export default function Pricing() {
  const [billing, setBilling] = useState("monthly");

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
          Start free, upgrade when you need more. Prices shown are illustrative and will be
          finalized before billing goes live.
        </p>

        <div className="mt-8 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setBilling("monthly")}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors duration-200 ease-[cubic-bezier(.22,.61,.36,1)] ${
              billing === "monthly" ? "bg-brand-500 text-white" : "text-slate-500 hover:text-ink-900"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBilling("annual")}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors duration-200 ease-[cubic-bezier(.22,.61,.36,1)] ${
              billing === "annual" ? "bg-brand-500 text-white" : "text-slate-500 hover:text-ink-900"
            }`}
          >
            Annual <span className="text-xs">(save ~17%)</span>
          </button>
        </div>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {PLANS.map((plan) => {
          const price = billing === "monthly" ? plan.monthly : plan.annual;
          return (
            <div
              key={plan.name}
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

              <Link
                to={plan.cta.to}
                className={`mt-8 block rounded-lg py-2.5 text-center text-sm font-semibold transition-colors duration-200 ease-[cubic-bezier(.22,.61,.36,1)] ${
                  plan.highlighted
                    ? "bg-brand-500 text-white transition-[background-color,transform,box-shadow] duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-md active:translate-y-0"
                    : "border border-slate-300 bg-slate-50 text-ink-900 hover:bg-slate-100"
                }`}
              >
                {plan.cta.label}
              </Link>
            </div>
          );
        })}
      </div>

      <div className="mt-12 rounded-xl bg-amber-50 px-5 py-4 text-center text-sm text-amber-800">
        <strong>Note:</strong> billing isn't live yet — no card details are collected here.
        Pricing and plan details above are placeholders and will be updated once payment
        processing is connected (see the Payments section of the README).
      </div>

      <div className="mt-16 text-center">
        <p className="text-slate-500">Have questions about which plan fits your project?</p>
        <Link to="/contact" className="mt-2 inline-block font-semibold text-brand-500 hover:underline">
          Talk to our team →
        </Link>
      </div>
    </div>
  );
}
