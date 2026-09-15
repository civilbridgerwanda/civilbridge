import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import Seo from "../components/Seo";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";

export default function VerifyEmail() {
  const { user, verifyEmail } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const email = user?.email || location.state?.email || "";

  const [code, setCode] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMessage, setResendMessage] = useState(null);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await verifyEmail(email, code);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setResendMessage(null);
    setError(null);
    try {
      await api.resendOtp(email);
      setResendMessage("A new code is on its way to your inbox.");
      setResendCooldown(60);
    } catch (err) {
      setError(err.message);
    }
  }

  // Accounts created via a sign-in provider that doesn't share a real email
  // (currently: X) get a placeholder address - there's nothing to verify.
  if (user && user.has_verifiable_email === false) {
    return (
      <AuthShell heading="No Email on File" subheading="This account doesn't have a verifiable email address">
        <Seo title="Verify Email" description="Verify your CivilBridge account email address." path="/verify-email" />
        <p className="text-sm text-slate-600">
          You signed in with a provider that doesn't share an email address with us, so there's
          nothing to verify here. You can still use CivilBridge normally.
        </p>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="mt-6 w-full rounded-lg bg-brand-500 py-3 font-semibold text-white transition hover:bg-brand-600"
        >
          Back to Home
        </button>
      </AuthShell>
    );
  }

  return (
    <AuthShell heading="Verify Your Email" subheading={email ? `We sent a code to ${email}` : "Enter the code we emailed you"}>
      <Seo title="Verify Email" description="Verify your CivilBridge account email address." path="/verify-email" />

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {resendMessage && (
        <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-600">{resendMessage}</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-ink-900">Verification code</label>
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

        <button
          disabled={submitting || code.length !== 6}
          className="w-full rounded-lg bg-brand-500 py-3 font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
        >
          {submitting ? "Verifying…" : "Verify Email"}
        </button>
      </form>

      <button
        type="button"
        onClick={handleResend}
        disabled={resendCooldown > 0}
        className="mt-6 w-full text-center text-sm font-semibold text-brand-500 hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline"
      >
        {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
      </button>
    </AuthShell>
  );
}
