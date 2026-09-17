import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Loader2, Plus, Building2, MapPin, Trash2, Eye, TrendingUp, CheckCircle2 } from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import Seo from "../../components/Seo";

const statusStyles = {
  available: "bg-emerald-50 text-emerald-600",
  pending: "bg-amber-50 text-amber-700",
  sold: "bg-slate-100 text-slate-500",
};

export default function PropertyOwnerDashboard() {
  const { user, token } = useAuth();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [removingId, setRemovingId] = useState(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    api
      .getMyProperties(token)
      .then(setProperties)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleRemove(property) {
    if (!confirm(`Remove "${property.title}" from the marketplace? This can't be undone.`)) return;
    setRemovingId(property.id);
    try {
      await api.deleteProperty(property.id, token);
      setProperties((prev) => prev.filter((p) => p.id !== property.id));
    } catch (err) {
      alert(err.message);
    } finally {
      setRemovingId(null);
    }
  }

  const stats = useMemo(
    () => ({
      total: properties.length,
      totalViews: properties.reduce((sum, p) => sum + (p.view_count || 0), 0),
      available: properties.filter((p) => p.status === "available").length,
    }),
    [properties]
  );

  if (user?.role === "expert") {
    return <Navigate to="/expert-dashboard" replace />;
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Seo title="My Properties" description="Manage the properties you've listed on CivilBridge." path="/my-properties" />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-ink-900">My Properties</h1>
          <p className="mt-1 text-slate-500">Every listing you own, in one place.</p>
        </div>
        <Link
          to="/list-property"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition-[background-color,transform,box-shadow] duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-md active:translate-y-0"
        >
          <Plus className="h-4 w-4" /> Add Property
        </Link>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-24 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}
      {error && <p className="mt-8 text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="mt-8 space-y-8">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: Building2, label: "Total Listings", value: stats.total },
              { icon: CheckCircle2, label: "Available", value: stats.available },
              { icon: TrendingUp, label: "Total Views", value: stats.totalViews },
            ].map((c) => {
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

          {properties.length ? (
            <div className="grid gap-5 sm:grid-cols-2">
              {properties.map((p) => (
                <div key={p.id} className="overflow-hidden rounded-2xl border border-slate-200 transition-shadow duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:shadow-md">
                  <div className="relative" style={{ aspectRatio: "16 / 9" }}>
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-brand-50 text-brand-300">
                        <Building2 className="h-10 w-10" />
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <Link to={`/marketplace/${p.id}`} className="min-w-0 flex-1">
                        <p className="truncate font-bold text-ink-900">{p.title}</p>
                        <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                          <MapPin className="h-3.5 w-3.5" /> {p.city}
                        </p>
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleRemove(p)}
                        disabled={removingId === p.id}
                        title="Remove listing"
                        className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="mt-2 font-bold text-brand-500">
                      {p.currency} {Number(p.price).toLocaleString()}
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[p.status] || statusStyles.available}`}>
                        {p.status}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Eye className="h-3 w-3" /> {p.view_count} views
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center">
              <Building2 className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-slate-500">You haven't listed any properties yet.</p>
              <Link
                to="/list-property"
                className="mt-4 inline-block rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition-[background-color,transform,box-shadow] duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-md active:translate-y-0"
              >
                List Your First Property
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
