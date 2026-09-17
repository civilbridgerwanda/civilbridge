import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  Loader2,
  Star,
  BadgeCheck,
  Clock,
  Pencil,
  CheckCircle2,
  ListChecks,
  TrendingUp,
  Trash2,
  ClipboardCheck,
  Plus,
  X,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import Seo from "../../components/Seo";
import ContactSupportButton from "../../components/ContactSupportButton";
import { PlanBadge, UpgradeSuggestion } from "../../components/PlanBadge";

function formatRating(rating) {
  const n = Number(rating);
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

const STATUS_COLORS = {
  ai_generated: "#8ea5c9", // brand-300-ish
  under_review: "#eba82c", // gold-500
  verified: "#03204c", // brand-500
};

const STATUS_LABELS = {
  ai_generated: "New",
  under_review: "In Review",
  verified: "Verified",
};

// Builds the last N months as { key: "2026-01", label: "Jan" } so a trend
// chart always shows a fixed window even for months with zero activity.
function lastNMonths(n) {
  const months = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleDateString(undefined, { month: "short" }),
    });
  }
  return months;
}

export default function ExpertDashboard() {
  const { user, token } = useAuth();
  const [profile, setProfile] = useState(null);
  const [queue, setQueue] = useState([]);
  const [expertId, setExpertId] = useState(null);
  const [assignedInquiries, setAssignedInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const [showPortfolioForm, setShowPortfolioForm] = useState(false);
  const [portfolioForm, setPortfolioForm] = useState({ title: "", description: "", image_url: "" });
  const [savingPortfolio, setSavingPortfolio] = useState(false);
  const [deletingPortfolioId, setDeletingPortfolioId] = useState(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    Promise.all([
      api.getMyExpertProfile(token),
      api.getAssignedEstimates(token),
      api.getMyAssignedPlanInquiries(token),
    ])
      .then(([p, assigned, inquiries]) => {
        setProfile(p);
        setQueue(assigned.estimates);
        setExpertId(assigned.expertId);
        setAssignedInquiries(inquiries);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleReview(id, status) {
    setUpdatingId(id);
    try {
      const updated = await api.updateEstimateStatus(id, status, token);
      setQueue((prev) => prev.map((e) => (e.id === id ? { ...e, status: updated.status } : e)));
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleAddPortfolioItem(e) {
    e.preventDefault();
    setSavingPortfolio(true);
    try {
      const item = await api.addPortfolioItem(portfolioForm, token);
      setProfile((prev) => ({ ...prev, portfolio: [item, ...(prev.portfolio || [])] }));
      setPortfolioForm({ title: "", description: "", image_url: "" });
      setShowPortfolioForm(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingPortfolio(false);
    }
  }

  async function handleDeletePortfolioItem(item) {
    if (!confirm(`Remove "${item.title}" from your recent work?`)) return;
    setDeletingPortfolioId(item.id);
    try {
      await api.deletePortfolioItem(item.id, token);
      setProfile((prev) => ({ ...prev, portfolio: prev.portfolio.filter((p) => p.id !== item.id) }));
    } catch (err) {
      alert(err.message);
    } finally {
      setDeletingPortfolioId(null);
    }
  }

  // Everything below is derived client-side from the review queue, which
  // already includes every estimate ever reviewed by this expert (not just
  // the current pending ones) - see the /assigned endpoint.
  const stats = useMemo(() => {
    const verified = queue.filter((e) => e.status === "verified" && e.reviewed_by === expertId);
    const pending = queue.filter((e) => e.status !== "verified");
    const now = new Date();
    const verifiedThisMonth = verified.filter((e) => {
      const d = new Date(e.updated_at || e.created_at);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
    return {
      totalVerified: verified.length,
      pendingCount: pending.length,
      verifiedThisMonth: verifiedThisMonth.length,
    };
  }, [queue, expertId]);

  const statusBreakdown = useMemo(() => {
    const counts = { ai_generated: 0, under_review: 0, verified: 0 };
    queue.forEach((e) => {
      if (counts[e.status] !== undefined) counts[e.status] += 1;
    });
    return Object.entries(counts)
      .filter(([, count]) => count > 0)
      .map(([status, count]) => ({ status, count, label: STATUS_LABELS[status] }));
  }, [queue]);

  const monthlyTrend = useMemo(() => {
    const months = lastNMonths(6);
    const buckets = Object.fromEntries(months.map((m) => [m.key, 0]));
    queue
      .filter((e) => e.status === "verified" && e.reviewed_by === expertId)
      .forEach((e) => {
        const d = new Date(e.updated_at || e.created_at);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (key in buckets) buckets[key] += 1;
      });
    return months.map((m) => ({ label: m.label, reviews: buckets[m.key] }));
  }, [queue, expertId]);

  const statCards = [
    { icon: ListChecks, label: "In Queue", value: stats.pendingCount },
    { icon: CheckCircle2, label: "Verified This Month", value: stats.verifiedThisMonth },
    { icon: TrendingUp, label: "Total Verified", value: stats.totalVerified },
  ];

  // Users without any account-level "expert" role shouldn't land here.
  if (user && user.role !== "expert" && user.role !== "admin") {
    return <Navigate to="/join-as-expert" replace />;
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Seo title="Expert Dashboard" description="Manage your CivilBridge expert profile and reviews." path="/expert-dashboard" />

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-extrabold text-ink-900">Expert Dashboard</h1>
        <PlanBadge plan={user?.plan} />
      </div>
      <p className="mt-1 text-slate-500">Your profile, stats, and estimates waiting for review.</p>

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
        <div className="mt-8 space-y-10">
          {profile ? (
            <div className="rounded-2xl border border-slate-200 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile.full_name} className="h-16 w-16 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-xl font-bold text-brand-600">
                      {profile.full_name?.[0]}
                    </div>
                  )}
                  <div>
                    <p className="flex items-center gap-1.5 text-lg font-bold text-ink-900">
                      {profile.full_name}
                      {profile.is_verified && <BadgeCheck className="h-4 w-4 text-brand-500" />}
                    </p>
                    <p className="text-sm text-brand-500">{profile.specialty}</p>
                  </div>
                </div>
                <Link
                  to="/join-as-expert"
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold text-ink-900 hover:bg-slate-100"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit Profile
                </Link>
              </div>

              <div className="mt-4">
                <ContactSupportButton className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-ink-900 transition-colors duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:bg-slate-100" />
              </div>

              {!profile.is_verified && (
                <p className="mt-4 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-700">
                  Your profile is pending verification by a CivilBridge admin. It's still
                  visible in the directory, but the verified badge will appear once reviewed.
                </p>
              )}

              <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
                <Star className="h-4 w-4 text-gold-400" fill="currentColor" />
                {formatRating(profile.rating)} ({profile.review_count} reviews) ·{" "}
                {profile.completed_projects} completed projects
              </div>

              {/* Recent Work / Portfolio */}
              <div className="mt-6 border-t border-slate-100 pt-6">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-ink-900">Recent Work</p>
                  <button
                    type="button"
                    onClick={() => setShowPortfolioForm((v) => !v)}
                    className="flex items-center gap-1.5 text-sm font-semibold text-brand-500 hover:underline"
                  >
                    {showPortfolioForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                    {showPortfolioForm ? "Cancel" : "Add Work"}
                  </button>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  Showcase recent projects on your public profile so clients can see your work.
                </p>

                {showPortfolioForm && (
                  <form onSubmit={handleAddPortfolioItem} className="mt-4 space-y-3 rounded-xl bg-slate-50 p-4">
                    <input
                      required
                      placeholder="Project title"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
                      value={portfolioForm.title}
                      onChange={(e) => setPortfolioForm({ ...portfolioForm, title: e.target.value })}
                    />
                    <textarea
                      rows={2}
                      placeholder="Brief description (optional)"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
                      value={portfolioForm.description}
                      onChange={(e) => setPortfolioForm({ ...portfolioForm, description: e.target.value })}
                    />
                    <input
                      placeholder="Image URL (optional)"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
                      value={portfolioForm.image_url}
                      onChange={(e) => setPortfolioForm({ ...portfolioForm, image_url: e.target.value })}
                    />
                    <button
                      disabled={savingPortfolio}
                      className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-[background-color,opacity,transform,box-shadow] duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-md active:translate-y-0 disabled:opacity-60"
                    >
                      {savingPortfolio && <Loader2 className="h-4 w-4 animate-spin" />}
                      {savingPortfolio ? "Saving…" : "Save"}
                    </button>
                  </form>
                )}

                {profile.portfolio?.length ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {profile.portfolio.map((item) => (
                      <div key={item.id} className="flex items-start justify-between gap-2 rounded-xl border border-slate-200 p-4">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-ink-900">{item.title}</p>
                          {item.description && <p className="mt-1 text-sm text-slate-500">{item.description}</p>}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeletePortfolioItem(item)}
                          disabled={deletingPortfolioId === item.id}
                          title="Remove"
                          className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  !showPortfolioForm && <p className="mt-4 text-sm text-slate-400">No recent work added yet.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
              <p className="text-slate-500">You haven't created an expert profile yet.</p>
              <Link
                to="/join-as-expert"
                className="mt-4 inline-block rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition-[background-color,transform,box-shadow] duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-md active:translate-y-0"
              >
                Create Your Profile
              </Link>
            </div>
          )}

          {/* Stats */}
          <section>
            <div className="grid gap-4 sm:grid-cols-3">
              {statCards.map((c) => {
                const Icon = c.icon;
                return (
                  <div key={c.label} className="rounded-2xl border border-slate-200 p-5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-500">
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    <p className="mt-3 text-2xl font-extrabold text-ink-900">{c.value}</p>
                    <p className="mt-1 text-sm text-slate-500">{c.label}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Charts */}
          <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-2xl border border-slate-200 p-6">
              <p className="font-bold text-ink-900">Verified Reviews - Last 6 Months</p>
              <div className="mt-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} width={24} />
                    <Tooltip cursor={{ fill: "#f8fafc" }} />
                    <Bar dataKey="reviews" fill="#03204c" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-6">
              <p className="font-bold text-ink-900">Queue Breakdown</p>
              {statusBreakdown.length ? (
                <>
                  <div className="mt-4 h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={statusBreakdown} dataKey="count" nameKey="label" innerRadius={40} outerRadius={65} paddingAngle={2}>
                          {statusBreakdown.map((entry) => (
                            <Cell key={entry.status} fill={STATUS_COLORS[entry.status]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-2 space-y-1.5">
                    {statusBreakdown.map((entry) => (
                      <div key={entry.status} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-slate-600">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[entry.status] }} />
                          {entry.label}
                        </span>
                        <span className="font-semibold text-ink-900">{entry.count}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="mt-4 text-sm text-slate-400">Nothing to show yet.</p>
              )}
            </div>
          </section>

          {/* Assigned Plan Inquiries */}
          <section>
            <h2 className="flex items-center gap-2 text-lg font-bold text-ink-900">
              <ClipboardCheck className="h-5 w-5 text-brand-500" /> Plans Assigned To You
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              "Talk to an Expert" requests an admin has routed to you.
            </p>

            {assignedInquiries.length ? (
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Plan</th>
                      <th className="px-4 py-3">From</th>
                      <th className="px-4 py-3">WhatsApp</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignedInquiries.map((i) => (
                      <tr key={i.id} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-semibold text-ink-900">{i.Plan?.title || "—"}</td>
                        <td className="px-4 py-3 text-slate-500">
                          {i.full_name} ({i.email})
                        </td>
                        <td className="px-4 py-3">
                          <a href={`https://wa.me/${i.whatsapp.replace(/[^\d]/g, "")}`} className="text-brand-500 hover:underline">
                            {i.whatsapp}
                          </a>
                        </td>
                        <td className="px-4 py-3 capitalize text-slate-500">{i.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">Nothing assigned to you yet.</p>
            )}
          </section>

          <section>
            <h2 className="flex items-center gap-2 text-lg font-bold text-ink-900">
              <Clock className="h-5 w-5 text-brand-500" /> Review Queue
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Estimates awaiting expert review, plus ones you've already reviewed.
            </p>

            {queue.length ? (
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Project</th>
                      <th className="px-4 py-3">Client</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queue.map((e) => (
                      <tr key={e.id} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-semibold text-ink-900">{e.project_name}</td>
                        <td className="px-4 py-3 text-slate-500">{e.User?.full_name || "Guest"}</td>
                        <td className="px-4 py-3 capitalize text-slate-500">{e.status.replace("_", " ")}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            {e.status !== "under_review" && (
                              <button
                                type="button"
                                disabled={updatingId === e.id}
                                onClick={() => handleReview(e.id, "under_review")}
                                className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold hover:bg-slate-100"
                              >
                                Mark Reviewing
                              </button>
                            )}
                            {e.status !== "verified" && (
                              <button
                                type="button"
                                disabled={updatingId === e.id}
                                onClick={() => handleReview(e.id, "verified")}
                                className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white transition-[background-color,transform,box-shadow] duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-md active:translate-y-0"
                              >
                                Verify
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">Nothing in the queue right now.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
