const VIDEO_EXTENSIONS = /\.(mp4|webm|mov|m4v)(\?.*)?$/i;

export function isVideoUrl(url) {
  return VIDEO_EXTENSIONS.test(url || "");
}

// The browser's file-picker `accept` attribute is only a UI hint, not a
// real restriction, so a video can end up in a plain multi-image gallery
// even though the field says "images." Wherever that gallery's first entry
// is used as the single-image `image_url` (list cards, carousels, admin
// tables - anything that still isn't gallery-aware), it has to be an
// actual photo, or every one of those renders a broken <img>. This picks
// the first non-video entry instead of blindly trusting images[0].
export function firstImageUrl(images) {
  return (images || []).find((url) => !isVideoUrl(url)) || null;
}
