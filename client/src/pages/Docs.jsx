import { Link } from "react-router-dom";
import { Calculator, Home as HomeIcon, FileText, Sparkles, Users, ArrowRight } from "lucide-react";
import Seo from "../components/Seo";

const sections = [
  {
    icon: Calculator,
    title: "Cost Estimator",
    body: "Upload a plan or describe your project conversationally to get an AI-generated, Rwanda-specific cost estimate.",
    to: "/estimator",
  },
  {
    icon: HomeIcon,
    title: "Marketplace",
    body: "Browse verified houses, land, and commercial properties, with filters for location, price, and type.",
    to: "/marketplace",
  },
  {
    icon: FileText,
    title: "Plans Library",
    body: "Ready-made building plans with pricing, or generate a custom one in AI Studio.",
    to: "/plans",
  },
  {
    icon: Sparkles,
    title: "AI Studio",
    body: "A conversational assistant for feasibility checks, document generation, and custom plan requests.",
    to: "/ai-studio",
  },
  {
    icon: Users,
    title: "Expert Directory",
    body: "Find and message verified engineers, architects, contractors, and surveyors.",
    to: "/experts",
  },
];

export default function Docs() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Seo
        title="Documentation"
        description="An overview of how CivilBridge's estimator, marketplace, plans, and AI Studio work together."
        path="/docs"
      />

      <h1 className="text-4xl font-extrabold text-ink-900">Documentation</h1>
      <p className="mt-4 text-lg text-slate-600">
        CivilBridge doesn't have a separate docs site yet — the platform itself is the best
        reference. Below is a short overview of each section and what it's for.
      </p>

      <div className="mt-10 space-y-4">
        {sections.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.title}
              to={s.to}
              className="flex items-start gap-4 rounded-2xl border border-slate-200 p-5 transition-colors duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:border-brand-300 hover:bg-brand-50"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-500">
                <Icon className="h-5 w-5" />
              </span>
              <span className="flex-1">
                <span className="flex items-center gap-1.5 font-bold text-ink-900">
                  {s.title} <ArrowRight className="h-3.5 w-3.5" />
                </span>
                <span className="mt-1 block text-sm text-slate-500">{s.body}</span>
              </span>
            </Link>
          );
        })}
      </div>

      <p className="mt-10 text-sm text-slate-500">
        Can't find what you're looking for?{" "}
        <Link to="/contact" className="font-semibold text-brand-600 hover:underline">
          Contact us
        </Link>{" "}
        and we'll help directly.
      </p>
    </div>
  );
}
