import { useState } from "react";

// Three-tier avatar fallback: Gravatar (auto, via the person's email) ->
// their own uploaded photo -> a stylized initial-letter circle. Gravatar
// URLs are requested with `d=404` server-side, so a real HTTP 404 (not a
// default silhouette image) is what tells us to fall through to the next
// tier - handled here via onError.
export default function Avatar({ gravatarUrl, avatarUrl, name, className = "h-12 w-12", textClassName = "text-base" }) {
  const [gravatarFailed, setGravatarFailed] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

  if (gravatarUrl && !gravatarFailed) {
    return (
      <img
        src={gravatarUrl}
        alt={name}
        className={`${className} rounded-full object-cover`}
        onError={() => setGravatarFailed(true)}
      />
    );
  }

  if (avatarUrl && !avatarFailed) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`${className} rounded-full object-cover`}
        onError={() => setAvatarFailed(true)}
      />
    );
  }

  return (
    <div className={`${className} flex items-center justify-center rounded-full bg-brand-100 font-bold text-brand-600 ${textClassName}`}>
      {name?.[0]?.toUpperCase() || "?"}
    </div>
  );
}
