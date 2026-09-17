import { useState } from "react";
import { Mail, CheckCircle2 } from "lucide-react";
import { api } from "../lib/api";
import { trackEvent } from "../lib/analytics";

export default function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | submitting | done | error
  const [message, setMessage] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("submitting");
    setMessage(null);
    try {
      const result = await api.subscribeNewsletter(email);
      setStatus("done");
      setMessage(result.alreadySubscribed ? "You're already subscribed - thanks!" : "You're subscribed! Check your inbox.");
      trackEvent("newsletter_subscribed");
      setEmail("");
    } catch (err) {
      setStatus("error");
      setMessage(err.message);
    }
  }

  if (status === "done") {
    return (
      <p className="flex items-center gap-2 text-sm text-emerald-400">
        <CheckCircle2 className="h-4 w-4" />
        {message}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xs">
      <label className="text-sm font-semibold text-white">Get platform updates</label>
      <div className="mt-2 flex gap-2">
        <div className="relative flex-1">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-brand-400 focus:outline-none"
          />
        </div>
        <button
          disabled={status === "submitting"}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-[background-color,opacity] duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:bg-brand-400 disabled:opacity-60"
        >
          {status === "submitting" ? "…" : "Subscribe"}
        </button>
      </div>
      {status === "error" && <p className="mt-2 text-xs text-red-400">{message}</p>}
    </form>
  );
}
