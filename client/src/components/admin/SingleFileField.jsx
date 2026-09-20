import { useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";

// A single-file version of ImageGalleryField, for fields that hold at most
// one file (a plan's drawing-pack PDF preview, or its walkthrough video).
// Same URL-or-upload pattern.
export default function SingleFileField({ value, onChange, label, accept, helpText }) {
  const { token } = useAuth();
  const [urlInput, setUrlInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded = await api.uploadImage(file, token);
      onChange(uploaded.url);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="block text-sm font-semibold text-ink-900">{label}</label>
      {helpText && <p className="mt-0.5 text-xs text-slate-500">{helpText}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      {value ? (
        <div className="mt-2 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
          <a href={value} target="_blank" rel="noopener noreferrer" className="truncate text-brand-600 hover:underline">
            {value}
          </a>
          <button type="button" onClick={() => onChange("")} aria-label="Remove" className="ml-2 shrink-0 text-slate-400 hover:text-red-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            placeholder="Paste a URL..."
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (urlInput.trim()) onChange(urlInput.trim());
                setUrlInput("");
              }
            }}
          />
          <button
            type="button"
            onClick={() => {
              if (urlInput.trim()) onChange(urlInput.trim());
              setUrlInput("");
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-ink-900 hover:bg-slate-50"
          >
            Add
          </button>
          <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-ink-900 hover:bg-slate-50">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload
            <input type="file" accept={accept} className="hidden" onChange={handleFileChange} disabled={uploading} />
          </label>
        </div>
      )}
    </div>
  );
}
