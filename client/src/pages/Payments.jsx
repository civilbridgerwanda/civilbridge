import { useEffect, useState } from "react";
import { CreditCard, Plus, Loader2, X } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import Seo from "../components/Seo";

const PURPOSES = [
  { value: "expert_consultation", label: "Expert Consultation" },
  { value: "priority_review", label: "Priority Estimate Review" },
  { value: "listing_boost", label: "Property Listing Boost" },
  { value: "platform_fee", label: "Platform Fee" },
];

const statusStyles = {
  pending: "bg-amber-50 text-amber-700",
  completed: "bg-emerald-50 text-emerald-600",
  failed: "bg-red-50 text-red-600",
  refunded: "bg-slate-100 text-slate-500",
};

export default function Payments() {
  const { user, token } = useAuth();
  const isExpert = user?.role === "expert";

  const [payments, setPayments] = useState([]);
  const [received, setReceived] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ amount: "", purpose: "expert_consultation" });
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    const requests = [api.getMyPayments(token)];
    if (isExpert) requests.push(api.getReceivedPayments(token));

    Promise.all(requests)
      .then(([mine, recv]) => {
        setPayments(mine);
        if (recv) setReceived(recv);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token, isExpert]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setNotice(null);
    try {
      const { payment, message } = await api.createPayment(
        { amount: Number(form.amount), purpose: form.purpose },
        token
      );
      setPayments((prev) => [payment, ...prev]);
      setShowForm(false);
      setForm({ amount: "", purpose: "expert_consultation" });
      if (message) setNotice(message);
    } catch (err) {
      setNotice(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <Seo title="Payments" description="Your CivilBridge payment history." path="/payments" />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-ink-900">Payments</h1>
          <p className="mt-1 text-slate-500">Your payment history on CivilBridge.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:bg-brand-600"
        >
          <Plus className="h-4 w-4" /> Make a Payment
        </button>
      </div>

      <div className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <strong>Note:</strong> no payment gateway is connected yet. Payments made here are
        recorded as "pending" and reconciled manually by an admin - no real charge happens.
        See the README for how to connect a real provider (Flutterwave is recommended for
        Rwanda: cards + MTN/Airtel Mobile Money).
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-6 rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <p className="font-bold text-ink-900">New Payment</p>
            <button type="button" onClick={() => setShowForm(false)} aria-label="Close" className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-ink-900">Amount (RWF)</label>
              <input
                required
                type="number"
                min="1"
                className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink-900">Purpose</label>
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                value={form.purpose}
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
              >
                {PURPOSES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            disabled={submitting}
            className="mt-4 flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition-[background-color,opacity] duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:bg-brand-600 disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Submitting…" : "Submit Payment"}
          </button>
        </form>
      )}

      {notice && <p className="mt-4 rounded-lg bg-slate-50 px-4 py-2 text-sm text-slate-600">{notice}</p>}

      {loading && (
        <div className="flex items-center justify-center py-24 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}
      {error && <p className="mt-8 text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="mt-8 space-y-10">
          <section>
            <h2 className="flex items-center gap-2 text-lg font-bold text-ink-900">
              <CreditCard className="h-5 w-5 text-brand-500" /> Payments Made
            </h2>
            <PaymentsTable payments={payments} emptyMessage="You haven't made any payments yet." />
          </section>

          {isExpert && (
            <section>
              <h2 className="flex items-center gap-2 text-lg font-bold text-ink-900">
                <CreditCard className="h-5 w-5 text-brand-500" /> Payments Received
              </h2>
              <PaymentsTable payments={received} emptyMessage="No payments received yet." showPayer />
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function PaymentsTable({ payments, emptyMessage, showPayer }) {
  if (!payments.length) {
    return <p className="mt-4 text-sm text-slate-500">{emptyMessage}</p>;
  }
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-500">
          <tr>
            {showPayer && <th className="px-4 py-3">From</th>}
            <th className="px-4 py-3">Purpose</th>
            <th className="px-4 py-3">Amount</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Date</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id} className="border-t border-slate-100">
              {showPayer && <td className="px-4 py-3 text-slate-500">{p.payer?.full_name || "—"}</td>}
              <td className="px-4 py-3 font-semibold capitalize text-ink-900">{p.purpose.replace(/_/g, " ")}</td>
              <td className="px-4 py-3 text-slate-600">
                {p.currency} {Number(p.amount).toLocaleString()}
              </td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[p.status]}`}>
                  {p.status}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-400">{new Date(p.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
