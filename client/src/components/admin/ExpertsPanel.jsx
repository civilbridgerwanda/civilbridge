import { useMemo, useState } from "react";
import { BadgeCheck, Briefcase, Loader2, Search } from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import { formatLocation } from "../../lib/locations";
import { formatRelativeTime } from "../../lib/formatRelativeTime";
import RatingBadge from "../RatingBadge";
import PresenceDot from "./PresenceDot";
import { byAvailability, useAdminExperts } from "./useAdminExperts";

// Verification is a human check - credentials, licence, a real person. It's
// the only way an expert becomes "verified", and it's what the homepage
// "verified experts" counter and the directory's verified-first ordering use.
//
// The top of this tab answers a different question: who is actually here
// right now to be handed work - and how busy are they - as opposed to who is
// merely listed.
export default function ExpertsPanel() {
  const { token } = useAuth();
  const { experts, error, setExperts } = useAdminExperts();
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState(null);

  const shown = useMemo(() => {
    if (!experts) return [];
    const q = search.trim().toLowerCase();
    return q
      ? experts.filter((e) => [e.full_name, e.email, e.specialty].some((v) => v?.toLowerCase().includes(q)))
      : experts;
  }, [experts, search]);

  async function toggle(expert) {
    const next = !expert.is_verified;
    const ok = confirm(
      next
        ? `Verify ${expert.full_name}? Only do this once you've checked their credentials - it puts a verified badge on their profile and counts them on the homepage.`
        : `Remove verification from ${expert.full_name}?`
    );
    if (!ok) return;
    setBusyId(expert.id);
    try {
      await api.adminSetExpertVerified(expert.id, next, token);
      setExperts((rows) => rows.map((e) => (e.id === expert.id ? { ...e, is_verified: next } : e)));
    } catch (err) {
      alert(err.message);
    } finally {
      setBusyId(null);
    }
  }

  if (error) return <p className="text-sm text-red-600">Couldn't load experts: {error}</p>;
  if (!experts) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const pending = experts.filter((e) => !e.is_verified).length;
  // Verified experts who are on the site right now - the ones you can hand work to.
  const live = experts.filter((e) => e.is_verified && e.presence !== "offline").sort(byAvailability);
  const verified = experts.filter((e) => e.is_verified);

  return (
    <div className="space-y-8">
      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-bold text-ink-900">
            <span className="relative flex h-2.5 w-2.5">
              {live.length > 0 && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />}
              <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${live.length ? "bg-emerald-500" : "bg-slate-300"}`} />
            </span>
            Live now
            <span className="text-sm font-normal text-slate-400">
              {live.length} of {verified.length} verified expert{verified.length === 1 ? "" : "s"} on the site
            </span>
          </h2>
          <p className="text-xs text-slate-400">Updates by itself as experts come and go.</p>
        </div>

        {live.length ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {live.map((e) => (
              <div key={e.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-ink-900">{e.full_name}</p>
                    <p className="truncate text-xs text-slate-400">{e.specialty}</p>
                  </div>
                  <PresenceDot status={e.presence} />
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                    {e.open_tasks === 0 ? "Free - nothing assigned" : `${e.open_tasks} open task${e.open_tasks === 1 ? "" : "s"}`}
                  </span>
                  {e.oldest_task_at && (
                    <span className="text-slate-400">oldest {formatRelativeTime(e.oldest_task_at)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-2xl border border-dashed border-slate-200 px-5 py-6 text-center text-sm text-slate-400">
            No verified expert is on the site right now.
            {verified.length > 0 && " Work you assign will reach them by notification, and by email if they're offline."}
          </p>
        )}
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            {experts.length} registered · <strong className="text-ink-900">{verified.length} verified</strong>
            {pending > 0 && <span> · {pending} waiting for verification</span>}
          </p>
          <div className="relative min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search experts…"
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-brand-400 focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3">Expert</th>
                <th className="px-4 py-3">Now</th>
                <th className="px-4 py-3">Open work</th>
                <th className="px-4 py-3">Specialty</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Rating</th>
                <th className="px-4 py-3">Verification</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((e) => (
                <tr key={e.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink-900">{e.full_name}</p>
                    <p className="text-xs text-slate-400">{e.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <PresenceDot status={e.presence} lastSeen={e.last_seen_at} />
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {e.open_tasks > 0 ? (
                      <>
                        {e.open_tasks}
                        {e.oldest_task_at && <span className="block text-xs text-slate-400">oldest {formatRelativeTime(e.oldest_task_at)}</span>}
                      </>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <span className="capitalize">{e.category?.replace("_", " ")}</span>
                    <span className="block text-xs text-slate-400">{e.specialty} · {e.years_experience} yrs</span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatLocation(e) || "-"}</td>
                  <td className="px-4 py-3">
                    <RatingBadge variant="compact" rating={e.rating} reviewCount={e.review_count} emptyLabel="No reviews" />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={busyId === e.id}
                      onClick={() => toggle(e)}
                      className={
                        e.is_verified
                          ? "inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
                          : "inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                      }
                    >
                      {busyId === e.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BadgeCheck className="h-3.5 w-3.5" />}
                      {e.is_verified ? "Verified" : "Verify"}
                    </button>
                  </td>
                </tr>
              ))}
              {!shown.length && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    {experts.length ? "No experts match that search." : "No experts have registered yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
