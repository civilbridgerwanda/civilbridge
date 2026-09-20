import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles } from "lucide-react";
import SocialLoginButtons from "./SocialLoginButtons";

// A blurred-backdrop sign-in/sign-up prompt, in the spirit of ChatGPT's
// "Log in or sign up" gate: it never does a hard route redirect, so
// arriving at it always feels like a smooth overlay fading in over
// whatever's already on screen, not a jump-cut to a different page.
//
// variant="soft": dismissable (an X and a "Continue browsing" link) - used
//   where the underlying content is fine to explore without an account.
// variant="hard": no dismiss control - used where the content genuinely
//   requires an account to view at all (see RequireAuth.jsx).
export default function AuthGate({ variant = "soft", from, title, message, onDismiss }) {
  const dismissable = variant === "soft" && onDismiss;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-40 flex items-center justify-center p-4"
        style={{ backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", backgroundColor: "rgba(15, 23, 42, 0.35)" }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 0.61, 0.36, 1] }}
          className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
        >
          {dismissable && (
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Continue browsing"
              className="absolute right-4 top-4 text-slate-400 hover:text-ink-900"
            >
              <X className="h-5 w-5" />
            </button>
          )}

          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 text-white">
            <Sparkles className="h-5 w-5" />
          </span>
          <h2 className="mt-4 text-lg font-bold text-ink-900">{title}</h2>
          <p className="mt-1.5 text-sm text-slate-500">{message}</p>

          <div className="mt-5">
            <SocialLoginButtons mode="signin" />
          </div>

          <div className="my-4 flex items-center gap-3 text-xs font-semibold text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            OR
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="space-y-2.5">
            <Link
              to="/sign-in"
              state={{ from }}
              className="block w-full rounded-lg bg-brand-500 py-2.5 text-center text-sm font-semibold text-white transition-[background-color,transform,box-shadow] duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-md active:translate-y-0"
            >
              Sign In
            </Link>
            <Link
              to="/get-started"
              state={{ from }}
              className="block w-full rounded-lg border border-slate-300 bg-slate-50 py-2.5 text-center text-sm font-semibold text-ink-900 transition-colors duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:bg-slate-100"
            >
              Create Account
            </Link>
          </div>

          {dismissable && (
            <button
              type="button"
              onClick={onDismiss}
              className="mt-4 block w-full text-center text-sm font-semibold text-slate-500 hover:text-ink-900"
            >
              Continue Browsing
            </button>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
