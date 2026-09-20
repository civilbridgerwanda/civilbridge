import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import AuthShell from "../components/AuthShell";
import SocialLoginButtons from "../components/SocialLoginButtons";
import Seo from "../components/Seo";
import { useAuth } from "../lib/AuthContext";
import { describeOauthError } from "../lib/oauthError";

export default function SignUp() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  // Role selection is deferred - everyone signs up as a client and can
  // become an expert later via the "Join as Expert" flow, which upgrades
  // the account. See feedback: "we will give them later."
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState(() => describeOauthError(searchParams.get("oauth_error")));
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (!agreed) {
      setError("Please agree to the Terms of Service and Privacy Policy to continue.");
      return;
    }

    setSubmitting(true);
    try {
      await register(fullName, email, password);
      navigate("/verify-email", { replace: true, state: { email } });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      heading="Create Your Account"
      subheading="Join Rwanda's premier construction intelligence platform"
      sideTitle="Everything you need to plan, build, and manage — in one place."
      sideHighlights={[
        "Get an instant AI-assisted cost estimate for your project",
        "Connect with verified engineers, architects, and contractors",
        "Browse building plans and properties across Rwanda",
        "Free to join — upgrade to a paid plan whenever you're ready",
      ]}
    >
      <Seo title="Create Account" description="Create a CivilBridge account." path="/get-started" />

      <SocialLoginButtons mode="signup" />

      <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        Or register with email
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-ink-900">Full Name</label>
          <input
            required
            placeholder="John Doe"
            className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>

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

        <div>
          <label className="block text-sm font-semibold text-ink-900">Password</label>
          <div className="relative mt-1">
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              placeholder="Create a strong password"
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 pr-10 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

        <div>
          <label className="block text-sm font-semibold text-ink-900">Confirm Password</label>
          <div className="relative mt-1">
            <input
              type={showConfirmPassword ? "text" : "password"}
              required
              placeholder="Re-enter your password"
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 pr-10 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((v) => !v)}
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <label className="flex items-start gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-400"
          />
          <span>
            I agree to the{" "}
            <Link to="/terms" className="font-semibold text-brand-500 hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="font-semibold text-brand-500 hover:underline">
              Privacy Policy
            </Link>
          </span>
        </label>

        <button
          disabled={submitting || !agreed}
          className="w-full rounded-lg bg-brand-500 py-3 font-semibold text-white transition-[background-color,opacity,transform,box-shadow] duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-md active:translate-y-0 disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none"
        >
          {submitting ? "Creating account…" : "Create Account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link to="/sign-in" className="font-semibold text-brand-500 hover:underline">
          Sign in here
        </Link>
      </p>
    </AuthShell>
  );
}
