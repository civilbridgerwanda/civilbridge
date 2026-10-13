import { formatRelativeTime } from "../../lib/formatRelativeTime";

const STYLES = {
  online: { dot: "bg-emerald-500", text: "text-emerald-700", label: "Online" },
  away: { dot: "bg-amber-400", text: "text-amber-700", label: "Away" },
  offline: { dot: "bg-slate-300", text: "text-slate-500", label: "Offline" },
};

export const PRESENCE_TEXT = { online: "● Online", away: "◐ Away", offline: "○ Offline" };

// A coloured dot + label for an expert's current presence. With `lastSeen`,
// an offline expert also shows how long ago they were last on the site.
export default function PresenceDot({ status = "offline", lastSeen = null }) {
  const s = STYLES[status] || STYLES.offline;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${s.text}`}>
      <span className="relative flex h-2 w-2">
        {status === "online" && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${s.dot}`} />
      </span>
      {s.label}
      {status === "offline" && lastSeen && <span className="font-normal text-slate-400">· seen {formatRelativeTime(lastSeen)}</span>}
    </span>
  );
}
