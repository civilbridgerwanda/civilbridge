import { useEffect, useRef, useState } from "react";
import { MapPin, Play, Lock } from "lucide-react";
import { isVideoUrl } from "../lib/mediaType";

// A plain <video preload="metadata"> doesn't reliably paint a poster frame
// in every browser - some just show black until playback starts. Seeking
// to a tiny offset once metadata loads forces the browser to decode and
// paint that frame, which is what actually fixes the blank-thumbnail bug.
function VideoThumb({ src, className }) {
  const ref = useRef(null);
  return (
    <video
      ref={ref}
      src={src}
      muted
      playsInline
      preload="metadata"
      className={className}
      onLoadedMetadata={() => {
        const el = ref.current;
        if (el) el.currentTime = Math.min(0.1, (el.duration || 1) / 2);
      }}
    />
  );
}

// The generic multi-upload gallery field (used for both properties and
// plans) accepts any file the browser's picker lets through - `accept`
// attributes are only a UI hint, not a real restriction, and the upload
// endpoint allows video for Plan's dedicated video field anyway. So a
// video can legitimately end up sitting in the plain `images` array; this
// detects that by extension and renders it as a real playable slot instead
// of a broken <img>, rather than assuming every url is a photo.
function classify(url) {
  return isVideoUrl(url) ? "video" : "image";
}

const AUTOPLAY_MS = 4500;

