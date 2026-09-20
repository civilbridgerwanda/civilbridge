import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import Modal from "./Modal";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";

// Properties don't have their own inquiry table (Plans do, via
// /plans/:id/inquiries) - reusing that machinery here would mean building
// a second parallel inquiry pipeline just for a UI refinement. Instead this
// composes the details into one message and sends it through the real
// messaging system that already exists.
//
// Gatekeeping: this always goes to CivilBridge support first, never
// straight to the property's owner - the team is the single point of
// contact for every tour/inquiry submission and relays it on manually.
// This is deliberately different from the "Contact Owner" button elsewhere
// on the page, which is the client explicitly choosing to message that
// specific owner directly - that stays direct.
export default function PropertyInquiryModal({ property, onClose, mode = "details" }) {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: user?.full_name || "", email: user?.email || "", phone: "", message: "", preferred_date: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!token) {
      navigate("/sign-in", { state: { from: window.location.pathname } });
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const recipientId = (await api.getSupportContact(token)).id;
      const lines = [
        mode === "tour" ? `Site tour request for "${property.title}"` : `Enquiry about "${property.title}"`,
        property.owner && `Listing owner: ${property.owner.full_name} (${property.owner.id})`,
        form.preferred_date && `Preferred date/time: ${new Date(form.preferred_date).toLocaleString()}`,
        form.phone && `Phone/WhatsApp: ${form.phone}`,
        "",
        form.message || (mode === "tour" ? "I'd like to schedule a visit to see this property." : "I'd like more information about this listing."),
      ];
      const { id } = await api.startConversation(recipientId, token);
      await api.sendMessage(id, lines.filter(Boolean).join("\n"), token);
      navigate(`/messages/${id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={mode === "tour" ? "Schedule a Tour" : "Enter Your Details"} onClose={onClose}>
      <p className="mb-4 text-sm text-slate-500">
        About <strong>{property.title}</strong>.{" "}
        {mode === "tour"
          ? "Pick a date/time - our team will confirm your visit and coordinate with the listing owner."
          : "Our team will review this and route it to the right person."}
      </p>
      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
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
          <label className="block text-sm font-semibold text-ink-900">Phone / WhatsApp</label>
          <input
            required
            type="tel"
            placeholder="+250 7XX XXX XXX"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
        {mode === "tour" && (
          <div>
            <label className="block text-sm font-semibold text-ink-900">Preferred Date/Time</label>
            <input
              required
              type="datetime-local"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
              value={form.preferred_date}
              onChange={(e) => setForm({ ...form, preferred_date: e.target.value })}
            />
          </div>
        )}
        <div>
          <label className="block text-sm font-semibold text-ink-900">Message (optional)</label>
          <textarea
            rows={3}
            placeholder={mode === "tour" ? "Anything the owner should know before your visit?" : "What would you like to know about this property?"}
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
          {submitting ? "Sending…" : mode === "tour" ? "Request Site Tour" : "Send Details"}
        </button>
      </form>
    </Modal>
  );
}
