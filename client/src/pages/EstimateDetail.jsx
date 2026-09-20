import { useEffect, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import {
  Loader2,
  ArrowLeft,
  Clock,
  CheckCircle2,
  Download,
  FileText,
  DollarSign,
} from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { socket } from "../lib/socket";
import { trackEvent } from "../lib/analytics";
import Seo from "../components/Seo";

const statusCopy = {
  draft: "Your estimate has been received and is queued for review.",
  ai_generated: "Our AI has produced an initial estimate. An expert is reviewing it now.",
  under_review: "An expert is currently reviewing your estimate.",
  verified: "Verified by an expert.",
};

export default function EstimateDetail() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const [estimate, setEstimate] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    api
      .getEstimate(id, token)
      .then((data) => {
        if (!cancelled) setEstimate(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, token]);

  // Live status updates - if a reviewer approves it while the client is
  // sitting on this page, the breakdown should appear without a refresh.
  useEffect(() => {
    function handleStatusChange(updated) {
      if (String(updated.id) === String(id)) {
        setEstimate((prev) => (prev ? { ...prev, ...updated } : prev));
      }
    }
    socket.on("estimate:status_changed", handleStatusChange);
    return () => socket.off("estimate:status_changed", handleStatusChange);
  }, [id]);

  function downloadDocument() {
    if (!estimate) return;
    const lines = [
      `CivilBridge Cost Estimate`,
      `Project: ${estimate.project_name}`,
      `Type: ${estimate.project_type || "-"}`,
      `Status: ${estimate.status}`,
      `Generated: ${new Date(estimate.created_at).toLocaleDateString()}`,
      ``,
      `Description`,
      `-----------`,
      estimate.description || "-",
      ``,
      `Bill of Quantities`,
      `-------------------`,
      ...(estimate.items?.length
        ? estimate.items.map(
            (item) =>
              `${item.item_name} — ${item.quantity} ${item.unit} @ RWF ${Number(item.unit_price).toLocaleString()} = RWF ${Number(item.total_price).toLocaleString()}`
          )
        : ["No line items provided."]),
      ``,
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

  const isVerified = estimate.status === "verified";
  const isReviewer = user?.role === "admin" || user?.role === "expert";
  // Reviewers need the breakdown to actually do the review, so the
  // verified-only gate below applies to the client's own view only.
  const canSeeBreakdown = isVerified || isReviewer;
  const backLink = user?.role === "expert" ? "/expert-dashboard" : "/dashboard";

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Seo title={estimate.project_name} description="Your CivilBridge construction cost estimate." path={`/estimates/${id}`} />

      <Link to={backLink} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-brand-500">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-ink-900">{estimate.project_name}</h1>
          <p className="mt-1 capitalize text-slate-500">{estimate.project_type} project</p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${
            isVerified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
          }`}
        >
          {isVerified ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
          {estimate.status.replace("_", " ")}
        </span>
      </div>

      {!canSeeBreakdown ? (
        // Gated: the client only sees the generated breakdown once a
        // professional has reviewed and approved it - until then, just a
        // status explanation, no numbers or download.
        <div className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
          <Clock className="mx-auto h-8 w-8 text-amber-500" />
          <p className="mt-4 text-lg font-semibold text-ink-900">Awaiting expert review</p>
          <p className="mt-2 text-sm text-slate-600">
            {statusCopy[estimate.status] || statusCopy.draft} You'll be notified the moment it's approved, and the
            full breakdown will unlock here automatically.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                <DollarSign className="h-5 w-5" />
              </span>
              <p className="mt-3 text-sm text-slate-500">Total Estimated Cost</p>
              <p className="mt-1 text-2xl font-extrabold text-ink-900">
                RWF {Number(estimate.estimated_cost || 0).toLocaleString()}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                <FileText className="h-5 w-5" />
              </span>
              <p className="mt-3 text-sm text-slate-500">Line Items</p>
              <p className="mt-1 text-2xl font-extrabold text-ink-900">{estimate.items?.length || 0}</p>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200 p-6">
            <h2 className="font-bold text-ink-900">Description</h2>
            <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{estimate.description || "-"}</p>
          </div>

          <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Qty</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3">Unit Price</th>
                  <th className="px-4 py-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {estimate.items?.length ? (
                  estimate.items.map((item) => (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-semibold text-ink-900">{item.item_name}</td>
                      <td className="px-4 py-3 text-slate-500">{item.quantity}</td>
                      <td className="px-4 py-3 text-slate-500">{item.unit}</td>
                      <td className="px-4 py-3 text-slate-500">RWF {Number(item.unit_price).toLocaleString()}</td>
                      <td className="px-4 py-3 font-semibold text-ink-900">
                        RWF {Number(item.total_price).toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                      No line items were provided for this estimate.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {isVerified ? (
            <button
              onClick={downloadDocument}
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 py-3 font-semibold text-white transition-[background-color,transform,box-shadow] duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-md active:translate-y-0"
            >
              <Download className="h-4 w-4" /> Download Document
            </button>
          ) : (
            <p className="mt-8 text-center text-sm text-slate-400">
              The downloadable document unlocks once this estimate is verified.
            </p>
          )}
        </>
      )}
    </div>
  );
}
