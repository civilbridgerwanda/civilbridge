import { Building2, ShieldCheck, Users } from "lucide-react";
import Seo from "../components/Seo";

const values = [
  {
    icon: Building2,
    title: "Built for Rwanda",
    body: "Pricing, materials, and regional data reflect the real Rwandan construction market — not generic global averages.",
  },
  {
    icon: ShieldCheck,
    title: "Expert-verified",
    body: "AI accelerates the first pass; licensed engineers and architects review before you build.",
  },
  {
    icon: Users,
    title: "One connected platform",
    body: "Estimates, plans, properties, and experts live in one place instead of scattered across spreadsheets and phone calls.",
  },
];

export default function About() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Seo title="About Us" description="The mission behind CivilBridge." path="/about" />

      <h1 className="text-4xl font-extrabold text-ink-900">About CivilBridge</h1>
      <p className="mt-4 text-lg text-slate-600">
        CivilBridge is a construction intelligence platform built for Rwanda's building
        industry. We help clients, engineers, architects, and contractors plan, estimate,
        and execute projects with realistic, locally-grounded numbers instead of guesswork.
      </p>
      <p className="mt-4 text-slate-600">
        Construction in Rwanda too often runs on rough estimates, disconnected contacts, and
        plans that live in someone's notebook. CivilBridge brings cost estimation, building
        plans, a verified property marketplace, and a directory of professionals into one
        platform — so a project has a clearer path from idea to completion.
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-3">
        {values.map((v) => {
          const Icon = v.icon;
          return (
            <div key={v.title} className="rounded-2xl border border-slate-200 p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-500">
                <Icon className="h-5 w-5" />
              </span>
              <p className="mt-4 font-bold text-ink-900">{v.title}</p>
              <p className="mt-2 text-sm text-slate-500">{v.body}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
