import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Loader2,
  Plus,
  Calculator,
  CheckCircle2,
  ListChecks,
  Clock,
  AlertCircle,
  Sparkles,
  UserCheck,
  ChevronDown,
} from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import { socket } from "../../lib/socket";
import { formatRelativeTime } from "../../lib/formatRelativeTime";
import Seo from "../../components/Seo";
import ContactSupportButton from "../../components/ContactSupportButton";
import { PlanBadge, UpgradeSuggestion } from "../../components/PlanBadge";

const statusStyles = {
  draft: "bg-slate-100 text-slate-600",
  ai_generated: "bg-blue-50 text-blue-600",
  under_review: "bg-amber-50 text-amber-700",
  verified: "bg-emerald-50 text-emerald-600",
};

// Metric-card accents keyed to the same states used everywhere else on the
// dashboard, so "verified" always reads emerald and "pending" always reads
// amber regardless of which component is showing it.
const metricStyles = {
  total: "bg-brand-50 text-brand-500",
  verified: "bg-emerald-50 text-emerald-600",
  pending: "bg-amber-50 text-amber-600",
};

export default function ClientDashboard() {
  const { user, token } = useAuth();
  const [estimates, setEstimates] = useState([]);
  const [experts, setExperts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assigningId, setAssigningId] = useState(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    Promise.all([api.getMyEstimates(token), api.getExperts()])
      .then(([ests, exps]) => {
        setEstimates(ests);
        setExperts(exps);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  // Live status updates for estimates shown on this dashboard.
  useEffect(() => {
    function handleStatusChange(updated) {
      setEstimates((prev) => prev.map((e) => (e.id === updated.id ? { ...e, status: updated.status } : e)));
    }
    socket.on("estimate:status_changed", handleStatusChange);
    return () => socket.off("estimate:status_changed", handleStatusChange);
  }, []);

  async function handleAssignExpert(estimateId, expertId) {
    if (!expertId) return;
    setAssigningId(estimateId);
    try {
      const updated = await api.assignEstimateExpert(estimateId, expertId, token);
      setEstimates((prev) =>
        prev.map((e) => (e.id === estimateId ? { ...e, assigned_expert_id: updated.assigned_expert_id } : e))
      );
    } catch (err) {
      alert(err.message);
    } finally {
      setAssigningId(null);
    }
  }

  const stats = useMemo(
    () => ({
      totalEstimates: estimates.length,
      verifiedEstimates: estimates.filter((e) => e.status === "verified").length,
      pendingEstimates: estimates.filter((e) => e.status !== "verified").length,
    }),
    [estimates]
  );

  // A lightweight activity feed synthesized from estimate state rather than
  // a dedicated audit-log endpoint - each estimate contributes one entry per
  // milestone it has actually reached (created, assigned, reviewed).
  const activity = useMemo(() => {
    const events = [];
    for (const e of estimates) {
      events.push({
        id: `${e.id}-created`,
        icon: Sparkles,
        tone: "blue",
        text: `AI estimate generated for "${e.project_name}"`,
        at: e.created_at,
      });
      if (e.assigned_expert_id) {
        const expert = experts.find((x) => x.id === e.assigned_expert_id);
        events.push({
          id: `${e.id}-assigned`,
          icon: UserCheck,
          tone: "brand",
          text: `${expert ? expert.full_name : "An expert"} assigned to review "${e.project_name}"`,
          at: e.updated_at,
        });
      }
      if (e.status === "under_review") {
        events.push({
          id: `${e.id}-review`,
          icon: Clock,
          tone: "amber",
          text: `"${e.project_name}" is under expert review`,
          at: e.updated_at,
        });
      }
      if (e.status === "verified") {
        events.push({
          id: `${e.id}-verified`,
          icon: CheckCircle2,
          tone: "emerald",
          text: `"${e.project_name}" was verified by an expert`,
          at: e.updated_at,
        });
      }
    }
    return events.sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 6);
  }, [estimates, experts]);

  const activityTone = {
    blue: "bg-blue-50 text-blue-600",
    brand: "bg-brand-50 text-brand-500",
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Seo title="My Dashboard" description="Your CivilBridge estimates." path="/dashboard" />

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-extrabold text-ink-900">Welcome back, {user?.full_name?.split(" ")[0]}</h1>
        <PlanBadge plan={user?.plan} />
      </div>
      <p className="mt-1 text-slate-500">Your estimates, all in one place.</p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          to="/estimator"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition-[background-color,transform,box-shadow] duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-md active:translate-y-0"
        >
          <Plus className="h-4 w-4" /> New Estimate
        </Link>
        <ContactSupportButton />
      </div>

      <div className="mt-4">
        <UpgradeSuggestion plan={user?.plan} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-brand-500 to-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition-opacity duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:opacity-90" />
      </div>

      {loading && (
        <div className="flex items-center justify-center py-24 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}
      {error && <p className="mt-8 text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="mt-10 space-y-10">
          {stats.pendingEstimates > 0 && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              <p className="text-sm text-amber-800">
                {stats.pendingEstimates} estimate{stats.pendingEstimates === 1 ? "" : "s"} awaiting expert review.
                You'll be notified the moment {stats.pendingEstimates === 1 ? "it's" : "each is"} verified.
              </p>
            </div>
          )}

          <section>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { key: "total", icon: ListChecks, label: "Total Estimates", value: stats.totalEstimates },
                { key: "verified", icon: CheckCircle2, label: "Verified Estimates", value: stats.verifiedEstimates },
                { key: "pending", icon: Clock, label: "Pending Review", value: stats.pendingEstimates },
              ].map((c) => {
                const Icon = c.icon;
                return (
                  <div key={c.label} className="rounded-2xl border border-brand-100 bg-white p-5 shadow-sm">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${metricStyles[c.key]}`}>
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    <p className="mt-3 text-2xl font-extrabold text-ink-900">{c.value}</p>
                    <p className="mt-1 text-sm text-slate-500">{c.label}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <h2 className="flex items-center gap-2 text-lg font-bold text-ink-900">
              <Calculator className="h-5 w-5 text-brand-500" /> My Estimates
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Want a specific expert to review yours? Assign one directly instead of waiting in the general queue.
            </p>
            {estimates.length ? (
              <div className="mt-4 overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-brand-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Project</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Assign Expert</th>
                      <th className="px-4 py-3">Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estimates.map((e) => {
                      const assignedExpert = experts.find((x) => x.id === e.assigned_expert_id);
                      return (
                        <tr key={e.id} className="border-t border-slate-100">
                          <td className="px-4 py-3 font-semibold text-ink-900">
                            <Link to={`/estimates/${e.id}`} className="hover:text-brand-500 hover:underline">
                              {e.project_name}
                            </Link>
                          </td>
                          <td className="px-4 py-3 capitalize text-slate-500">{e.project_type}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[e.status] || statusStyles.draft}`}>
                              {e.status.replace("_", " ")}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {/* A native <select> stacked under a styled pill so it
                                keeps working exactly as before (click anywhere
                                on the pill opens the real dropdown), while
                                reading as a compact status badge rather than a
                                bare form control. */}
                            <div className="relative inline-block">
                              <span
                                className={`pointer-events-none flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                                  assignedExpert ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                                } ${assigningId === e.id ? "opacity-60" : ""}`}
                              >
                                <UserCheck className="h-3.5 w-3.5" />
                                {assigningId === e.id
                                  ? "Assigning…"
                                  : assignedExpert
                                    ? assignedExpert.full_name
                                    : "Any expert"}
                                <ChevronDown className="h-3.5 w-3.5" />
                              </span>
                              <select
                                value={e.assigned_expert_id || ""}
                                disabled={assigningId === e.id}
                                onChange={(ev) => handleAssignExpert(e.id, ev.target.value)}
                                aria-label={`Assign an expert to ${e.project_name}`}
                                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                              >
                                <option value="">Any expert</option>
                                {experts.map((exp) => (
                                  <option key={exp.id} value={exp.id}>
                                    {exp.full_name} ({exp.specialty})
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-400">{new Date(e.created_at).toLocaleDateString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                No estimates yet. <Link to="/estimator" className="font-semibold text-brand-500 hover:underline">Create your first one</Link>.
              </p>
            )}
          </section>

          {activity.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-ink-900">Recent Activity</h2>
              <div className="mt-4 rounded-2xl border border-brand-100 bg-white p-5 shadow-sm">
                <ol className="relative space-y-5 border-l border-slate-100 pl-6">
                  {activity.map((ev) => {
                    const Icon = ev.icon;
                    return (
                      <li key={ev.id} className="relative">
                        <span
                          className={`absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white ${activityTone[ev.tone]}`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <p className="text-sm text-ink-900">{ev.text}</p>
                        <p className="mt-0.5 text-xs text-slate-400">{formatRelativeTime(ev.at)}</p>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
