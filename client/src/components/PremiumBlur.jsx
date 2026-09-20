import { Link } from "react-router-dom";
import { Lock, Eye } from "lucide-react";
import { useAuth } from "../lib/AuthContext";

// Visual paywall for premium plan content (high-res drawings, full
// structural specs). Billing isn't wired up yet - see Pricing.jsx's
// admin-approved upgrade flow - so this is presentation only for now: it
// always shows the blurred preview with an "unlock" CTA that points at
// Pricing rather than actually gating anything server-side.
//
// Admins bypass this entirely (they need to see and verify real content,
// not a blurred preview of their own platform) - shown unblurred with a
// small "Admin Preview" label so it's clear this isn't what a regular
// visitor sees.
export default function PremiumBlur({ title = "Unlock the Full Details", children }) {
  const { user } = useAuth();

  if (user?.role === "admin") {
    return (
      <div className="relative overflow-hidden rounded-xl border border-slate-200">
        <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full bg-ink-900 px-2.5 py-1 text-xs font-semibold text-white">
          <Eye className="h-3 w-3" /> Admin Preview
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200">
      <div className="pointer-events-none select-none blur-sm">{children}</div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/70 px-6 text-center backdrop-blur-[1px]">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink-900 text-white">
          <Lock className="h-4.5 w-4.5" />
        </span>
        <p className="font-bold text-ink-900">{title}</p>
        <p className="max-w-xs text-sm text-slate-500">
          High-resolution drawings and full structural details are available once your plan
          purchase is approved.
        </p>
        <Link
          to="/pricing"
          className="mt-1 rounded-lg bg-brand-500 px-5 py-2 text-sm font-semibold text-white transition-[background-color,transform,box-shadow] duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-md active:translate-y-0"
        >
          See Plans to Unlock
        </Link>
      </div>
    </div>
  );
}
