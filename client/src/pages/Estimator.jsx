import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Upload,
  MessageSquare,
  FileText,
  DollarSign,
  Clock,
  Ruler,
  File as FileIcon,
  X,
  Sparkles,
  MapPin,
  Lock,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { api } from "../lib/api";
import { trackEvent } from "../lib/analytics";
import { fadeUp, stagger } from "../lib/motion";
import Seo from "../components/Seo";
import LocationSelect from "../components/LocationSelect";
import { useAuth } from "../lib/AuthContext";
import { rwf } from "../lib/usePricing";
import PaymentRequestModal from "../components/PaymentRequestModal";
import EstimatePurchasePanel from "../components/EstimatePurchasePanel";

// The Estimator only works from a real file. Formats are checked here for a
// fast answer and again on the server (which also inspects the file's
// contents, so a renamed file can't get through).
const ACCEPTED_FORMATS = {
  ".pdf": "PDF",
  ".dwg": "AutoCAD (DWG)",
  ".dxf": "CAD exchange (DXF)",
  ".pln": "ArchiCAD (PLN)",
  ".ifc": "BIM (IFC)",
  ".zip": "ZIP of plan sheets",
};
const ACCEPT_ATTR = Object.keys(ACCEPTED_FORMATS).join(",");
const MAX_BYTES = 50 * 1024 * 1024;

function checkFile(file) {
  const ext = `.${file.name.split(".").pop().toLowerCase()}`;
  if (!ACCEPTED_FORMATS[ext]) {
    return `"${file.name}" isn't a supported format. Please upload a ${Object.values(ACCEPTED_FORMATS).join(", ")}.`;
  }
  if (file.size > MAX_BYTES) return "That file is larger than 50 MB. Try zipping fewer sheets together.";
  if (file.size === 0) return "That file is empty.";
  return null;
}

