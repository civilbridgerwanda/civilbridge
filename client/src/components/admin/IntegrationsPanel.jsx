import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, Send, KeyRound, CheckCircle2, PauseCircle, CircleOff, AlertTriangle } from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";

// Read-only view of what's wired up. Keys and endpoints are never shown here
// (or anywhere in the browser) - they live in server/.env and this panel only
// receives booleans and variable NAMES. Switching an integration on is an
// environment change on the server, by design.
const STATE = {
  active: { label: "Active", icon: CheckCircle2, style: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  idle: { label: "Idle - keys stored, switch off", icon: PauseCircle, style: "bg-amber-50 text-amber-700 border-amber-200" },
  off: { label: "Not configured", icon: CircleOff, style: "bg-slate-100 text-slate-600 border-slate-200" },
  misconfigured: { label: "Needs attention", icon: AlertTriangle, style: "bg-red-50 text-red-700 border-red-200" },
};

export default function IntegrationsPanel() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    try {
      setData(await api.adminIntegrations(token));
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  async function sendQueued() {
    setSending(true);
    setNotice(null);
    try {
      const result = await api.adminDispatchQueued(token);
      setNotice(`Sent ${result.sent} job${result.sent === 1 ? "" : "s"}. ${result.waiting} still waiting.`);
      await load();
    } catch (err) {
      setNotice(err.message);
    } finally {
      setSending(false);
    }
  }

  if (error) return <p className="text-sm text-red-600">Couldn't load integrations: {error}</p>;
  if (!data) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const agent = data.integrations.find((i) => i.key === "agent");
  const { jobs } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-bold text-ink-900">Integrations</p>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            API keys and endpoints are kept in the server's environment (<code className="rounded bg-slate-100 px-1">server/.env</code>) and are
            never shown here. Each integration stays idle until its switch is turned on - see{" "}
            <code className="rounded bg-slate-100 px-1">docs/N8N_AGENT_INTEGRATION.md</code>.
          </p>
        </div>
        <button type="button" onClick={load} className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {data.integrations.map((integration) => {
          const s = STATE[integration.state] || STATE.off;
          const Icon = s.icon;
          return (
            <div key={integration.key} className="rounded-2xl border border-slate-200 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-ink-900">{integration.label}</p>
                  <p className="text-xs text-slate-400">Provider: {integration.provider}</p>
                </div>
                <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${s.style}`}>
                  <Icon className="h-3.5 w-3.5" /> {s.label}
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-600">{integration.detail}</p>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
                <KeyRound className="h-3.5 w-3.5" /> On-switch: <code className="rounded bg-slate-100 px-1">{integration.switch}</code>
              </p>
              {integration.missing.length > 0 && (
                <p className="mt-2 text-xs text-red-600">
                  Missing: {integration.missing.map((name) => (
                    <code key={name} className="mr-1 rounded bg-red-50 px-1">{name}</code>
                  ))}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-slate-200 p-5">
        <p className="font-bold text-ink-900">Agent queue</p>
        <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            ["Waiting", jobs.queued],
            ["Running", jobs.running],
            ["Completed (24h)", jobs.completed_24h],
            ["Failed (24h)", jobs.failed_24h],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-2xl font-extrabold text-ink-900">{value}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-slate-500">
          While the agent is off, estimate requests wait here and appear in the expert queue, where an expert can enter the results by hand.
          Once it's switched on, waiting jobs are sent automatically within a minute - or press the button to send them right now.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={sendQueued}
            disabled={sending || agent?.state !== "active" || jobs.queued === 0}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send waiting jobs now
          </button>
          {notice && <span className="text-sm text-slate-500">{notice}</span>}
        </div>
      </div>
    </div>
  );
}
