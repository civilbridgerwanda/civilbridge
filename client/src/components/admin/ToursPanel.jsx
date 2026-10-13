import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import { formatLocation } from "../../lib/locations";

const FILTERS = [
  ["open", "Open"],
  ["completed", "Completed"],
  ["all", "All"],
];

const STATUS_STYLE = {
  requested: "bg-amber-50 text-amber-700",
  confirmed: "bg-blue-50 text-blue-700",
  completed: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-slate-100 text-slate-500",
};

// Site-tour requests. "Completed" is what lets that visitor rate the property,
// so only staff can move a tour along (owners and visitors can't). The flow:
// a request comes in -> the team CONFIRMS it -> once its date has passed the
// server completes it automatically (see server lib/maintenance.js). Staff can
// still change any tour by hand, e.g. set a no-show to Cancelled in time.
export default function ToursPanel() {
  const { token } = useAuth();
  const [visits, setVisits] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("open");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      setVisits(await api.adminVisits(token));
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(visit, status) {
    if (status === "completed" && !confirm("Mark this tour as completed? It lets the visitor review the property, so only do it once the visit has really happened.")) {
      return;
    }
    setBusyId(visit.id);
    try {
      const updated = await api.adminUpdateVisit(visit.id, status, token);
      setVisits((rows) => rows.map((v) => (v.id === visit.id ? { ...v, status: updated.status } : v)));
    } catch (err) {
      alert(err.message);
    } finally {
      setBusyId(null);
    }
  }

  if (error) return <p className="text-sm text-red-600">Couldn't load tours: {error}</p>;
  if (!visits) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const shown = visits.filter((v) =>
    filter === "all" ? true : filter === "completed" ? v.status === "completed" : v.status === "requested" || v.status === "confirmed"
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-slate-500">
          Confirm a tour once it's arranged. Confirmed tours complete automatically 24 hours after their date, which lets the visitor
          review the property - so set a no-show to <strong>Cancelled</strong> before then. You can also change any tour by hand.
        </p>
        <div className="flex gap-2">
          {FILTERS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold ${filter === value ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3">Property</th>
              <th className="px-4 py-3">Visitor</th>
              <th className="px-4 py-3">Preferred date</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((v) => (
              <tr key={v.id} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <Link to={`/marketplace/${v.property_id}`} className="font-semibold text-ink-900 hover:underline">
                    {v.Property?.title || "Removed listing"}
                  </Link>
                  <p className="text-xs text-slate-400">{formatLocation(v.Property)}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-ink-900">{v.visitor?.full_name}</p>
                  <p className="text-xs text-slate-400">{v.visitor?.email}</p>
                  {v.phone && <p className="text-xs text-slate-400">{v.phone}</p>}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {v.preferred_date ? new Date(v.preferred_date).toLocaleString() : "-"}
                  {v.note && <p className="mt-0.5 max-w-xs truncate text-xs text-slate-400" title={v.note}>{v.note}</p>}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={v.status}
                    disabled={busyId === v.id}
                    onChange={(e) => setStatus(v, e.target.value)}
                    className={`rounded-lg border-0 px-2 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-200 ${STATUS_STYLE[v.status]}`}
                  >
                    <option value="requested">Requested</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </td>
              </tr>
            ))}
            {!shown.length && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  No tour requests here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
