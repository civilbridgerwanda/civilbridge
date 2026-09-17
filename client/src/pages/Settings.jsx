import { Link, useNavigate } from "react-router-dom";
import { LogOut, Mail, ShieldCheck, KeyRound } from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import Seo from "../components/Seo";
import { PlanBadge, UpgradeSuggestion } from "../components/PlanBadge";

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Seo title="Settings" description="Your CivilBridge account settings." path="/settings" />

      <h1 className="text-3xl font-extrabold text-ink-900">Settings</h1>
      <p className="mt-1 text-slate-500">Your account details.</p>

      <div className="mt-8 rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-lg font-semibold text-white">
            {user?.full_name?.[0]?.toUpperCase()}
          </span>
          <div>
            <p className="text-lg font-bold text-ink-900">{user?.full_name}</p>
            <div className="mt-1 flex items-center gap-2">
              <p className="text-sm capitalize text-slate-500">{user?.role} account</p>
              <PlanBadge plan={user?.plan} />
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-4 border-t border-slate-100 pt-6">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm text-slate-600">
              <Mail className="h-4 w-4 text-brand-500" />
              {user?.email}
            </span>
            {user?.has_verifiable_email && (
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  user?.email_verified ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-700"
                }`}
              >
                {user?.email_verified ? "Verified" : "Not verified"}
              </span>
            )}
          </div>

          {user?.has_verifiable_email && !user?.email_verified && (
            <Link to="/verify-email" className="flex items-center gap-2 text-sm font-semibold text-brand-500 hover:underline">
              <ShieldCheck className="h-4 w-4" />
              Verify your email
            </Link>
          )}

          {user?.has_verifiable_email && (
            <Link to="/forgot-password" className="flex items-center gap-2 text-sm font-semibold text-brand-500 hover:underline">
              <KeyRound className="h-4 w-4" />
              Change password
            </Link>
          )}
        </div>
      </div>

      <div className="mt-4">
        <UpgradeSuggestion plan={user?.plan} />
      </div>

      <button
        type="button"
        onClick={handleLogout}
        className="mt-6 flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:bg-slate-100 hover:text-red-600"
      >
        <LogOut className="h-4 w-4" />
        Sign Out
      </button>
    </div>
  );
}