const formatSize = (bytes) => (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
const baseName = (name) => name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();

const whatYouGet = [
  {
    icon: FileText,
    iconBg: "bg-emerald-100 text-emerald-600",
    title: "Bill of Quantities",
    body: "Detailed breakdown of all materials and quantities needed",
  },
  {
    icon: DollarSign,
    iconBg: "bg-emerald-100 text-emerald-600",
    title: "Cost Breakdown",
    body: "Materials, labor, and total costs for your district",
  },
  {
    icon: Clock,
    iconBg: "bg-blue-100 text-blue-600",
    title: "Timeline Estimate",
    body: "Projected construction phases and completion timeframe",
  },
];

const drawingsTile = {
  icon: Ruler,
  iconBg: "bg-violet-100 text-violet-600",
  title: "CAD-ready Drawings",
  body: "Floor plans, sections, roof and foundation - open them in AutoCAD or ArchiCAD",
};

const EMPTY_FORM = {
  project_name: "",
  project_type: "",
  district: "",
  sector: "",
  budget_range: "",
  land_size: "",
  upi: "",
  description: "",
};

export default function Estimator() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  // The gate: nothing below the upload area works until this is "done".
  const [upload, setUpload] = useState({ status: "idle", file: null, url: null, error: null });
  const [dragging, setDragging] = useState(false);
  const [nudge, setNudge] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  // What the account may do right now (monthly allowance, purchased credits,
  // prices) - straight from the server, which is what actually enforces it.
  const [allowance, setAllowance] = useState(null);
  const [wantDrawings, setWantDrawings] = useState(false);
  const [buying, setBuying] = useState(null); // { purpose, estimate_option?, title, summary, amount }
  const [paymentPending, setPaymentPending] = useState(false);
  const [drawingsEnabled, setDrawingsEnabled] = useState(false);
  const uploadRef = useRef(null);
  const detailsRef = useRef(null);
  const fileInputRef = useRef(null);

  const unlocked = upload.status === "done";

  const loadAllowance = useCallback(() => {
    if (!token) return;
    api
      .me(token)
      .then((me) => setAllowance(me.allowance))
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    loadAllowance();
    // A purchase being confirmed (the team marks the payment completed) adds
    // credits - the account refresh in AuthContext fires this event, so the
    // submit button comes back on its own without a reload.
    const onChange = () => {
      setPaymentPending(false);
      loadAllowance();
    };
    window.addEventListener("civilbridge:entitlements-changed", onChange);
    return () => window.removeEventListener("civilbridge:entitlements-changed", onChange);
  }, [loadAllowance]);

  const isAdmin = user?.role === "admin";
  const prices = allowance?.prices;
  // Can the estimate itself be covered - by the free allowance, a purchased
  // credit, or an unlimited plan? (Unknown yet = don't block; the server decides.)
  const coversEstimate = !allowance || allowance.unlimited || allowance.remaining > 0 || allowance.paid_credits > 0;
  const needsDrawingsPayment = wantDrawings && !isAdmin && allowance && allowance.drawing_credits < 1;

  function openPurchase(option) {
    if (!prices) return;
    setBuying(
      option === "drawings_addon"
        ? { purpose: "drawings_addon", title: "CAD drawing set", summary: "Floor plans, sections, roof and foundation drawings for AutoCAD and ArchiCAD - added to your estimate", amount: prices.drawings_addon }
        : {
            purpose: "estimate_purchase",
            estimate_option: option,
            title: option === "estimate_drawings" ? "Estimate + CAD drawings" : "Cost estimate",
            summary:
              option === "estimate_drawings"
                ? "An expert-verified cost estimate plus the CAD drawing set"
                : "An expert-verified cost estimate for your plan",
            amount: option === "estimate_drawings" ? prices.estimate_with_drawings : prices.estimate,
          }
    );
  }

  useEffect(() => {
    api
      .getPublicStats()
      .then((s) => setDrawingsEnabled(Boolean(s.drawings_enabled)))
      .catch(() => {});
  }, []);

  function needSignIn() {
    navigate("/sign-in", { state: { from: "/estimator" } });
  }

  async function handleFile(file) {
    if (!file) return;
    if (!token) return needSignIn();
    const problem = checkFile(file);
    if (problem) {
      setUpload({ status: "error", file: null, url: null, error: problem });
      return;
    }
    setUpload({ status: "uploading", file, url: null, error: null });
    setSubmitError(null);
    try {
      const stored = await api.uploadPlan(file, token);
      setUpload({ status: "done", file, url: stored.url, error: null });
      // Suggest a project name from the file, but never overwrite one they typed.
      setForm((f) => (f.project_name ? f : { ...f, project_name: baseName(file.name).slice(0, 80) }));
      trackEvent("estimator_file_uploaded", { ext: file.name.split(".").pop().toLowerCase() });
      // Bring the newly-unlocked details into view.
      setTimeout(() => detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 150);
    } catch (err) {
      setUpload({ status: "error", file: null, url: null, error: err.message });
    }
  }

  function clearFile() {
    setUpload({ status: "idle", file: null, url: null, error: null });
  }

  function onPick(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    handleFile(file);
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  }

  // Clicking the locked "Describe" step points back at the thing that
  // unlocks it instead of doing nothing.
  function pokeLockedStep() {
    setNudge(true);
    uploadRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => setNudge(false), 1200);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!unlocked) return pokeLockedStep();
    if (!token) return needSignIn();
    setSubmitting(true);
    setSubmitError(null);
    try {
      // Readable summary for the human reviewers; the structured values also
      // travel separately (details) for the analysis engine.
      const lines = [
        form.description.trim(),
        form.budget_range && `Budget: RWF ${Number(form.budget_range).toLocaleString()}`,
        form.land_size && `Land size: ${form.land_size} sqm`,
        form.upi.trim() && `UPI (land plot number): ${form.upi.trim()}`,
      ].filter(Boolean);

      const created = await api.createEstimate(
        {
          project_name: form.project_name.trim(),
          project_type: form.project_type,
          description: lines.join("\n"),
          attachment_url: upload.url,
          district: form.district,
          sector: form.sector,
          drawings: wantDrawings || undefined, // the paid CAD add-on
          details: {
            budget_rwf: form.budget_range || undefined,
            land_size_sqm: form.land_size || undefined,
            upi: form.upi.trim() || undefined,
          },
        },
        token
      );
      trackEvent("estimate_submitted", { project_type: form.project_type });
      // The Results Dashboard: shows progress while it's being worked on, and
      // the actual breakdown once an expert has verified it.
      navigate(`/estimates/${created.id}`);
    } catch (err) {
      if (err.status === 401) return needSignIn();
      if (err.code === "OUT_OF_ESTIMATES" || err.code === "NEEDS_DRAWINGS_CREDIT") {
        // Somebody's balance changed under us (another tab, a refund): re-read
        // it, and the page swaps to the right purchase option by itself.
        loadAllowance();
        setSubmitError(err.message);
      } else if (err.code === "FILE_REQUIRED") {
        clearFile();
        setSubmitError(err.message);
      } else {
        setSubmitError(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const tiles = drawingsEnabled ? [...whatYouGet, drawingsTile] : whatYouGet;

  return (
    <>
      <Seo
        title="Cost Estimator"
        description="Upload your building plan and get an AI-analysed, expert-verified construction cost estimate for your building project in Rwanda."
        path="/estimator"
      />

      {/* Hero */}
      <section className="bg-gradient-to-r from-ink-900 to-brand-700 py-16 text-center text-white">
        <div className="mx-auto max-w-3xl px-6">
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl font-extrabold md:text-5xl"
          >
            Smart Construction Cost Estimator
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-4 text-brand-100"
          >
            Upload your plan and get accurate, Rwanda-specific cost estimates - analysed by our engine and verified by
            expert engineers.
          </motion.p>
          {allowance && (
            <p className="mt-4 inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-full bg-white/10 px-4 py-1.5 text-sm">
              {allowance.unlimited ? (
                <span>Unlimited estimates{allowance.priority && " · priority review"}</span>
              ) : (
                <span>
                  {allowance.remaining} of {allowance.monthly_limit} free estimate{allowance.monthly_limit === 1 ? "" : "s"} left this month
                </span>
              )}
              {allowance.paid_credits > 0 && <span>· {allowance.paid_credits} purchased</span>}
              {allowance.drawing_credits > 0 && <span>· {allowance.drawing_credits} drawing set{allowance.drawing_credits === 1 ? "" : "s"}</span>}
            </p>
          )}
        </div>
      </section>

      {/* Two steps, side by side. Step 1 (upload) is always open; step 2
          (project details + submit) stays locked until a file has actually
          been uploaded. Everything they unlock appears directly underneath. */}
      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-extrabold text-ink-900">Start with your plan</h2>
          <p className="mt-2 text-slate-500">Upload a file to unlock the estimator</p>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            variants={stagger}
            className="mt-10 grid gap-6 text-left sm:grid-cols-2"
          >
            <StepCard
              icon={Upload}
              step="Step 1"
              title="Upload Existing Plan"
              body="Upload your architectural plan (PDF, DWG, DXF, PLN, IFC or a ZIP of sheets). Our engine analyses it and an expert verifies the result."
              state={unlocked ? "done" : "active"}
              onClick={() => uploadRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
            />
            <StepCard
              icon={MessageSquare}
              step="Step 2"
              title="Describe Your Project"
              body="Tell us where you're building and what matters - budget, land size, notes. Unlocks as soon as your plan is uploaded."
              state={unlocked ? "active" : "locked"}
              onClick={unlocked ? () => detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }) : pokeLockedStep}
            />
          </motion.div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-6 text-left">
            {/* --- Upload area (the gate) --- */}
            <div ref={uploadRef} className="rounded-2xl border border-slate-200 bg-white p-8">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-bold text-ink-900">Upload Your Plan</h3>
                {unlocked && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Uploaded
                  </span>
                )}
              </div>

              {upload.status === "done" ? (
                <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <span className="flex min-w-0 items-center gap-3">
                    <FileIcon className="h-5 w-5 shrink-0 text-emerald-600" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-ink-900">{upload.file.name}</span>
                      <span className="text-xs text-slate-500">{formatSize(upload.file.size)}</span>
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={clearFile}
                    className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-white hover:text-red-600"
                  >
                    <X className="h-3.5 w-3.5" /> Replace
                  </button>
                </div>
              ) : (
                <>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={onDrop}
                    className={`mt-4 rounded-xl border-2 border-dashed px-4 py-12 text-center transition-colors duration-200 ${
                      dragging
                        ? "border-brand-500 bg-brand-50"
                        : nudge
                          ? "animate-pulse border-amber-400 bg-amber-50"
                          : "border-slate-300 hover:border-brand-400 hover:bg-brand-50"
                    }`}
                  >
                    {upload.status === "uploading" ? (
                      <div className="flex flex-col items-center gap-2 text-slate-600">
                        <Loader2 className="h-7 w-7 animate-spin text-brand-500" />
                        <p className="text-sm font-semibold">Uploading {upload.file?.name}…</p>
                        <p className="text-xs text-slate-400">Checking the file as it arrives</p>
                      </div>
                    ) : token ? (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex w-full flex-col items-center gap-2"
                      >
                        <Upload className="h-8 w-8 text-slate-400" />
                        <span className="text-base font-semibold text-slate-700">Drop your plan here, or click to browse</span>
                        <span className="text-xs text-slate-400">
                          PDF, AutoCAD (.dwg / .dxf), ArchiCAD (.pln), BIM (.ifc) or a .zip of sheets - up to 50 MB
                        </span>
                      </button>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <Lock className="h-7 w-7 text-slate-400" />
                        <p className="text-base font-semibold text-slate-700">Sign in to upload your plan</p>
                        <p className="max-w-sm text-xs text-slate-400">
                          An account keeps your files private and lets us tell you when your estimate is ready.
                        </p>
                        <button
                          type="button"
                          onClick={needSignIn}
                          className="rounded-lg bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600"
                        >
                          Sign in to continue
                        </button>
                      </div>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept={ACCEPT_ATTR} className="hidden" onChange={onPick} />
                </>
              )}

              {upload.error && (
                <p className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {upload.error}
                </p>
              )}
            </div>

            {/* --- Project details + submit: locked until the upload is done --- */}
            <div ref={detailsRef} className="relative">
              <fieldset
                disabled={!unlocked || submitting}
                className={`rounded-2xl border bg-white p-8 transition-[opacity,border-color] duration-300 ${
                  unlocked ? "border-slate-200" : "border-slate-200 opacity-50"
                }`}
              >
                <h3 className="text-lg font-bold text-ink-900">Describe Your Project</h3>

                <div className="mt-4 grid gap-5 sm:grid-cols-2">
                  <div className="min-w-0">
                    <label className="block text-sm font-semibold text-ink-900">Project name</label>
                    <input
                      required
                      maxLength={200}
                      placeholder="e.g. Kimironko family house"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50"
                      value={form.project_name}
                      onChange={(e) => setForm({ ...form, project_name: e.target.value })}
                    />
                  </div>
                  <div className="min-w-0">
                    <label className="block text-sm font-semibold text-ink-900">Project type</label>
                    <select
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50"
                      value={form.project_type}
                      onChange={(e) => setForm({ ...form, project_type: e.target.value })}
                    >
                      <option value="">Select type…</option>
                      <option value="house">House</option>
                      <option value="apartment">Apartment</option>
                      <option value="commercial">Commercial</option>
                      <option value="land">Land</option>
                      <option value="renovation">Renovation</option>
                    </select>
                  </div>
                </div>

                <LocationSelect
                  className="mt-5"
                  required
                  district={form.district}
                  sector={form.sector}
                  onChange={(loc) => setForm({ ...form, ...loc })}
                />

                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <div className="min-w-0">
                    <label className="block text-sm font-semibold text-ink-900">Budget (RWF) <span className="font-normal text-slate-400">- optional</span></label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 50000000"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50"
                      value={form.budget_range}
                      onChange={(e) => setForm({ ...form, budget_range: e.target.value })}
                    />
                  </div>
                  <div className="min-w-0">
                    <label className="block text-sm font-semibold text-ink-900">Land size (sqm) <span className="font-normal text-slate-400">- optional</span></label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 500"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50"
                      value={form.land_size}
                      onChange={(e) => setForm({ ...form, land_size: e.target.value })}
                    />
                  </div>
                </div>

                <div className="mt-5">
                  <label className="block text-sm font-semibold text-ink-900">Notes for the engineers <span className="font-normal text-slate-400">- optional</span></label>
                  <textarea
                    rows={3}
                    maxLength={2000}
                    placeholder="Anything the plan doesn't show: finishes you want, site conditions, phases…"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>

                <div className="mt-5 rounded-xl border border-brand-100 bg-brand-50 p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-white">
                      <MapPin className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="font-semibold text-ink-900">Have a Land Plot Number (UPI)?</p>
                      <p className="text-sm text-slate-600">It helps our engineers check the plot's details</p>
                    </div>
                  </div>
                  <input
                    placeholder="e.g. 1/02/03/04/567"
                    className="mt-4 w-full rounded-lg border border-brand-200 bg-white px-3 py-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50"
                    value={form.upi}
                    onChange={(e) => setForm({ ...form, upi: e.target.value })}
                  />
                </div>

                {submitError && (
                  <p className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    {submitError}
                  </p>
                )}

                {/* Optional paid extra: the CAD drawing set. It's an add-on to ANY
                    estimate - free, bought, or included in a subscription. */}
                {prices && (
                  <label
                    className={`mt-5 flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                      wantDrawings ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={wantDrawings}
                      onChange={(e) => setWantDrawings(e.target.checked)}
                      className="mt-1 h-4 w-4 accent-brand-500"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2 font-semibold text-ink-900">
                        <Ruler className="h-4 w-4 text-brand-500" /> Add CAD-ready drawings
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
                          {isAdmin || allowance?.drawing_credits > 0 ? "Included - you have one ready" : `+ ${rwf(prices.drawings_addon)}`}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-sm text-slate-500">
                        Floor plans, sections, roof and foundation drawings you can open in AutoCAD or ArchiCAD.
                      </span>
                    </span>
                  </label>
                )}

                {!coversEstimate ? (
                  <EstimatePurchasePanel
                    prices={prices}
                    resetsAt={allowance?.resets_at}
                    onBuy={openPurchase}
                    pending={paymentPending}
                  />
                ) : needsDrawingsPayment ? (
                  <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 text-center">
                    <p className="font-semibold text-ink-900">Pay for the drawing set to continue</p>
                    <p className="mt-1 text-sm text-slate-600">
                      The CAD drawing set is a {rwf(prices.drawings_addon)} add-on. Once we confirm your payment you can
                      submit right here - or untick it to submit the estimate on its own.
                    </p>
                    {paymentPending && <p className="mt-2 text-sm text-slate-500">Payment received - confirming it now.</p>}
                    <button
                      type="button"
                      onClick={() => openPurchase("drawings_addon")}
                      className="mt-4 rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
                    >
                      Pay {rwf(prices.drawings_addon)}
                    </button>
                  </div>
                ) : (
                  <button
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 py-3 font-semibold text-white transition-[background-color,opacity,transform,box-shadow] duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-md active:translate-y-0 disabled:translate-y-0 disabled:opacity-60 disabled:hover:shadow-none"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {submitting ? "Submitting…" : "Start analysis"}
                  </button>
                )}
              </fieldset>

              {/* Explains the lock instead of leaving a dead-looking form. It's
                  a plain conditional (no exit animation) on purpose: the moment
                  the upload succeeds it must be gone, never left fading out
                  over the fields it just unlocked. */}
              {!unlocked && (
                <button
                  type="button"
                  onClick={pokeLockedStep}
                  className="absolute inset-0 flex items-center justify-center rounded-2xl"
                  aria-label="Upload a plan to unlock these fields"
                >
                  <span className="flex items-center gap-2 rounded-full bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white shadow-lg">
                    <Lock className="h-4 w-4" /> Upload your plan above to unlock
                  </span>
                </button>
              )}
            </div>
          </form>
        </div>
      </section>

      {/* What you'll get - a permanent fixture outside/below the cards and
          the panel, always visible regardless of progress. */}
      <section className="py-16">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <h2 className="text-3xl font-extrabold text-ink-900">What You'll Get</h2>
          <p className="mt-2 text-slate-500">Comprehensive cost intelligence for informed decisions</p>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            variants={stagger}
            className={`mt-12 grid gap-10 sm:grid-cols-2 ${tiles.length > 3 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}
          >
            {tiles.map((item) => {
              const Icon = item.icon;
              return (
                <motion.div key={item.title} variants={fadeUp}>
                  <span className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${item.iconBg}`}>
                    <Icon className="h-7 w-7" />
                  </span>
                  <p className="mt-4 font-bold text-ink-900">{item.title}</p>
                  <p className="mt-2 text-sm text-slate-500">{item.body}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Outside the form on purpose: React submit events bubble through the
          component tree, so a payment form rendered inside the estimator's own
          <form> would also submit the estimate. */}
      {buying && (
        <PaymentRequestModal
          title={buying.title}
          summary={buying.summary}
          amount={buying.amount}
          payload={{ purpose: buying.purpose, estimate_option: buying.estimate_option }}
          onSubmitted={() => setPaymentPending(true)}
          onClose={() => setBuying(null)}
        />
      )}
    </>
  );
}

// One of the two side-by-side step cards. `state`: "active" | "done" | "locked".
function StepCard({ icon: Icon, step, title, body, state, onClick }) {
  const locked = state === "locked";
  const done = state === "done";
  return (
    <motion.button
      type="button"
      variants={fadeUp}
      whileHover={locked ? undefined : { y: -4, transition: { duration: 0.3, ease: [0.22, 0.61, 0.36, 1] } }}
      onClick={onClick}
      aria-disabled={locked}
      className={`rounded-2xl border-2 bg-white p-8 text-left transition-[border-color,box-shadow,opacity] duration-300 ease-[cubic-bezier(.22,.61,.36,1)] ${
        locked
          ? "border-slate-200 opacity-70"
          : done
            ? "border-emerald-300 hover:shadow-lg"
            : "border-brand-500 ring-2 ring-brand-100 hover:shadow-lg"
      }`}
    >
      <div className="flex items-start justify-between">
        <span
          className={`flex h-12 w-12 items-center justify-center rounded-xl text-white ${
            locked ? "bg-slate-400" : done ? "bg-emerald-500" : "bg-brand-500"
          }`}
        >
          <Icon className="h-6 w-6" />
        </span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
            locked ? "bg-slate-100 text-slate-500" : done ? "bg-emerald-100 text-emerald-700" : "bg-brand-100 text-brand-700"
          }`}
        >
          {locked ? <Lock className="h-3 w-3" /> : done ? <CheckCircle2 className="h-3 w-3" /> : null}
          {locked ? "Locked" : done ? "Done" : step}
        </span>
      </div>
      <p className="mt-5 text-lg font-bold text-ink-900">{title}</p>
      <p className="mt-2 text-sm text-slate-500">{body}</p>
    </motion.button>
  );
}
