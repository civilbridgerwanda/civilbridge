import { useState } from "react";
import { Mail, CheckCircle2 } from "lucide-react";
import { api } from "../lib/api";
import Seo from "../components/Seo";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState("idle"); // idle | submitting | done | error
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);
    try {
      await api.submitContactForm(form);
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError(err.message);
    }
  }

  if (status === "done") {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
          <CheckCircle2 className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-2xl font-bold text-ink-900">Message sent</h1>
        <p className="mt-2 text-slate-500">Thanks for reaching out — we'll get back to you soon.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <Seo title="Contact" description="Get in touch with the CivilBridge team." path="/contact" />

      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-500">
        <Mail className="h-6 w-6" />
      </span>
      <h1 className="mt-4 text-3xl font-extrabold text-ink-900">Get in Touch</h1>
      <p className="mt-2 text-slate-500">
        Questions about a project, a partnership, or the platform itself — send us a message.
      </p>

      {error && (
        <p className="mt-6 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-ink-900">Name</label>
          <input
            required
            className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-ink-900">Email</label>
          <input
            type="email"
            required
            className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-ink-900">Message</label>
          <textarea
            required
            rows={5}
            className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
          />
        </div>
        <button
          disabled={status === "submitting"}
          className="w-full rounded-lg bg-brand-500 py-3 font-semibold text-white transition-[background-color,opacity,transform,box-shadow] duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-md active:translate-y-0 disabled:opacity-60"
        >
          {status === "submitting" ? "Sending…" : "Send Message"}
        </button>
      </form>
    </div>
  );
}
