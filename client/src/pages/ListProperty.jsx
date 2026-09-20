import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { RWANDA_LOCATIONS } from "../lib/locations";
import { trackEvent } from "../lib/analytics";
import Seo from "../components/Seo";
import ImageGalleryField from "../components/admin/ImageGalleryField";
import { firstImageUrl } from "../lib/mediaType";

export default function ListProperty() {
  const { user, token, applyToken } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    description: "",
    property_type: "house",
    price: "",
    city: "",
    district: "",
    size_sqm: "",
    bedrooms: "",
    bathrooms: "",
  });
  const [images, setImages] = useState([]);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const property = await api.createProperty(
        {
          ...form,
          price: Number(form.price),
          size_sqm: form.size_sqm ? Number(form.size_sqm) : null,
          bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
          bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
          image_url: firstImageUrl(images),
          images,
        },
        token
      );

      trackEvent("property_listed", { property_type: form.property_type });
      // The server just auto-upgraded a plain client to property_owner -
      // refresh the local user so the sidebar switches immediately instead
      // of waiting for the next login.
      if (token) await applyToken(token);
      navigate("/my-properties", { state: { justListed: true } });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Property listing isn't available on expert accounts (see
  // properties.controller.js's create() guard) - send them back to their
  // own dashboard instead of showing a form that will just fail to submit.
  if (user?.role === "expert") {
    return <Navigate to="/expert-dashboard" replace />;
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <Seo title="List Your Property" description="List your property on CivilBridge and reach buyers across Rwanda." path="/list-property" />

      <h1 className="text-3xl font-extrabold text-ink-900">List Your Property</h1>
      <p className="mt-2 text-slate-500">Reach thousands of potential buyers and investors on CivilBridge.</p>

      {error && (
        <p className="mt-6 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-5 rounded-2xl border border-slate-200 p-8">
        <div>
          <label className="block text-sm font-semibold text-ink-900">Title</label>
          <input
            required
            placeholder="e.g. Modern 4-Bedroom House"
            className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-ink-900">Property Type</label>
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
              value={form.property_type}
              onChange={(e) => update("property_type", e.target.value)}
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
              placeholder="e.g. 85000000"
              className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
              value={form.price}
              onChange={(e) => update("price", e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-ink-900">City / Area</label>
            <select
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
              value={form.city}
              onChange={(e) => update("city", e.target.value)}
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
            <label className="block text-sm font-semibold text-ink-900">District (optional)</label>
            <input
              placeholder="e.g. Gasabo"
              className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
              value={form.district}
              onChange={(e) => update("district", e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-semibold text-ink-900">Size (sqm)</label>
            <input
              type="number"
              min="0"
              className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
              value={form.size_sqm}
              onChange={(e) => update("size_sqm", e.target.value)}
            />
          </div>
          {(form.property_type === "house" || form.property_type === "apartment") && (
            <>
              <div>
                <label className="block text-sm font-semibold text-ink-900">Bedrooms</label>
                <input
                  type="number"
                  min="0"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  value={form.bedrooms}
                  onChange={(e) => update("bedrooms", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-ink-900">Bathrooms</label>
                <input
                  type="number"
                  min="0"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  value={form.bathrooms}
                  onChange={(e) => update("bathrooms", e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-ink-900">Description</label>
          <textarea
            rows={4}
            placeholder="Describe the property..."
            className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
          />
        </div>

        <ImageGalleryField label="Photos (optional)" images={images} onChange={setImages} />

        <button
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 py-3 font-semibold text-white transition-[background-color,opacity,transform,box-shadow] duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-md active:translate-y-0 disabled:opacity-60"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? "Publishing…" : "Publish Listing"}
        </button>
      </form>
    </div>
  );
}
