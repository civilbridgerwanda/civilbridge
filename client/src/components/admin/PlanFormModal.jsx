import { useState } from "react";
import { Loader2 } from "lucide-react";
import Modal from "../Modal";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";

export default function PlanFormModal({ plan, onClose, onSaved }) {
  const { token } = useAuth();
  const isEdit = Boolean(plan);
  const [form, setForm] = useState({
    title: plan?.title || "",
    plan_type: plan?.plan_type || "house",
    price: plan?.price || "",
    city: plan?.city || "",
    bedrooms: plan?.bedrooms || "",
    bathrooms: plan?.bathrooms || "",
    size_sqm: plan?.size_sqm || "",
    rating: plan?.rating || 4.5,
    badge: plan?.badge || "",
    is_prime_location: plan?.is_prime_location || false,
    image_url: plan?.image_url || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        size_sqm: form.size_sqm ? Number(form.size_sqm) : null,
        bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
        bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
        rating: Number(form.rating),
        badge: form.badge || null,
      };
      const saved = isEdit
        ? await api.adminUpdatePlan(plan.id, payload, token)
        : await api.adminCreatePlan(payload, token);
      onSaved(saved, isEdit);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? "Edit Plan" : "Add Plan"} onClose={onClose} maxWidth="max-w-2xl">
      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-ink-900">Title</label>
          <input
            required
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-ink-900">Type</label>
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
              value={form.plan_type}
              onChange={(e) => setForm({ ...form, plan_type: e.target.value })}
            >
              <option value="house">House</option>
              <option value="apartment">Apartment</option>
              <option value="land">Land</option>
              <option value="commercial">Commercial</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink-900">Price (RWF)</label>
            <input
              required
              type="number"
              min="0"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-ink-900">City</label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-semibold text-ink-900">Size (sqm)</label>
            <input
              type="number"
              min="0"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
              value={form.size_sqm}
              onChange={(e) => setForm({ ...form, size_sqm: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink-900">Bedrooms</label>
            <input
              type="number"
              min="0"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
              value={form.bedrooms}
              onChange={(e) => setForm({ ...form, bedrooms: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink-900">Bathrooms</label>
            <input
              type="number"
              min="0"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
              value={form.bathrooms}
              onChange={(e) => setForm({ ...form, bathrooms: e.target.value })}
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-ink-900">Badge</label>
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
              value={form.badge}
              onChange={(e) => setForm({ ...form, badge: e.target.value })}
            >
              <option value="">None</option>
              <option value="new">New</option>
              <option value="hot">Hot</option>
            </select>
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-ink-900">
              <input
                type="checkbox"
                checked={form.is_prime_location}
                onChange={(e) => setForm({ ...form, is_prime_location: e.target.checked })}
              />
              Prime Location
            </label>
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-ink-900">Image URL</label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
            value={form.image_url}
            onChange={(e) => setForm({ ...form, image_url: e.target.value })}
          />
        </div>
        <button
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-white transition-[background-color,opacity,transform,box-shadow] duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-md active:translate-y-0 disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Plan"}
        </button>
      </form>
    </Modal>
  );
}
