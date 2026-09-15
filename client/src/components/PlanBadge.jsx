import { Link } from "react-router-dom";
import { Crown, Sparkles } from "lucide-react";

const PLAN_STYLES = {
  starter: { label: "Starter", className: "bg-slate-100 text-slate-600" },
  professional: { label: "Pro", className: "bg-brand-50 text-brand-600" },
  business: { label: "Business", className: "bg-gold-50 text-gold-600" },
};

export function PlanBadge({ plan }) {
  const style = PLAN_STYLES[plan] || PLAN_STYLES.starter;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${style.className}`}>
      {plan !== "starter" && <Crown className="h-3 w-3" />}
      {style.label}
    </span>
  );
}

export function UpgradeSuggestion({ plan, className }) {
  if (plan && plan !== "starter") return null;
  return (
    <Link
      to="/pricing"
      className={
        className ||
        "flex items-center gap-2 rounded-lg bg-gradient-to-r from-brand-500 to-brand-700 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
      }
    >
      <Sparkles className="h-4 w-4 shrink-0" />
      Upgrade to Pro for unlimited expert messaging & priority review
    </Link>
  );
}
