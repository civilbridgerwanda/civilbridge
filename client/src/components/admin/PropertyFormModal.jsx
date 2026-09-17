import { useState } from "react";
import { Loader2 } from "lucide-react";
import Modal from "../Modal";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import { RWANDA_LOCATIONS } from "../../lib/locations";

export default function PropertyFormModal({ property, onClose, onSaved }) {
  const { token } = useAuth();
  const isEdit = Boolean(property);
  const [form, setForm] = useState({
    title: property?.title || "",
    description: property?.description || "",
    property_type: property?.property_type || "house",
    price: property?.price || "",
    city: property?.city || "",
    district: property?.district || "",
    size_sqm: property?.size_sqm || "",
    bedrooms: property?.bedrooms || "",
    bathrooms: property?.bathrooms || "",
    image_url: property?.image_url || "",
    status: property?.status || "available",
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
      };
      const saved = isEdit
        ? await api.adminUpdateProperty(property.id, payload, token)
        : await api.adminCreateProperty(payload, token);
      onSaved(saved, isEdit);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? "Edit Property" : "Add Property"} onClose={onClose} maxWidth="max-w-2xl">
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
              value={form.property_type}
              onChange={(e) => setForm({ ...form, property_type: e.target.value })}
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
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-ink-900">City</label>
            <select
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            >
              <option value="">Select...</option>
              {RWANDA_LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink-900">District</label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
              value={form.district}
              onChange={(e) => setForm({ ...form, district: e.target.value })}
            />
          </div>
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
        <div>
          <label className="block text-sm font-semibold text-ink-900">Image URL</label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
            value={form.image_url}
            onChange={(e) => setForm({ ...form, image_url: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-ink-900">Description</label>
          <textarea
            rows={3}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        {isEdit && (
          <div>
            <label className="block text-sm font-semibold text-ink-900">Status</label>
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="available">Available</option>
              <option value="pending">Pending</option>
              <option value="sold">Sold</option>
            </select>
          </div>
        )}
        <button
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-white transition-[background-color,opacity] duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:bg-brand-600 disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Property"}
        </button>
      </form>
    </Modal>
  );
}