// Alibaba/marketplace-style product gallery: one large canvas with a
// thumbnail rail of the other angles/renders next to it. Falls back to a
// single placeholder tile when a listing has no photos at all.
//
// `videoUrl`, if given, is appended as one more thumbnail slot (this is
// Plan's dedicated walkthrough-video field); selecting any video slot -
// whether from `videoUrl` or one detected inside `images` - swaps the main
// canvas to an HTML5 <video> with controls instead of an <img>.
//
// `layout="hero"` is the immersive full-width variant (property/plan
// detail): the canvas ambient-slideshows through every photo (slow
// cross-fade, photos only - a playing video is never auto-advanced away
// from), pausing the moment the pointer is over it. The thumbnail rail
// moves to a scrollable overlay on the right edge of the canvas itself,
// so picking a specific photo doesn't cost any layout space below it.
// Everything else - slot detection, video swap, the `badge` overlay slot -
// is shared with the default "side" mode used elsewhere (e.g. admin
// previews), so neither layout can drift out of sync on the actual
// gallery logic.
//
// `lockedFrom`, hero mode only: slots at or beyond this index render
// blurred with a lock icon instead of a real thumbnail, and clicking one
// calls `onLockedClick` instead of switching the canvas - this is how a
// Plan teases extra photos behind its paid unlock instead of giving away
// the full set for free.
export default function ImageGallery({
  images,
  alt,
  aspectRatio = "4 / 3",
  badge,
  videoUrl,
  layout = "side",
  rounded = true,
  lockedFrom = null,
  onLockedClick,
}) {
  const slots = [
    ...(images || []).map((url) => ({ type: classify(url), url })),
    ...(videoUrl ? [{ type: "video", url: videoUrl }] : []),
  ];
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [railScrolling, setRailScrolling] = useState(false);
  const railScrollTimer = useRef(null);
  const current = slots[active];

  // The rail's scrollbar stays invisible at rest (see .thumb-rail in
  // index.css) and only fades in for as long as the user is actively
  // scrolling it - this just toggles that class, debounced so it lingers
  // briefly after the last scroll event instead of vanishing mid-gesture.
  function handleRailScroll() {
    setRailScrolling(true);
    clearTimeout(railScrollTimer.current);
    railScrollTimer.current = setTimeout(() => setRailScrolling(false), 900);
  }

  const imageIndices = slots.reduce((acc, s, i) => (s.type === "image" ? [...acc, i] : acc), []);

  // Ambient slideshow - only in hero mode, only while the pointer isn't
  // over the canvas, and never while a video is the active slot (a video
  // already has its own controls; auto-advancing away from one mid-watch
  // would be a bad surprise). Re-scheduling from the current `active` on
  // every tick (rather than one long-lived setInterval) means hovering
  // in and out just naturally pauses/resumes it.
  useEffect(() => {
    if (layout !== "hero" || hovered || imageIndices.length <= 1) return;
    if (current?.type === "video") return;
    const timer = setTimeout(() => {
      setActive((a) => {
        const pos = imageIndices.indexOf(a);
        const next = pos === -1 ? 0 : (pos + 1) % imageIndices.length;
        return imageIndices[next];
      });
    }, AUTOPLAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, hovered, layout, slots.length]);

  if (layout === "hero") {
    return (
      <div
        className={`relative w-full overflow-hidden bg-black ${rounded ? "rounded-2xl" : ""} h-[calc(100dvh-56px)] min-h-[320px] max-h-[820px]`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {slots.length ? (
          <>
            {slots.map(
              (slot, i) =>
                slot.type === "image" && (
                  <img
                    key={`${slot.url}-${i}`}
                    src={slot.url}
                    alt={`${alt} - view ${i + 1}`}
                    className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1600ms] ease-in-out ${
                      i === active ? "opacity-100" : "opacity-0"
                    }`}
                  />
                )
            )}
            {current?.type === "video" && (
              <video src={current.url} controls playsInline className="absolute inset-0 h-full w-full bg-black object-contain" />
            )}
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-brand-50 text-brand-300">
            <MapPin className="h-12 w-12" />
          </div>
        )}

        {current?.type !== "video" && badge}

        {slots.length > 1 && (
          <div
            onScroll={handleRailScroll}
            className={`thumb-rail absolute right-4 top-4 z-20 flex max-h-[calc(100%-2rem)] w-20 flex-col gap-2 overflow-y-auto rounded-xl bg-black/25 p-2 backdrop-blur-sm sm:w-24 ${
              railScrolling ? "is-scrolling" : ""
            }`}
          >
            {slots.map((slot, i) => {
              const locked = lockedFrom != null && i >= lockedFrom;
              return (
                <button
                  key={`${slot.url}-${i}`}
                  type="button"
                  onClick={() => (locked ? onLockedClick?.() : setActive(i))}
                  aria-label={locked ? `Unlock to view image ${i + 1}` : `View image ${i + 1}`}
                  className={`relative h-16 w-full shrink-0 overflow-hidden rounded-lg border-2 transition-colors sm:h-20 ${
                    i === active ? "border-white" : "border-white/40 hover:border-white/80"
                  }`}
                >
                  {slot.type === "video" ? (
                    <>
                      <VideoThumb src={slot.url} className="h-full w-full object-cover" />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Play className="h-4 w-4 fill-white text-white" />
                      </span>
                    </>
                  ) : (
                    <img
                      src={slot.url}
                      alt={`${alt} - view ${i + 1}`}
                      className={`h-full w-full object-cover ${locked ? "scale-110 blur-md" : ""}`}
                    />
                  )}
                  {locked && (
                    <span className="absolute inset-0 flex items-center justify-center bg-ink-900/50">
                      <Lock className="h-4 w-4 text-white" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const canvas = (
    <div className={`relative flex-1 overflow-hidden bg-black/5 ${rounded ? "rounded-2xl" : ""}`} style={{ aspectRatio }}>
      {current ? (
        current.type === "video" ? (
          <video src={current.url} controls playsInline className="h-full w-full object-contain" />
        ) : (
          <img src={current.url} alt={alt} className="h-full w-full object-cover" />
        )
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-brand-50 text-brand-300">
          <MapPin className="h-12 w-12" />
        </div>
      )}
      {current?.type !== "video" && badge}
    </div>
  );

  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row">
      {slots.length > 1 && (
        <div className="flex gap-2 overflow-x-auto sm:w-20 sm:flex-col sm:overflow-y-auto sm:overflow-x-visible">
          {slots.map((slot, i) => (
            <button
              key={`${slot.url}-${i}`}
              type="button"
              onClick={() => setActive(i)}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors sm:h-20 sm:w-20 ${
                i === active ? "border-brand-500" : "border-transparent hover:border-slate-300"
              }`}
            >
              {slot.type === "video" ? (
                <>
                  <VideoThumb src={slot.url} className="h-full w-full object-cover" />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Play className="h-5 w-5 fill-white text-white" />
                  </span>
                </>
              ) : (
                <img src={slot.url} alt={`${alt} - view ${i + 1}`} className="h-full w-full object-cover" />
              )}
            </button>
          ))}
        </div>
      )}
      {canvas}
    </div>
  );
}
