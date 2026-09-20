import { useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import Modal from "./Modal";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";

// mode="tour" is the "Book a Site Tour" entry point - same form/endpoint as
// "Talk to an Expert" (mode="expert"), just opens with the date field
// already in focus and slightly different copy. Either way the date is
// optional, since a general question doesn't need one.
//
// lotOrientation (from the sidebar's dropdown on PlanDetail) is folded into
// the message rather than given its own DB column - it's just context for
// whoever follows up, and the message field already reaches them via the
// confirmation email, the team notification email, and the admin panel.
export default function PlanInquiryModal({ plan, onClose, mode = "expert", lotOrientation }) {
  const { token } = useAuth();
  const [form, setForm] = useState({ full_name: "", email: "", whatsapp: "", message: "", preferred_date: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const message = [lotOrientation && `Lot orientation: ${lotOrientation}`, form.message]
        .filter(Boolean)
        .join("\n\n");
      await api.submitPlanInquiry(
        plan.id,
        { ...form, message, preferred_date: form.preferred_date ? new Date(form.preferred_date).toISOString() : null },
        token
      );
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <Modal title="Request Sent" onClose={onClose}>
        <div className="text-center py-4">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
            <CheckCircle2 className="h-6 w-6" />
          </span>
          <p className="mt-4 font-semibold text-ink-900">We've received your request</p>
          <p className="mt-2 text-sm text-slate-500">
            Our team is working on it and will get back to you within <strong>24 hours</strong>. We've
            also sent a confirmation to <strong>{form.email}</strong>.
          </p>
          <p className="mt-3 text-sm text-slate-500">
            If you don't hear from us in time, reach out on WhatsApp:{" "}
            <a href="https://wa.me/25078995646" className="font-semibold text-brand-500 hover:underline">
              +250 789 956 46
            </a>
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-6 w-full rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-white transition-[background-color,transform,box-shadow] duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-md active:translate-y-0"
          >
            Close
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={mode === "tour" ? "Book a Site Tour" : "Talk to an Expert"} onClose={onClose}>
      <p className="mb-4 text-sm text-slate-500">
        About <strong>{plan.title}</strong>.{" "}
        {mode === "tour"
          ? "Pick a date/time that works for you and our team will confirm by email or WhatsApp."
          : "Fill this in and a CivilBridge expert will reach out."}
      </p>
      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {lotOrientation && (
        <p className="mb-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Lot orientation you selected (<strong>{lotOrientation}</strong>) will be included with your request.
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-ink-900">Full Name</label>
          <input
            required
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-ink-900">Email</label>
          <input
            required
            type="email"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-ink-900">WhatsApp Number</label>
          <input
            required
            type="tel"
            placeholder="+250 7XX XXX XXX"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
            value={form.whatsapp}
            onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-ink-900">
            Preferred Date/Time {mode === "tour" ? "" : "(optional)"}
          </label>
          <input
            required={mode === "tour"}
            type="datetime-local"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
            value={form.preferred_date}
            onChange={(e) => setForm({ ...form, preferred_date: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-ink-900">Message (optional)</label>
          <textarea
            rows={3}
            placeholder="What would you like to know about this plan?"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
          />
        </div>
        <button
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-white transition-[background-color,opacity,transform,box-shadow] duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-md active:translate-y-0 disabled:opacity-60"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? "Submitting…" : mode === "tour" ? "Request Site Tour" : "Submit Request"}
        </button>
      </form>
    </Modal>
  );
}
