import { useState } from "react";
import { Loader2, Upload, X, Play } from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import { isVideoUrl, firstImageUrl } from "../../lib/mediaType";

// Multi-image field used by the admin Property/Plan forms. Supports both
// pasting an image URL (the original behavior, kept working) and uploading
// a local file (goes to Cloudinary via the existing /uploads/image
// endpoint, same one ListProperty/JoinAsExpert already use). The first
// image in the list is treated as the cover photo everywhere else in the
// app (list cards, etc.) since those still read a single `image_url`.
export default function ImageGalleryField({ images, onChange, label = "Images" }) {
  const { token } = useAuth();
  const [urlInput, setUrlInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  function addImage(url) {
    if (!url.trim()) return;
    onChange([...images, url.trim()]);
  }

  function removeImage(index) {
    onChange(images.filter((_, i) => i !== index));
  }

  async function handleFileChange(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = ""; // allow re-selecting the same file(s) later
    if (!files.length) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded = await api.uploadImages(files, token);
      onChange([...images, ...uploaded.map((u) => u.url)]);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="block text-sm font-semibold text-ink-900">{label}</label>
      <p className="mt-0.5 text-xs text-slate-500">Photos or a short video - the first photo becomes the cover.</p>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      {images.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-3">
          {images.map((url, i) => (
            <div key={`${url}-${i}`} className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-200">
              {isVideoUrl(url) ? (
                <>
                  <video src={url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Play className="h-4 w-4 fill-white text-white" />
                  </span>
                </>
              ) : (
                <img src={url} alt="" className="h-full w-full object-cover" />
              )}
              {url === firstImageUrl(images) && (
                <span className="absolute bottom-0 left-0 right-0 bg-black/60 py-0.5 text-center text-[10px] font-semibold text-white">
                  Cover
                </span>
              )}
              <button
                type="button"
                onClick={() => removeImage(i)}
                aria-label="Remove image"
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-2 flex gap-2">
        <input
          type="text"
          placeholder="Paste an image URL..."
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addImage(urlInput);
              setUrlInput("");
            }
          }}
        />
        <button
          type="button"
          onClick={() => {
            addImage(urlInput);
            setUrlInput("");
          }}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-ink-900 hover:bg-slate-50"
        >
          Add URL
        </button>
        <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-ink-900 hover:bg-slate-50">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Upload
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading}
          />
        </label>
      </div>
    </div>
  );
}
