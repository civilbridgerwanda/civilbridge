import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Users,
  Building2,
  HardHat,
  FileText,
  Mail,
  Calculator,
  Loader2,
  Search,
  TrendingUp,
  TrendingDown,
  Eye,
  Star,
  CreditCard,
  Wallet,
  Clock,
  Plus,
  Pencil,
  Trash2,
  Ban,
  CheckCircle2,
  Send,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import { getRoleTheme } from "../../lib/roleTheme";
import Seo from "../../components/Seo";
import { formatRelativeTime } from "../../lib/formatRelativeTime";
import PropertyFormModal from "../../components/admin/PropertyFormModal";
import PlanFormModal from "../../components/admin/PlanFormModal";
import UserDetailModal from "../../components/admin/UserDetailModal";
import Modal from "../../components/Modal";

const TABS = ["Overview", "Analytics", "Estimates", "Users", "Properties", "Plans", "Inquiries", "Payments", "Conversations", "Newsletter"];
const theme = getRoleTheme("admin");

const paymentStatusStyles = {
  pending: "bg-amber-50 text-amber-700",
  completed: "bg-emerald-50 text-emerald-600",
  failed: "bg-red-50 text-red-600",
  refunded: "bg-slate-100 text-slate-500",
};

function pctChange(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function formatRating(rating) {
  const n = Number(rating);
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export default function AdminDashboard() {
  const { token, user: currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = TABS.includes(searchParams.get("tab")) ? searchParams.get("tab") : "Overview";
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [estimates, setEstimates] = useState([]);
  const [users, setUsers] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [updatingInquiryId, setUpdatingInquiryId] = useState(null);
  const [payments, setPayments] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [viewingConversationId, setViewingConversationId] = useState(null);
  const [conversationDetail, setConversationDetail] = useState(null);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [properties, setProperties] = useState([]);
  const [plans, setPlans] = useState([]);
  const [experts, setExperts] = useState([]);
  const [updatingAssignId, setUpdatingAssignId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [updatingPaymentId, setUpdatingPaymentId] = useState(null);
  const [lastLoaded, setLastLoaded] = useState(null);

  const [userSearch, setUserSearch] = useState(searchParams.get("search") || "");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [viewingUserId, setViewingUserId] = useState(null);

  const [editingProperty, setEditingProperty] = useState(null);
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [showPlanForm, setShowPlanForm] = useState(false);

  const [campaignForm, setCampaignForm] = useState({ subject: "", body: "" });
  const [sendingCampaign, setSendingCampaign] = useState(false);
  const [campaignNotice, setCampaignNotice] = useState(null);

  function setTab(nextTab) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (nextTab === "Overview") next.delete("tab");
      else next.set("tab", nextTab);
      return next;
    });
  }

  useEffect(() => {
    const fromUrl = searchParams.get("search");
    if (fromUrl && fromUrl !== userSearch) setUserSearch(fromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [statsData, analyticsData, estimatesData, usersData, subscribersData, campaignsData, paymentsData, propertiesData, plansData, inquiriesData, expertsData, conversationsData] =
        await Promise.all([
          api.adminStats(token),
          api.adminAnalytics(token),
          api.adminEstimates(token),
          api.adminUsers(token),
          api.adminNewsletter(token),
          api.adminNewsletterCampaigns(token),
          api.adminPayments(token),
          api.getProperties({}, token),
          api.getPlans(),
          api.adminPlanInquiries(token),
          api.getExperts(),
          api.adminListConversations(token),
        ]);
      setStats(statsData);
      setAnalytics(analyticsData);
      setEstimates(estimatesData);
      setUsers(usersData);
      setSubscribers(subscribersData);
      setCampaigns(campaignsData);
      setPayments(paymentsData);
      setProperties(propertiesData);
      setPlans(plansData);
      setInquiries(inquiriesData);
      setExperts(expertsData);
      setConversations(conversationsData);
      setLastLoaded(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-run the Users query whenever the search/role filter changes (debounced).
  useEffect(() => {
    if (tab !== "Users" || !token) return;
    const t = setTimeout(() => {
      api
        .adminUsers(token, { search: userSearch || undefined, role: userRoleFilter })
        .then(setUsers)
        .catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [userSearch, userRoleFilter, tab, token]);

  async function handleStatusChange(estimateId, status) {
    setUpdatingId(estimateId);
    try {
      const updated = await api.updateEstimateStatus(estimateId, status, token);
      setEstimates((prev) => prev.map((e) => (e.id === estimateId ? { ...e, status: updated.status } : e)));
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleRoleChange(userId, role) {
    setUpdatingUserId(userId);
    try {
      const updated = await api.updateUserRole(userId, role, token);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: updated.role } : u)));
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdatingUserId(null);
    }
  }

  async function handlePlanChange(userId, plan) {
    setUpdatingUserId(userId);
    try {
      const updated = await api.updateUserPlan(userId, plan, token);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, plan: updated.plan, requested_plan: updated.requested_plan } : u))
      );
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdatingUserId(null);
    }
  }

  async function handleSuspendToggle(user) {
    setUpdatingUserId(user.id);
    try {
      const updated = await api.setUserSuspended(user.id, !user.is_suspended, token);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, is_suspended: updated.is_suspended } : u)));
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdatingUserId(null);
    }
  }

  async function handleDeleteUser(user) {
    if (!confirm(`Permanently delete ${user.full_name}'s account? This can't be undone.`)) return;
    setUpdatingUserId(user.id);
    try {
      await api.deleteUser(user.id, token);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdatingUserId(null);
    }
  }

  async function handleViewConversation(id) {
    setViewingConversationId(id);
    setLoadingConversation(true);
    setConversationDetail(null);
    try {
      const detail = await api.adminGetConversation(id, token);
      setConversationDetail(detail);
    } catch (err) {
      alert(err.message);
      setViewingConversationId(null);
    } finally {
      setLoadingConversation(false);
    }
  }

  async function handlePaymentStatusChange(paymentId, status) {
    // Completing (or reversing) a purchase changes what the client can do
    // immediately, so make the person confirm they've actually checked the
    // money rather than trusting a stray click on the dropdown.
    const target = payments.find((p) => p.id === paymentId);
    const isPurchase = target && (target.purpose === "plan_upgrade" || target.purpose === "plan_license");
    if (isPurchase && status === "completed" && target.status !== "completed") {
      const ok = confirm(
        `Mark as completed?\n\nOnly do this once you've confirmed ${target.currency} ${Number(target.amount).toLocaleString()} really arrived` +
          ` (${(target.payment_method || "payment").replace(/_/g, " ")}).\n\nThe client's access unlocks immediately.`
      );
      if (!ok) return;
    } else if (isPurchase && target.status === "completed" && status !== "completed") {
      if (!confirm(`Change a completed payment to "${status}"?\n\nThis will take the client's access away again.`)) return;
    }
    setUpdatingPaymentId(paymentId);
    try {
      const updated = await api.updatePaymentStatus(paymentId, status, token);
      setPayments((prev) => prev.map((p) => (p.id === paymentId ? { ...p, status: updated.status } : p)));
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdatingPaymentId(null);
    }
  }

  function handlePropertySaved(saved, wasEdit) {
    setProperties((prev) => (wasEdit ? prev.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...prev]));
    setShowPropertyForm(false);
    setEditingProperty(null);
  }

  async function handleDeleteProperty(property) {
    if (!confirm(`Delete "${property.title}"? This can't be undone.`)) return;
    try {
      await api.adminDeleteProperty(property.id, token);
      setProperties((prev) => prev.filter((p) => p.id !== property.id));
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleApproveProperty(property) {
    try {
      const updated = await api.adminApproveProperty(property.id, token);
      setProperties((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err) {
      alert(err.message);
    }
  }

  function handlePlanSaved(saved, wasEdit) {
    setPlans((prev) => (wasEdit ? prev.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...prev]));
    setShowPlanForm(false);
    setEditingPlan(null);
  }

  async function handleDeletePlan(plan) {
    if (!confirm(`Delete "${plan.title}"? This can't be undone.`)) return;
    try {
      await api.adminDeletePlan(plan.id, token);
      setPlans((prev) => prev.filter((p) => p.id !== plan.id));
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleInquiryStatusChange(inquiryId, status) {
    setUpdatingInquiryId(inquiryId);
    try {
      const updated = await api.updatePlanInquiryStatus(inquiryId, status, token);
      setInquiries((prev) => prev.map((i) => (i.id === inquiryId ? { ...i, status: updated.status } : i)));
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdatingInquiryId(null);
    }
  }

  async function handleAssignInquiry(inquiryId, expertId) {
    setUpdatingAssignId(inquiryId);
    try {
      const updated = await api.assignPlanInquiry(inquiryId, expertId, token);
      setInquiries((prev) =>
        prev.map((i) => (i.id === inquiryId ? { ...i, assigned_expert_id: updated.assigned_expert_id } : i))
      );
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdatingAssignId(null);
    }
  }

  async function handleSendCampaign(e) {
    e.preventDefault();
    setSendingCampaign(true);
    setCampaignNotice(null);
    try {
      const campaign = await api.sendNewsletterCampaign(campaignForm, token);
      setCampaigns((prev) => [campaign, ...prev]);
      setCampaignNotice(`Sent to ${campaign.sent_count} subscriber${campaign.sent_count === 1 ? "" : "s"}.`);
      setCampaignForm({ subject: "", body: "" });
    } catch (err) {
      setCampaignNotice(err.message);
    } finally {
      setSendingCampaign(false);
    }
  }

  // Real trend indicators derived from the analytics windows - week-over-week
  // for estimate volume, month-over-month for new users.
  const trends = useMemo(() => {
    if (!analytics) return {};
    const weeks = analytics.weeklyEstimates;
    const estimateTrend = weeks?.length >= 2 ? pctChange(weeks.at(-1).count, weeks.at(-2).count) : null;

    const months = analytics.monthlyUserGrowth;
    const totalFor = (m) => (m ? m.clients + m.experts : 0);
    const userTrend =
      months?.length >= 2 ? pctChange(totalFor(months.at(-1)), totalFor(months.at(-2))) : null;

    return { estimateTrend, userTrend };
  }, [analytics]);

  const statCards = stats
    ? [
        { icon: Users, label: "Total Users", value: stats.userCount, trend: trends.userTrend },
        { icon: Building2, label: "Properties", value: stats.propertyCount },
        { icon: HardHat, label: "Verified Experts", value: stats.expertCount },
        { icon: FileText, label: "Building Plans", value: stats.planCount },
        { icon: Calculator, label: "Estimates", value: stats.estimateCount, trend: trends.estimateTrend },
        { icon: Mail, label: "Newsletter Subscribers", value: stats.subscriberCount },
      ]
    : [];

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <Seo title="Admin Dashboard" description="CivilBridge admin dashboard." path="/admin" />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-ink-900">Platform Overview</h1>
          <p className="mt-1 text-slate-500">Real-time insights for CivilBridge operations across Rwanda.</p>
        </div>
        {lastLoaded && (
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              System Live
            </span>
            <span className="text-xs text-slate-400">Last update: {formatRelativeTime(lastLoaded)}</span>
          </div>
        )}
      </div>

      <div className="mt-6 flex gap-2 overflow-x-auto border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`shrink-0 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors duration-200 ease-[cubic-bezier(.22,.61,.36,1)] ${
              tab === t
                ? `border-indigo-500 ${theme.text}`
                : "border-transparent text-slate-500 hover:text-ink-900"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-24 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}
      {error && <p className="mt-8 text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="mt-8">
          {tab === "Overview" && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {statCards.map((c) => {
                  const Icon = c.icon;
                  const hasTrend = typeof c.trend === "number";
                  const trendUp = c.trend >= 0;
                  return (
                    <div key={c.label} className="rounded-2xl border border-slate-200 p-6">
                      <div className="flex items-center justify-between">
                        <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${theme.iconChip}`}>
                          <Icon className="h-5 w-5" />
                        </span>
                        {hasTrend && (
                          <span
                            className={`flex items-center gap-1 text-xs font-semibold ${
                              trendUp ? "text-emerald-600" : "text-red-500"
                            }`}
                          >
                            {trendUp ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                            {Math.abs(c.trend)}%
                          </span>
                        )}
                      </div>
                      <p className="mt-4 text-3xl font-extrabold text-ink-900">{c.value}</p>
                      <p className="mt-1 text-sm text-slate-500">{c.label}</p>
                    </div>
                  );
                })}
              </div>

              {analytics && (
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 p-6">
                    <p className="font-bold text-ink-900">Estimate Volume - Last 4 Weeks</p>
                    <div className="mt-4 h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.weeklyEstimates}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} width={24} />
                          <Tooltip cursor={{ fill: "#f8fafc" }} />
                          <Bar dataKey="count" name="Estimates" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-6">
                    <p className="font-bold text-ink-900">User Growth - Last 6 Months</p>
                    <div className="mt-4 h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.monthlyUserGrowth}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} width={24} />
                          <Tooltip cursor={{ fill: "#f8fafc" }} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Bar dataKey="clients" name="Clients" stackId="a" fill="#8ea5c9" radius={[0, 0, 0, 0]} />
                          <Bar dataKey="experts" name="Experts" stackId="a" fill="#03204c" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {stats?.estimatesByStatus && (
                <div className="rounded-2xl border border-slate-200 p-6">
                  <p className="font-bold text-ink-900">Estimates by status</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {Object.entries(stats.estimatesByStatus).map(([status, count]) => (
                      <span
                        key={status}
                        className={`rounded-full px-3 py-1.5 text-sm font-semibold ${theme.iconChip}`}
                      >
                        {status.replace("_", " ")}: {count}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "Analytics" && analytics && (
            <div className="space-y-6">
              <p className="text-sm text-slate-500">
                Usage across every core section of the platform, and what's getting the most
                attention right now.
              </p>

              <div className="rounded-2xl border border-slate-200 p-6">
                <p className="font-bold text-ink-900">Feature Usage - Marketplace, Experts, Plans, Estimator, AI Studio</p>
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.featureUsage}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} width={24} />
                      <Tooltip cursor={{ fill: "#f8fafc" }} />
                      <Bar dataKey="value" name="Records" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                <Leaderboard
                  title="Most Viewed Properties"
                  items={analytics.topProperties}
                  render={(p) => (
                    <>
                      <p className="font-semibold text-ink-900">{p.title}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{p.city}</p>
                    </>
                  )}
                  metric={(p) => (
                    <span className={`flex items-center gap-1 text-sm font-semibold ${theme.text}`}>
                      <Eye className="h-3.5 w-3.5" /> {p.view_count}
                    </span>
                  )}
                />
                <Leaderboard
                  title="Top Rated Experts"
                  items={analytics.topExperts}
                  render={(e) => (
                    <>
                      <p className="font-semibold text-ink-900">{e.full_name}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{e.specialty}</p>
                    </>
                  )}
                  metric={(e) => (
                    <span className={`flex items-center gap-1 text-sm font-semibold ${theme.text}`}>
                      <Star className="h-3.5 w-3.5" fill="currentColor" /> {formatRating(e.rating)}
                    </span>
                  )}
                />
                <Leaderboard
                  title="Most Viewed Plans"
                  items={analytics.topPlans}
                  render={(p) => (
                    <>
                      <p className="font-semibold text-ink-900">{p.title}</p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {formatRating(p.rating)} <Star className="inline h-3 w-3" fill="currentColor" />
                      </p>
                    </>
                  )}
                  metric={(p) => (
                    <span className={`flex items-center gap-1 text-sm font-semibold ${theme.text}`}>
                      <Eye className="h-3.5 w-3.5" /> {p.view_count}
                    </span>
                  )}
                />
              </div>
            </div>
          )}

          {tab === "Estimates" && (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Project</th>
                    <th className="px-4 py-3">Client</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {estimates.map((e) => (
                    <tr key={e.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-semibold text-ink-900">{e.project_name}</td>
                      <td className="px-4 py-3 text-slate-500">{e.User?.full_name || "Guest"}</td>
                      <td className="px-4 py-3 text-slate-500 capitalize">{e.project_type}</td>
                      <td className="px-4 py-3">
                        <select
                          value={e.status}
                          disabled={updatingId === e.id}
                          onChange={(ev) => handleStatusChange(e.id, ev.target.value)}
                          className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:border-brand-400 focus:outline-none"
                        >
                          <option value="draft">Draft</option>
                          <option value="ai_generated">AI Generated</option>
                          <option value="under_review">Under Review</option>
                          <option value="verified">Verified</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {new Date(e.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {!estimates.length && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                        No estimates yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {tab === "Users" && (
            <div>
              <div className="mb-4 flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search by name or email..."
                    className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-brand-400 focus:outline-none"
                  />
                </div>
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
                >
                  <option value="all">All Roles</option>
                  <option value="client">Client</option>
                  <option value="expert">Expert</option>
                  <option value="property_owner">Property Owner</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Plan</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-semibold text-ink-900">{u.full_name}</td>
                        <td className="px-4 py-3 text-slate-500">{u.email}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                u.email_verified ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {u.email_verified ? "Verified" : "Unverified"}
                            </span>
                            {u.is_suspended && (
                              <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600">
                                Suspended
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={u.role}
                            disabled={updatingUserId === u.id}
                            onChange={(ev) => handleRoleChange(u.id, ev.target.value)}
                            className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs capitalize focus:border-brand-400 focus:outline-none"
                          >
                            <option value="client">Client</option>
                            <option value="expert">Expert</option>
                            <option value="property_owner">Property Owner</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={u.plan}
                            disabled={updatingUserId === u.id}
                            onChange={(ev) => handlePlanChange(u.id, ev.target.value)}
                            className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs capitalize focus:border-brand-400 focus:outline-none"
                          >
                            <option value="starter">Starter</option>
                            <option value="professional">Professional</option>
                            <option value="business">Business</option>
                          </select>
                          {u.requested_plan && (
                            <span
                              title={`Requested upgrade to ${u.requested_plan}`}
                              className="mt-1 flex items-center gap-1 text-xs font-semibold text-amber-600"
                            >
                              <Clock className="h-3 w-3" /> Wants {u.requested_plan}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setViewingUserId(u.id)}
                              title="View details"
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSuspendToggle(u)}
                              disabled={updatingUserId === u.id}
                              title={u.is_suspended ? "Unsuspend" : "Suspend"}
                              className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-50"
                            >
                              {u.is_suspended ? <CheckCircle2 className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                            </button>
                            {u.id !== currentUser?.id && (
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u)}
                                disabled={updatingUserId === u.id}
                                title="Delete account"
                                className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!users.length && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                          No users match your filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "Properties" && (
            <div>
              <div className="mb-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setEditingProperty(null);
                    setShowPropertyForm(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition-[background-color,transform,box-shadow] duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-md active:translate-y-0"
                >
                  <Plus className="h-4 w-4" /> Add Property
                </button>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Title</th>
                      <th className="px-4 py-3">City</th>
                      <th className="px-4 py-3">Price</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Views</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {properties.map((p) => (
                      <tr key={p.id} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-semibold text-ink-900">
                          {p.title}
                          {!p.is_approved && (
                            <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                              Pending Approval
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500">{p.city}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {p.currency} {Number(p.price).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 capitalize text-slate-500">{p.status}</td>
                        <td className="px-4 py-3 text-slate-400">{p.view_count}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {!p.is_approved && (
                              <button
                                type="button"
                                onClick={() => handleApproveProperty(p)}
                                title="Approve"
                                className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingProperty(p);
                                setShowPropertyForm(true);
                              }}
                              title="Edit"
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProperty(p)}
                              title="Delete"
                              className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!properties.length && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                          No properties yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "Plans" && (
            <div>
              <div className="mb-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setEditingPlan(null);
                    setShowPlanForm(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition-[background-color,transform,box-shadow] duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-md active:translate-y-0"
                >
                  <Plus className="h-4 w-4" /> Add Plan
                </button>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Title</th>
                      <th className="px-4 py-3">City</th>
                      <th className="px-4 py-3">Price</th>
                      <th className="px-4 py-3">Rating</th>
                      <th className="px-4 py-3">Views</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plans.map((p) => (
                      <tr key={p.id} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-semibold text-ink-900">{p.title}</td>
                        <td className="px-4 py-3 text-slate-500">{p.city}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {p.currency} {Number(p.price).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-slate-500">{formatRating(p.rating)}</td>
                        <td className="px-4 py-3 text-slate-400">{p.view_count}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPlan(p);
                                setShowPlanForm(true);
                              }}
                              title="Edit"
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePlan(p)}
                              title="Delete"
                              className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!plans.length && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                          No plans yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "Inquiries" && (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">WhatsApp</th>
                    <th className="px-4 py-3">Message</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Assigned To</th>
                    <th className="px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {inquiries.map((i) => (
                    <tr key={i.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-semibold text-ink-900">{i.full_name}</td>
                      <td className="px-4 py-3 text-slate-500">{i.Plan?.title || "—"}</td>
                      <td className="px-4 py-3 text-slate-500">{i.email}</td>
                      <td className="px-4 py-3 text-slate-500">
                        <a
                          href={`https://wa.me/${i.whatsapp.replace(/[^\d]/g, "")}`}
                          className="text-brand-500 hover:underline"
                        >
                          {i.whatsapp}
                        </a>
                      </td>
                      <td className="max-w-xs truncate px-4 py-3 text-slate-500" title={i.message || ""}>
                        {i.message || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={i.status}
                          disabled={updatingInquiryId === i.id}
                          onChange={(ev) => handleInquiryStatusChange(i.id, ev.target.value)}
                          className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs capitalize focus:border-brand-400 focus:outline-none"
                        >
                          <option value="new">New</option>
                          <option value="contacted">Contacted</option>
                          <option value="closed">Closed</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={i.assigned_expert_id || ""}
                          disabled={updatingAssignId === i.id}
                          onChange={(ev) => handleAssignInquiry(i.id, ev.target.value || null)}
                          className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:border-brand-400 focus:outline-none"
                        >
                          <option value="">Unassigned</option>
                          {experts.map((e) => (
                            <option key={e.id} value={e.id}>
                              {e.full_name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{new Date(i.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {!inquiries.length && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                        No "Talk to an Expert" requests yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {tab === "Payments" && analytics && (
            <div className="space-y-6">
              <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
                No payment gateway is connected yet - these are pending/manually-reconciled
                records, not real charges. See the README for how to connect Flutterwave.
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 p-6">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <Wallet className="h-5 w-5" />
                  </span>
                  <p className="mt-4 text-3xl font-extrabold text-ink-900">
                    RWF {analytics.totalRevenue.toLocaleString()}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">Total Revenue (Completed)</p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-6">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                    <Clock className="h-5 w-5" />
                  </span>
                  <p className="mt-4 text-3xl font-extrabold text-ink-900">{analytics.pendingPaymentsCount}</p>
                  <p className="mt-1 text-sm text-slate-500">Pending Payments</p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-6">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${theme.iconChip}`}>
                    <CreditCard className="h-5 w-5" />
                  </span>
                  <p className="mt-4 text-3xl font-extrabold text-ink-900">{payments.length}</p>
                  <p className="mt-1 text-sm text-slate-500">Total Transactions</p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Payer</th>
                      <th className="px-4 py-3">For</th>
                      <th className="px-4 py-3">Method / Reference</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-semibold text-ink-900">
                          {p.payer?.full_name || "—"}
                          {p.payer?.email && <span className="block text-xs font-normal text-slate-400">{p.payer.email}</span>}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {p.notes || <span className="capitalize">{p.purpose.replace(/_/g, " ")}</span>}
                          {(p.purpose === "plan_upgrade" || p.purpose === "plan_license") && (
                            <span className="block text-xs text-indigo-500">Unlocks automatically when completed</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          <span className="capitalize">{p.payment_method ? p.payment_method.replace(/_/g, " ") : "—"}</span>
                          {p.provider_reference && <span className="block text-xs text-slate-400">Ref: {p.provider_reference}</span>}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {p.currency} {Number(p.amount).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={p.status}
                            disabled={updatingPaymentId === p.id}
                            onChange={(ev) => handlePaymentStatusChange(p.id, ev.target.value)}
                            className={`rounded-lg border-0 px-2 py-1.5 text-xs font-semibold capitalize focus:outline-none ${paymentStatusStyles[p.status]}`}
                          >
                            <option value="pending">Pending</option>
                            <option value="completed">Completed</option>
                            <option value="failed">Failed</option>
                            <option value="refunded">Refunded</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-slate-400">{new Date(p.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                    {!payments.length && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                          No payments yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "Conversations" && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">
                Read-only visibility into direct conversations between clients, experts, and property owners -
                for policy and compliance oversight, not for participating.
              </p>
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Participants</th>
                      <th className="px-4 py-3">Last Message</th>
                      <th className="px-4 py-3">Messages</th>
                      <th className="px-4 py-3">Updated</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {conversations.map((c) => (
                      <tr key={c.id} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-semibold text-ink-900">
                          {c.userA?.full_name || "Deleted user"} <span className="font-normal text-slate-400">&harr;</span>{" "}
                          {c.userB?.full_name || "Deleted user"}
                        </td>
                        <td className="max-w-xs truncate px-4 py-3 text-slate-500">{c.lastMessage || "—"}</td>
                        <td className="px-4 py-3 text-slate-500">{c.messageCount}</td>
                        <td className="px-4 py-3 text-slate-400">{new Date(c.updatedAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleViewConversation(c.id)}
                            className={`rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold hover:bg-slate-100 ${theme.text}`}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!conversations.length && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                          No conversations yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "Newsletter" && (
            <div className="space-y-8">
              <div className="rounded-2xl border border-slate-200 p-6">
                <p className="font-bold text-ink-900">Compose Newsletter</p>
                <p className="mt-1 text-sm text-slate-500">
                  Sends to all {stats?.subscriberCount || 0} active subscribers.
                </p>
                {campaignNotice && (
                  <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{campaignNotice}</p>
                )}
                <form onSubmit={handleSendCampaign} className="mt-4 space-y-3">
                  <input
                    required
                    placeholder="Subject"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
                    value={campaignForm.subject}
                    onChange={(e) => setCampaignForm({ ...campaignForm, subject: e.target.value })}
                  />
                  <textarea
                    required
                    rows={5}
                    placeholder="Write your update..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
                    value={campaignForm.body}
                    onChange={(e) => setCampaignForm({ ...campaignForm, body: e.target.value })}
                  />
                  <button
                    disabled={sendingCampaign}
                    className="flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition-[background-color,opacity,transform,box-shadow] duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-md active:translate-y-0 disabled:opacity-60"
                  >
                    {sendingCampaign ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {sendingCampaign ? "Sending…" : "Send Newsletter"}
                  </button>
                </form>
              </div>

              {campaigns.length > 0 && (
                <div>
                  <p className="font-bold text-ink-900">Past Campaigns</p>
                  <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Subject</th>
                          <th className="px-4 py-3">Sent To</th>
                          <th className="px-4 py-3">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {campaigns.map((c) => (
                          <tr key={c.id} className="border-t border-slate-100">
                            <td className="px-4 py-3 font-semibold text-ink-900">{c.subject}</td>
                            <td className="px-4 py-3 text-slate-500">{c.sent_count} subscribers</td>
                            <td className="px-4 py-3 text-slate-400">{new Date(c.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div>
                <p className="font-bold text-ink-900">Subscribers</p>
                <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Subscribed</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subscribers.map((s) => (
                        <tr key={s.id} className="border-t border-slate-100">
                          <td className="px-4 py-3 font-semibold text-ink-900">{s.email}</td>
                          <td className="px-4 py-3 text-slate-500">
                            {new Date(s.subscribed_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                s.is_active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {s.is_active ? "Active" : "Unsubscribed"}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {!subscribers.length && (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                            No subscribers yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {showPropertyForm && (
        <PropertyFormModal
          property={editingProperty}
          onClose={() => {
            setShowPropertyForm(false);
            setEditingProperty(null);
          }}
          onSaved={handlePropertySaved}
        />
      )}
      {showPlanForm && (
        <PlanFormModal
          plan={editingPlan}
          onClose={() => {
            setShowPlanForm(false);
            setEditingPlan(null);
          }}
          onSaved={handlePlanSaved}
        />
      )}
      {viewingUserId && <UserDetailModal userId={viewingUserId} onClose={() => setViewingUserId(null)} />}

      {viewingConversationId && (
        <Modal
          title={
            conversationDetail
              ? `${conversationDetail.userA?.full_name || "Deleted user"} & ${conversationDetail.userB?.full_name || "Deleted user"}`
              : "Conversation"
          }
          onClose={() => setViewingConversationId(null)}
        >
          {loadingConversation ? (
            <div className="flex items-center justify-center py-10 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : conversationDetail ? (
            <div className="max-h-[60vh] space-y-3 overflow-y-auto">
              {conversationDetail.messages.map((m) => {
                const isA = m.sender_id === conversationDetail.userA?.id;
                const sender = isA ? conversationDetail.userA : conversationDetail.userB;
                return (
                  <div key={m.id} className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-slate-500">
                      {sender?.full_name || "Deleted user"} ({sender?.role || "unknown"}) ·{" "}
                      {new Date(m.created_at).toLocaleString()}
                    </p>
                    <p className="mt-1 text-sm text-ink-900">{m.content}</p>
                  </div>
                );
              })}
              {!conversationDetail.messages.length && (
                <p className="py-6 text-center text-sm text-slate-400">No messages in this conversation yet.</p>
              )}
            </div>
          ) : null}
        </Modal>
      )}
    </div>
  );
}

function Leaderboard({ title, items, render, metric }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-6">
      <p className="font-bold text-ink-900">{title}</p>
      {items?.length ? (
        <ol className="mt-4 space-y-3">
          {items.map((item, i) => (
            <li key={item.id} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                  {i + 1}
                </span>
                <div className="min-w-0">{render(item)}</div>
              </div>
              {metric(item)}
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-4 text-sm text-slate-400">No data yet.</p>
      )}
    </div>
  );
}
