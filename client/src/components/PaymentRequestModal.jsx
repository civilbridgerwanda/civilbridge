import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, CheckCircle2, Smartphone, Landmark, CreditCard } from "lucide-react";
import Modal from "./Modal";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { PAYMENT_METHODS } from "../lib/paymentMethods";

const METHOD_ICONS = { mobile_money: Smartphone, bank_transfer: Landmark, card: CreditCard };

// One payment flow for everything that costs money - subscriptions and
// per-plan downloads alike - so the experience, the receipt, and what
// happens afterwards are identical everywhere.
//
// `payload` is what identifies the purchase ({ purpose: "plan_upgrade",
// target_plan, billing_period } or { purpose: "plan_license", reference_id,
// include_estimate }). The amount shown here is informational; the server
// prices the purchase itself and returns the amount it actually recorded.
export default function PaymentRequestModal({ title, summary, amount, currency = "RWF", payload, onClose, onSubmitted }) {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [method, setMethod] = useState(null);
  const [reference, setReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [payment, setPayment] = useState(null);

  const selected = PAYMENT_METHODS.find((m) => m.value === method);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!token) {
      navigate("/sign-in", { state: { from: window.location.pathname } });
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.createPayment(
        { ...payload, payment_method: method, provider_reference: reference.trim() || undefined },
        token
      );
      setPayment(result.payment);
      onSubmitted?.(result.payment);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (payment) {
    return (
      <Modal title="Payment request received" onClose={onClose}>
        <div className="py-2 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
            <CheckCircle2 className="h-6 w-6" />
          </span>
          <p className="mt-4 font-semibold text-ink-900">
            {payment.currency} {Number(payment.amount).toLocaleString()} for {payment.notes}
          </p>
          <ol className="mt-4 space-y-2 text-left text-sm text-slate-600">
            <li>
              <strong>1.</strong> {selected?.details
                ? "Send the payment using the details you were shown."
                : "Our team will message you the payment details right away."}
            </li>
            <li><strong>2.</strong> We confirm the money has arrived.</li>
            <li><strong>3.</strong> Your access unlocks <strong>automatically</strong> - no need to contact us again.</li>
          </ol>
          <p className="mt-4 text-xs text-slate-400">We've emailed you a receipt. Track it any time under Payments.</p>
          <button
            type="button"
            onClick={onClose}
            className="mt-6 w-full rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
          >
            Done
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={title} onClose={onClose}>
      <div className="rounded-xl bg-slate-50 p-4">
        <p className="text-sm text-slate-600">{summary}</p>
        <p className="mt-1 text-2xl font-extrabold text-ink-900">
          {currency} {Number(amount).toLocaleString()}
        </p>
      </div>

      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <p className="text-sm font-semibold text-ink-900">How will you pay?</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {PAYMENT_METHODS.map((m) => {
              const Icon = METHOD_ICONS[m.value];
              const active = method === m.value;
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMethod(m.value)}
                  className={`flex flex-col items-center gap-1 rounded-xl border-2 px-2 py-3 text-center transition-colors ${
                    active ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${active ? "text-brand-500" : "text-slate-400"}`} />
                  <span className="text-xs font-semibold text-ink-900">{m.label}</span>
                  <span className="text-[10px] text-slate-400">{m.hint}</span>
                </button>
              );
            })}
          </div>
        </div>

        {selected && (
          <div className="rounded-lg border border-slate-200 p-3 text-sm text-slate-600">
            {selected.details ? (
              <p className="whitespace-pre-line">{selected.details}</p>
            ) : (
              <p>Submit this request and our team will send you the {selected.label.toLowerCase()} details straight away.</p>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-ink-900">
            Transaction reference <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
            placeholder="MoMo transaction ID, bank slip number..."
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            maxLength={120}
          />
          <p className="mt-1 text-xs text-slate-400">Already paid? Add the reference so we can confirm faster.</p>
        </div>

        <button
          disabled={!method || submitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? "Submitting…" : "Submit payment request"}
        </button>
      </form>
    </Modal>
  );
}
