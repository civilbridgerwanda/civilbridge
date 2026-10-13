import { useCallback, useEffect, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import {
  Loader2,
  ArrowLeft,
  Clock,
  CheckCircle2,
  Download,
  FileText,
  DollarSign,
  FileCheck2,
  Cpu,
  ShieldCheck,
  Trophy,
  Ruler,
  MapPin,
  Timer,
  File as FileIcon,
  Pencil,
  Plus,
} from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { socket } from "../lib/socket";
import { trackEvent } from "../lib/analytics";
import { formatLocation } from "../lib/locations";
import Seo from "../components/Seo";
import EstimateResultsModal, { DELIVERABLE_KINDS } from "../components/EstimateResultsModal";

const KIND_LABEL = Object.fromEntries(DELIVERABLE_KINDS);
const DRAWING_KINDS = ["floor_plan", "elevation", "section", "roof_plan", "foundation_plan", "site_plan", "structural", "mep"];
const VISUAL_KINDS = ["render_2d", "render_3d"];
const CAD_FORMATS = ["dwg", "dxf", "ifc"];
const IMAGE_FORMATS = ["png", "jpg", "jpeg", "webp"];

const STATUS_PILL = {
  draft: "Being analysed",
  ai_generated: "Awaiting expert",
  under_review: "Expert reviewing",
  verified: "Verified",
};

export default function EstimateDetail() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const [estimate, setEstimate] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const load = useCallback(async () => {
    try {
      setEstimate(await api.getEstimate(id, token));
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    if (token) load();
  }, [token, load]);

  // Live updates - the analysis finishing, an expert verifying. The socket
  // events only say *that* something changed; the numbers themselves are
  // fetched (and gated by the server) so nothing sensitive rides the socket.
  useEffect(() => {
    const refresh = (payload) => {
      const matches = String(payload?.id ?? payload?.estimate_id) === String(id);
      if (matches) load();
    };
    socket.on("estimate:status_changed", refresh);
    socket.on("agent:job_updated", refresh);
    return () => {
      socket.off("estimate:status_changed", refresh);
      socket.off("agent:job_updated", refresh);
    };
  }, [id, load]);

  const isReviewer = user?.role === "admin" || user?.role === "expert";
  const verified = estimate?.status === "verified";
  const showResults = verified || (isReviewer && estimate?.items !== undefined);

  // Safety net if a socket message is missed (dropped connection, sleeping
  // laptop): re-check every 20s while results aren't in yet.
  useEffect(() => {
    if (!estimate || verified) return undefined;
    const timer = setInterval(load, 20000);
    return () => clearInterval(timer);
  }, [estimate, verified, load]);

  async function verify() {
    setVerifying(true);
    try {
      await api.updateEstimateStatus(id, "verified", token);
      await load();
    } catch (err) {
      alert(err.message);
    } finally {
      setVerifying(false);
    }
  }

  function downloadSummary() {
    if (!estimate) return;
    const lines = [
      "CivilBridge Cost Estimate",
      `Project: ${estimate.project_name}`,
      `Type: ${estimate.project_type || "-"}`,
      `Location: ${formatLocation(estimate) || "-"}`,
      `Status: ${estimate.status}`,
      `Generated: ${new Date(estimate.created_at).toLocaleDateString()}`,
      "",
      "Summary",
      "-------",
      estimate.analysis?.summary || estimate.description || "-",
      "",
      `Timeline: ${estimate.analysis?.timeline || "-"}`,
      "",
      "Bill of Quantities",
      "-------------------",
      ...(estimate.items?.length
        ? estimate.items.map(
            (item) =>
              `${item.item_name} - ${item.quantity} ${item.unit || ""} @ RWF ${Number(item.unit_price).toLocaleString()} = RWF ${Number(item.total_price).toLocaleString()}`
          )
        : ["No line items provided."]),
      "",
      `Total Estimated Cost: RWF ${Number(estimate.estimated_cost || 0).toLocaleString()}`,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `civilbridge-estimate-${estimate.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    trackEvent("estimate_document_downloaded", { estimate_id: estimate.id });
  }

  if (!token) {
    return <Navigate to="/sign-in" state={{ from: `/estimates/${id}` }} replace />;
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  if (error || !estimate) {
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        <p className="text-lg font-semibold text-ink-900">We couldn't find that estimate</p>
        <p className="mt-2 text-sm text-slate-500">{error || "It may have been removed."}</p>
        <Link to="/dashboard" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-500 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>
      </div>
    );
  }

  const backLink = user?.role === "expert" ? "/expert-dashboard" : "/dashboard";
  const location = formatLocation(estimate);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <Seo title={estimate.project_name} description="Your CivilBridge estimate results." path={`/estimates/${id}`} />

      <Link to={backLink} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-brand-500">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-extrabold text-ink-900">{estimate.project_name}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 text-slate-500">
            {estimate.project_type && <span className="capitalize">{estimate.project_type} project</span>}
            {location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {location}
              </span>
            )}
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${
            verified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
          }`}
        >
          {verified ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
          {STATUS_PILL[estimate.status] || estimate.status}
        </span>
      </div>

      {isReviewer && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
          <p className="text-sm text-indigo-900">
            <strong>Reviewer view.</strong> The client only sees the results once you verify them.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowEditor(true)}
              className="flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-white px-3 py-1.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
            >
              <Pencil className="h-3.5 w-3.5" /> Enter / edit results
            </button>
            {!verified && (
              <button
                type="button"
                onClick={verify}
                disabled={verifying}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {verifying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                Verify
              </button>
            )}
          </div>
        </div>
      )}

      {showEditor && (
        <EstimateResultsModal estimateId={id} onClose={() => setShowEditor(false)} onSaved={load} />
      )}

      {!verified && <ProgressPanel estimate={estimate} />}

      {showResults && (
        <Results estimate={estimate} verified={verified} onDownloadSummary={downloadSummary} />
      )}

      {!showResults && (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
          <span className="flex items-center gap-2">
            {estimate.attachment_url && <FileIcon className="h-4 w-4 text-brand-500" />}
            {estimate.attachment_url ? "Your plan is safely uploaded and being used for this estimate." : "Your request has been received."}
          </span>
          <Link to="/estimator" className="inline-flex items-center gap-1.5 font-semibold text-brand-500 hover:underline">
            <Plus className="h-4 w-4" /> Start another estimate
          </Link>
        </div>
      )}
    </div>
  );
}

// ---- progress view: shown until an expert verifies ------------------------

function stagesFor(estimate) {
  const analysed = ["ai_generated", "under_review", "verified"].includes(estimate.status);
  const verified = estimate.status === "verified";
  const job = estimate.job;

  let analysisNote = "Waiting in the queue";
  if (analysed) analysisNote = "Analysis complete";
  else if (job?.status === "running") analysisNote = job.stage || "Analysing your plan";
  else if (job?.status === "failed") analysisNote = "Our team is completing this by hand";
  else if (estimate.assigned) analysisNote = "An expert is preparing it";

  return [
    { key: "received", icon: FileCheck2, label: "Received", note: "Your plan is in", state: "done" },
    {
      key: "analysis",
      icon: Cpu,
      label: "Analysis",
      note: analysisNote,
      state: analysed ? "done" : "active",
    },
    {
      key: "verification",
      icon: ShieldCheck,
      label: "Expert verification",
      note: verified
        ? "Verified"
        : estimate.assigned
          ? "An expert has been assigned"
          : analysed
            ? "Our team is assigning an expert"
            : "Starts after the analysis",
      state: verified ? "done" : analysed ? "active" : "todo",
    },
    { key: "ready", icon: Trophy, label: "Results ready", note: verified ? "Ready" : "You'll be notified", state: verified ? "done" : "todo" },
  ];
}

function ProgressPanel({ estimate }) {
  const stages = stagesFor(estimate);
  const running = estimate.job?.status === "running" && estimate.status === "draft";
  const progress = running ? estimate.job.progress : null;

  return (
    <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6 sm:p-8">
      <div className="text-center">
        <Clock className="mx-auto h-8 w-8 text-amber-500" />
        <p className="mt-3 text-xl font-bold text-ink-900">We're working on your estimate</p>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">
          You don't need to wait on this page. We'll notify you here and by email the moment your results are ready, and
          they'll appear on this page automatically.
        </p>
      </div>

      <ol className="mt-8 grid gap-4 sm:grid-cols-4">
        {stages.map((stage, idx) => {
          const Icon = stage.icon;
          const done = stage.state === "done";
          const active = stage.state === "active";
          return (
            <li key={stage.key} className="relative flex items-start gap-3 sm:flex-col sm:items-center sm:text-center">
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 ${
                  done
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : active
                      ? "border-amber-500 bg-white text-amber-600"
                      : "border-slate-300 bg-white text-slate-400"
                }`}
              >
                {done ? <CheckCircle2 className="h-5 w-5" /> : active ? <Loader2 className="h-5 w-5 animate-spin" /> : <Icon className="h-5 w-5" />}
              </span>
              <div className="min-w-0">
                <p className={`text-sm font-bold ${done || active ? "text-ink-900" : "text-slate-400"}`}>
                  <span className="mr-1 text-xs font-semibold text-slate-400">{idx + 1}.</span>
                  {stage.label}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">{stage.note}</p>
              </div>
            </li>
          );
        })}
      </ol>

      {progress != null && (
        <div className="mx-auto mt-6 max-w-md">
          <div className="h-2 overflow-hidden rounded-full bg-amber-100">
            <div className="h-full rounded-full bg-amber-500 transition-[width] duration-500" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1 text-center text-xs text-slate-500">{progress}% analysed</p>
        </div>
      )}
    </div>
  );
}

// ---- results view: verified (or a reviewer looking) -----------------------

function Results({ estimate, verified, onDownloadSummary }) {
  const items = estimate.items || [];
  const files = estimate.deliverables || [];
  const drawings = files.filter((f) => DRAWING_KINDS.includes(f.kind));
  const visuals = files.filter((f) => VISUAL_KINDS.includes(f.kind));
  const documents = files.filter((f) => !DRAWING_KINDS.includes(f.kind) && !VISUAL_KINDS.includes(f.kind));
  const analysis = estimate.analysis || {};

  return (
    <>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard icon={DollarSign} tone="emerald" label="Total estimated cost">
          RWF {Number(estimate.estimated_cost || 0).toLocaleString()}
        </StatCard>
        <StatCard icon={FileText} tone="blue" label="Line items">
          {items.length}
        </StatCard>
        <StatCard icon={Timer} tone="violet" label="Timeline">
          {analysis.timeline || "-"}
        </StatCard>
      </div>

      {(analysis.summary || analysis.notes) && (
        <div className="mt-6 rounded-2xl border border-slate-200 p-6">
          <h2 className="font-bold text-ink-900">Summary</h2>
          {analysis.summary && <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{analysis.summary}</p>}
          {analysis.notes && <p className="mt-3 whitespace-pre-line text-sm text-slate-500">{analysis.notes}</p>}
        </div>
      )}

      <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-200">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3">Unit price</th>
              <th className="px-4 py-3">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.length ? (
              items.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-semibold text-ink-900">{item.item_name}</td>
                  <td className="px-4 py-3 text-slate-500">{item.quantity}</td>
                  <td className="px-4 py-3 text-slate-500">{item.unit}</td>
                  <td className="px-4 py-3 text-slate-500">RWF {Number(item.unit_price).toLocaleString()}</td>
                  <td className="px-4 py-3 font-semibold text-ink-900">RWF {Number(item.total_price).toLocaleString()}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  No line items were entered yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {files.length > 0 && (
        <section className="mt-10">
          <h2 className="flex items-center gap-2 text-xl font-bold text-ink-900">
            <Ruler className="h-5 w-5 text-brand-500" /> Drawings &amp; files
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            DWG and DXF files open in AutoCAD and ArchiCAD; IFC files import into ArchiCAD, Revit and other BIM tools.
          </p>

          {drawings.length > 0 && <FileGroup title="Drawing set" files={drawings} />}
          {visuals.length > 0 && <VisualGrid files={visuals} />}
          {documents.length > 0 && <FileGroup title="Documents" files={documents} />}
        </section>
      )}

      {verified ? (
        <button
          onClick={onDownloadSummary}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 py-3 font-semibold text-white transition-[background-color,transform,box-shadow] duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-md active:translate-y-0"
        >
          <Download className="h-4 w-4" /> Download summary
        </button>
      ) : (
        <p className="mt-8 text-center text-sm text-slate-400">The client's download unlocks once this estimate is verified.</p>
      )}
    </>
  );
}

const TONES = {
  emerald: "bg-emerald-100 text-emerald-600",
  blue: "bg-blue-100 text-blue-600",
  violet: "bg-violet-100 text-violet-600",
};

function StatCard({ icon: Icon, tone, label, children }) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 p-6">
      <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${TONES[tone]}`}>
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-3 text-sm text-slate-500">{label}</p>
      <p className="mt-1 truncate text-2xl font-extrabold text-ink-900">{children}</p>
    </div>
  );
}

function FormatBadge({ format }) {
  if (!format) return null;
  const cad = CAD_FORMATS.includes(format);
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
        cad ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"
      }`}
    >
      {format}
    </span>
  );
}

function FileGroup({ title, files }) {
  return (
    <div className="mt-5">
      <h3 className="text-sm font-bold text-slate-500">{title}</h3>
      <ul className="mt-2 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
        {files.map((f) => (
          <li key={f.id} className="flex items-center justify-between gap-3 bg-white px-4 py-3">
            <span className="flex min-w-0 items-center gap-3">
              <FileIcon className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-ink-900">{f.label}</span>
                <span className="text-xs text-slate-400">{KIND_LABEL[f.kind] || f.kind}</span>
              </span>
              <FormatBadge format={f.format} />
            </span>
            <a
              href={f.url}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Download className="h-3.5 w-3.5" /> Download
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function VisualGrid({ files }) {
  return (
    <div className="mt-5">
      <h3 className="text-sm font-bold text-slate-500">Visuals</h3>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        {files.map((f) => {
          const isImage = IMAGE_FORMATS.includes(f.format);
          return (
            <a
              key={f.id}
              href={f.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block overflow-hidden rounded-xl border border-slate-200 bg-white"
            >
              {isImage ? (
                <img src={f.url} alt={f.label} loading="lazy" className="aspect-video w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
              ) : (
                <div className="flex aspect-video items-center justify-center bg-slate-50 text-slate-400">
                  <FileIcon className="h-8 w-8" />
                </div>
              )}
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <span className="truncate text-sm font-semibold text-ink-900">{f.label}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-slate-400">{KIND_LABEL[f.kind] || f.kind}</span>
                  <FormatBadge format={f.format} />
                </span>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
