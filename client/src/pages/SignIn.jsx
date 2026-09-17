import { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import AuthShell from "../components/AuthShell";
import SocialLoginButtons from "../components/SocialLoginButtons";
import Seo from "../components/Seo";
import { useAuth } from "../lib/AuthContext";
import { describeOauthError } from "../lib/oauthError";

export default function SignIn() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState(() => describeOauthError(searchParams.get("oauth_error")));
  const [submitting, setSubmitting] = useState(false);

  const redirectTo = location.state?.from || "/";

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      heading="Welcome Back"
      subheading="Sign in to your account to continue"
      sideTitle="Pick up right where you left off."
      sideHighlights={[
        "Track every estimate's review status in real time",
        "Message the experts and clients you're already working with",
        "Manage your property listings and building plans",
        "One dashboard for everything you're building",
      ]}
    >
      <Seo title="Sign In" description="Sign in to your CivilBridge account." path="/sign-in" />

      <SocialLoginButtons />

      <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        Or continue with email
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
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
              placeholder="Enter your password"
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

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-slate-600">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-400"
            />
            Remember me
          </label>
          <Link to="/forgot-password" className="font-semibold text-brand-500 hover:underline">
            Forgot password?
          </Link>
        </div>

        <button
          disabled={submitting}
          className="w-full rounded-lg bg-brand-500 py-3 font-semibold text-white transition-[background-color,opacity] duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:bg-brand-600 disabled:opacity-60"
        >
          {submitting ? "Signing in…" : "Sign In"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Don't have an account?{" "}
        <Link to="/get-started" className="font-semibold text-brand-500 hover:underline">
          Create one now
        </Link>
      </p>
    </AuthShell>
  );
}
