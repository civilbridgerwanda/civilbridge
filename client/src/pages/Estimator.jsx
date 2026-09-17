import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Upload,
  MessageSquare,
  FileText,
  DollarSign,
  Clock,
  CheckCircle2,
  File as FileIcon,
  X,
  Sparkles,
  MapPin,
} from "lucide-react";
import { api } from "../lib/api";
import { socket } from "../lib/socket";
import { trackEvent } from "../lib/analytics";
import Seo from "../components/Seo";
import { fadeUp, stagger } from "../lib/motion";
import { RWANDA_LOCATIONS } from "../lib/locations";
import { useAuth } from "../lib/AuthContext";

const methods = [
  {
    value: "upload",
    icon: Upload,
    title: "Upload Existing Plan",
    body: "Upload your architectural plans or sketches. Our AI will analyze them and generate a detailed cost estimate.",
  },
  {
    value: "describe",
    icon: MessageSquare,
    title: "Describe Your Project",
    body: "Tell us about your building project conversationally. We'll ask questions and generate an estimate based on your description.",
  },
];

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
    body: "Materials, labor, and total costs with regional adjustments",
  },
  {
    icon: Clock,
    iconBg: "bg-blue-100 text-blue-600",
    title: "Timeline Estimate",
    body: "Projected construction phases and completion timeframe",
  },
];

