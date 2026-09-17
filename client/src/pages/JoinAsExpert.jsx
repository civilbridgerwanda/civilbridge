import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, File as FileIcon, X, Loader2 } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { RWANDA_LOCATIONS } from "../lib/locations";
import { trackEvent } from "../lib/analytics";
import Seo from "../components/Seo";

const categories = [
  { value: "engineer", label: "Engineer" },
  { value: "architect", label: "Architect" },
  { value: "contractor", label: "Contractor" },
  { value: "surveyor", label: "Surveyor" },
  { value: "interior_designer", label: "Interior Designer" },
];

export default function JoinAsExpert() {
  const { token, applyToken } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    category: "engineer",
    specialty: "",
    specialization: "",
    bio: "",
    years_experience: "",
    city: "",
  });
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [uploadNotice, setUploadNotice] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setUploadNotice(null);
    setSubmitting(true);
    try {
      let avatar_url = null;
      if (file) {
        try {
          const uploaded = await api.uploadImage(file, token);
          avatar_url = uploaded.url;
        } catch (err) {
          setUploadNotice(`Couldn't upload the photo (${err.message}) - continuing without it.`);
        }
      }

      const expert = await api.createExpertProfile(
        { ...form, years_experience: form.years_experience ? Number(form.years_experience) : 0, avatar_url },
        token
      );

      // Creating a profile may have upgraded the account's role to
      // "expert" server-side - refresh the local user so the UI (e.g. the
      // navbar) reflects that immediately.
      if (token) await applyToken(token);

      trackEvent("expert_profile_created", { category: form.category });
      navigate(`/experts/${expert.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <Seo
        title="Join as Expert"
        description="Join CivilBridge's network of verified construction professionals."
        path="/join-as-expert"
      />

      <h1 className="text-3xl font-extrabold text-ink-900">Join Our Network of Experts</h1>
      <p className="mt-2 text-slate-500">
        Get discovered by clients across Rwanda. New profiles start unverified and are reviewed by our team.
      </p>

      {error && (
        <p className="mt-6 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-5 rounded-2xl border border-slate-200 p-8">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-ink-900">Category</label>
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
              value={form.category}
              onChange={(e) => update("category", e.target.value)}
            >
              {categories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink-900">Title / Specialty</label>
            <input
              required
              placeholder="e.g. Structural Engineer"
              className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
              value={form.specialty}
              onChange={(e) => update("specialty", e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-ink-900">Specialization</label>
          <input
            placeholder="e.g. Residential & Commercial"
            className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            value={form.specialization}
            onChange={(e) => update("specialization", e.target.value)}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-ink-900">Years of Experience</label>
            <input
              type="number"
              min="0"
              className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
              value={form.years_experience}
              onChange={(e) => update("years_experience", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink-900">City</label>
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
        </div>

        <div>
          <label className="block text-sm font-semibold text-ink-900">Bio</label>
          <textarea
            rows={4}
            placeholder="Tell clients about your experience and areas of expertise..."
            className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            value={form.bio}
            onChange={(e) => update("bio", e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-ink-900">Profile Photo (optional)</label>
          <label
            htmlFor="expert-photo"
            className="mt-1 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 hover:border-brand-400 hover:bg-brand-50"
          >
            <Upload className="h-6 w-6 text-brand-500" />
            {file ? "Click to replace photo" : "Click to upload, or drag and drop"}
          </label>
          <input
            id="expert-photo"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {file && (
            <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2 text-sm text-ink-900">
              <span className="flex items-center gap-2 truncate">
                <FileIcon className="h-4 w-4 shrink-0 text-brand-500" />
                <span className="truncate">{file.name}</span>
              </span>
              <button type="button" onClick={() => setFile(null)} aria-label="Remove photo" className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {uploadNotice && <p className="mt-2 text-xs text-amber-600">{uploadNotice}</p>}
        </div>

        <button
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 py-3 font-semibold text-white transition-[background-color,opacity,transform,box-shadow] duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-md active:translate-y-0 disabled:opacity-60"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? "Submitting…" : "Submit Profile"}
        </button>
      </form>
    </div>
  );
}
