import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import AuthShell from "../components/AuthShell";
import Seo from "../components/Seo";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";

export default function ForgotPassword() {
  const { resetPassword } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState("request"); // request | reset
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleRequestCode(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.forgotPassword(email);
      setInfo("If that email has an account, a reset code is on its way.");
      setStep("reset");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await resetPassword(email, code, newPassword);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      heading="Reset Your Password"
      subheading={step === "request" ? "Enter your email to get a reset code" : `Enter the code sent to ${email}`}
    >
      <Seo title="Reset Password" description="Reset your CivilBridge account password." path="/forgot-password" />

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {info && step === "reset" && (
        <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-600">{info}</p>
      )}

      {step === "request" ? (
        <form onSubmit={handleRequestCode} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-ink-900">Email Address</label>
            <input
              type="email"
              required
              placeholder="you@example.com"
              className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <button
            disabled={submitting}
            className="w-full rounded-lg bg-brand-500 py-3 font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
          >
            {submitting ? "Sending…" : "Send Reset Code"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-ink-900">Reset code</label>
            <input
              required
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="123456"
              className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-3 text-center text-2xl tracking-[0.5em] focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-ink-900">New password</label>
            <div className="relative mt-1">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                placeholder="At least 8 characters"
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 pr-10 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            disabled={submitting || code.length !== 6}
            className="w-full rounded-lg bg-brand-500 py-3 font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
          >
            {submitting ? "Resetting…" : "Reset Password"}
          </button>

          <button
            type="button"
            onClick={() => setStep("request")}
            className="w-full text-center text-sm font-semibold text-brand-500 hover:underline"
          >
            Use a different email
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-slate-500">
        Remembered your password?{" "}
        <Link to="/sign-in" className="font-semibold text-brand-500 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