export default function Estimator() {
  const { token } = useAuth();
  const [method, setMethod] = useState(null);
  const [form, setForm] = useState({
    description: "",
    project_type: "",
    location: "",
    budget_range: "",
    land_size: "",
    upi: "",
  });
  const [file, setFile] = useState(null);
  const [estimate, setEstimate] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadNotice, setUploadNotice] = useState(null);

  const resetForm = () =>
    setForm({ description: "", project_type: "", location: "", budget_range: "", land_size: "", upi: "" });

  // Listen for status changes on this specific estimate (e.g. an expert
  // marks it "verified" from another screen) and update instantly.
  useEffect(() => {
    if (!estimate) return;
    socket.emit("join:room", `estimate:${estimate.id}`);

    function handleStatusChange(updated) {
      if (updated.id === estimate.id) setEstimate(updated);
    }
    socket.on("estimate:status_changed", handleStatusChange);
    return () => socket.off("estimate:status_changed", handleStatusChange);
  }, [estimate]);

  function selectMethod(value) {
    setMethod(value);
    setEstimate(null);
    resetForm();
    setFile(null);
    trackEvent("estimator_method_selected", { method: value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setUploadNotice(null);
    try {
      let attachment_url = null;

      if (method === "upload" && file) {
        if (!token) {
          setUploadNotice("Sign in to store your uploaded file - continuing without it for now.");
        } else {
          try {
            const uploaded = await api.uploadImage(file, token);
            attachment_url = uploaded.url;
          } catch (err) {
            setUploadNotice(`Couldn't upload the file (${err.message}) - continuing without it.`);
          }
        }
      }

      // The backend estimates table only has a single free-text
      // description column today, so structured fields the mockup asks
      // for (budget, land size, UPI, uploaded filename) are folded into
      // it as readable lines. If this data needs to be queried/reported
      // on later, promote these into real columns on `estimates`.
      const extraLines = [
        form.budget_range && `Budget: RWF ${Number(form.budget_range).toLocaleString()}`,
        form.land_size && `Land size: ${form.land_size} sqm`,
        form.upi && `UPI (land plot number): ${form.upi}`,
        method === "upload" && file && !attachment_url && `Uploaded plan: ${file.name}`,
      ].filter(Boolean);

      const description = [form.description, ...extraLines].filter(Boolean).join("\n");

      const project_name = form.description
        ? form.description.split("\n")[0].slice(0, 60)
        : `${form.project_type || "Custom"} project${form.location ? ` in ${form.location}` : ""}`;

      const created = await api.createEstimate({
        project_name,
        project_type: form.project_type,
        description,
        estimated_cost: 0,
        attachment_url,
        items: [],
      });
      setEstimate(created);
      trackEvent("estimate_submitted", { project_type: form.project_type, method });
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Seo
        title="Cost Estimator"
        description="Get an AI-generated, expert-verified construction cost estimate for your building project in Rwanda."
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
            Get accurate, Rwanda-specific cost estimates powered by AI and verified by
            expert engineers.
          </motion.p>
        </div>
      </section>

      {/* How would you like to get started */}
      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-extrabold text-ink-900">How would you like to get started?</h2>
          <p className="mt-2 text-slate-500">Choose the method that works best for you</p>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            variants={stagger}
            className="mt-10 grid gap-6 text-left sm:grid-cols-2"
          >
            {methods.map((m) => {
              const Icon = m.icon;
              const active = method === m.value;
              return (
                <motion.button
                  key={m.value}
                  type="button"
                  variants={fadeUp}
                  whileHover={{ y: -4, transition: { duration: 0.3, ease: [0.22, 0.61, 0.36, 1] } }}
                  onClick={() => selectMethod(m.value)}
                  className={`rounded-2xl border-2 bg-white p-8 text-left transition-[border-color,box-shadow] duration-300 ease-[cubic-bezier(.22,.61,.36,1)] hover:shadow-lg ${
                    active ? "border-brand-500 ring-2 ring-brand-100" : "border-slate-200"
                  }`}
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500 text-white">
                    <Icon className="h-6 w-6" />
                  </span>
                  <p className="mt-5 text-lg font-bold text-ink-900">{m.title}</p>
                  <p className="mt-2 text-sm text-slate-500">{m.body}</p>
                </motion.button>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* What you'll get */}
      <section className="py-16">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <h2 className="text-3xl font-extrabold text-ink-900">What You'll Get</h2>
          <p className="mt-2 text-slate-500">Comprehensive cost intelligence for informed decisions</p>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            variants={stagger}
            className="mt-12 grid gap-10 sm:grid-cols-3"
          >
            {whatYouGet.map((item) => {
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

      {/* The actual form, revealed once a method is chosen */}
      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-2xl px-6">
          <AnimatePresence mode="wait">
            {!method && (
              <motion.p
                key="prompt"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center text-slate-500"
              >
                Select a method above to get started.
              </motion.p>
            )}

            {method && !estimate && (
              <motion.form
                key={method}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleSubmit}
                className="rounded-2xl border border-slate-200 bg-white p-8"
              >
                {method === "upload" ? (
                  <>
                    <h2 className="text-xl font-bold text-ink-900">Upload Your Plans</h2>

                    <label
                      htmlFor="plan-upload"
                      className="mt-5 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 px-4 py-12 text-center hover:border-brand-400 hover:bg-brand-50"
                    >
                      <Upload className="h-7 w-7 text-slate-400" />
                      <span className="mt-1 text-slate-700">
                        {file ? "Click to replace file" : "Drop your files here or click to browse"}
                      </span>
                      <span className="text-xs text-slate-400">Supports PDF, PNG, JPG, DWG (Max 50MB)</span>
                    </label>
                    <input
                      id="plan-upload"
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.dwg"
                      className="hidden"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    />
                    {file && (
                      <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2 text-sm text-ink-900">
                        <span className="flex items-center gap-2 truncate">
                          <FileIcon className="h-4 w-4 shrink-0 text-brand-500" />
                          <span className="truncate">{file.name}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setFile(null)}
                          aria-label="Remove file"
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}

                    <div className="mt-6 grid gap-5 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-semibold text-ink-900">Project Type</label>
                        <select
                          className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                          value={form.project_type}
                          onChange={(e) => setForm({ ...form, project_type: e.target.value })}
                        >
                          <option value="">Select type...</option>
                          <option value="house">House</option>
                          <option value="apartment">Apartment</option>
                          <option value="commercial">Commercial</option>
                          <option value="land">Land</option>
                          <option value="renovation">Renovation</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-ink-900">Location (District)</label>
                        <select
                          className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                          value={form.location}
                          onChange={(e) => setForm({ ...form, location: e.target.value })}
                        >
                          <option value="">Select location...</option>
                          {RWANDA_LOCATIONS.map((loc) => (
                            <option key={loc} value={loc}>
                              {loc}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="text-xl font-bold text-ink-900">Describe Your Project</h2>

                    <div className="mt-5">
                      <label className="block text-sm font-semibold text-ink-900">What do you want to build?</label>
                      <textarea
                        required
                        rows={6}
                        placeholder="Example: I want to build a modern 4-bedroom house with a garage in Kigali. I have a budget of around 60 million RWF. The land is 500 square meters..."
                        className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                      />
                    </div>

                    <div className="mt-5 grid gap-5 sm:grid-cols-3">
                      <div>
                        <label className="block text-sm font-semibold text-ink-900">Budget Range (RWF)</label>
                        <input
                          type="number"
                          min="0"
                          placeholder="e.g., 50,000,000"
                          className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                          value={form.budget_range}
                          onChange={(e) => setForm({ ...form, budget_range: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-ink-900">Land Size (sqm)</label>
                        <input
                          type="number"
                          min="0"
                          placeholder="e.g., 500"
                          className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                          value={form.land_size}
                          onChange={(e) => setForm({ ...form, land_size: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-ink-900">Location</label>
                        <select
                          className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                          value={form.location}
                          onChange={(e) => setForm({ ...form, location: e.target.value })}
                        >
                          <option value="">Select...</option>
                          {RWANDA_LOCATIONS.map((loc) => (
                            <option key={loc} value={loc}>
                              {loc}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="mt-6 rounded-xl border border-brand-100 bg-brand-50 p-5">
                      <div className="flex items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-white">
                          <MapPin className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="font-semibold text-ink-900">Have a Land Plot Number (UPI)?</p>
                          <p className="text-sm text-slate-600">
                            Enter your UPI to auto-fill land details and get accurate estimates
                          </p>
                        </div>
                      </div>
                      <label className="mt-4 block text-sm font-semibold text-ink-900">UPI (Land Number)</label>
                      <input
                        placeholder="Enter UPI number (e.g., 1/02/03/04/567)"
                        className="mt-1 w-full rounded-lg border border-brand-200 bg-white px-4 py-2.5 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                        value={form.upi}
                        onChange={(e) => setForm({ ...form, upi: e.target.value })}
                      />
                    </div>
                  </>
                )}

                {uploadNotice && (
                  <p className="mt-3 rounded-lg bg-amber-50 px-4 py-2 text-xs text-amber-700">{uploadNotice}</p>
                )}

                <button
                  disabled={submitting}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 py-3 font-semibold text-white transition-[background-color,opacity,transform,box-shadow] duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-md active:translate-y-0 disabled:opacity-60"
                >
                  <Sparkles className="h-4 w-4" />
                  {submitting ? "Submitting…" : "Generate Estimate"}
                </button>
              </motion.form>
            )}

            {estimate && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-brand-200 bg-white p-8"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-500">
                  <CheckCircle2 className="h-6 w-6" />
                </span>
                <p className="mt-4 text-sm text-slate-500">Estimate #{estimate.id}</p>
                <h3 className="mt-1 text-xl font-bold text-ink-900">{estimate.project_name}</h3>
                <p className="mt-2 inline-block rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase text-brand-600">
                  {estimate.status.replace("_", " ")}
                </p>
                <p className="mt-4 text-sm text-slate-500">
                  This badge updates automatically the moment an expert reviews it - no
                  refresh needed.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setEstimate(null);
                    setMethod(null);
                    resetForm();
                    setFile(null);
                  }}
                  className="mt-6 text-sm font-semibold text-brand-500 hover:underline"
                >
                  Start another estimate
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </>
  );
}
