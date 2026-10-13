import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Trash2, Upload } from "lucide-react";
import Modal from "./Modal";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";

// The reviewer's side of the pipeline: type in (or correct) the cost
// breakdown and attach drawing files for an estimate. It posts the exact same
// result shape the AI agent posts, so a person is just another - slower -
// provider. Saving moves the estimate to "ready for verification"; verifying
// is a separate, deliberate step.

export const DELIVERABLE_KINDS = [
  ["floor_plan", "Floor plan"],
  ["elevation", "Elevation"],
  ["section", "Section"],
  ["roof_plan", "Roof plan"],
  ["foundation_plan", "Foundation plan"],
  ["site_plan", "Site plan"],
  ["structural", "Structural"],
  ["mep", "MEP"],
  ["render_2d", "2D render"],
  ["render_3d", "3D render"],
  ["boq", "Bill of quantities"],
  ["report", "Report"],
  ["other", "Other"],
];

const blankItem = () => ({ item_name: "", unit: "", quantity: "", unit_price: "" });
const blankFile = () => ({ kind: "floor_plan", label: "", url: "" });
const IMAGE_EXT = /\.(png|jpe?g|webp|gif)$/i;

const input =
  "w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";

export default function EstimateResultsModal({ estimateId, onClose, onSaved }) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingIdx, setUploadingIdx] = useState(null);
  const [error, setError] = useState(null);
  const [name, setName] = useState("");
  const [summary, setSummary] = useState("");
  const [timeline, setTimeline] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([blankItem()]);
  const [files, setFiles] = useState([]);

  // Start from whatever is already recorded, so this edits rather than overwrites.
  useEffect(() => {
    let cancelled = false;
    api
      .getEstimate(estimateId, token)
      .then((e) => {
        if (cancelled) return;
        setName(e.project_name);
        setSummary(e.analysis?.summary || "");
        setTimeline(e.analysis?.timeline || "");
        setNotes(e.analysis?.notes || "");
        if (e.items?.length) {
          setItems(
            e.items.map((i) => ({
              item_name: i.item_name,
              unit: i.unit || "",
              quantity: i.quantity ?? "",
              unit_price: i.unit_price ?? "",
            }))
          );
        }
        setFiles((e.deliverables || []).map((d) => ({ kind: d.kind, label: d.label, url: d.url })));
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [estimateId, token]);

  const total = useMemo(
    () => items.reduce((sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0),
    [items]
  );

  const patchItem = (idx, patch) => setItems((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const patchFile = (idx, patch) => setFiles((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  async function attach(idx, file) {
    if (!file) return;
    setUploadingIdx(idx);
    setError(null);
    try {
      // Images go through the image endpoint, CAD/PDF/ZIP through the plan one.
      const stored = IMAGE_EXT.test(file.name) ? await api.uploadImage(file, token) : await api.uploadPlan(file, token);
      patchFile(idx, { url: stored.url, label: files[idx].label || file.name.replace(/\.[^.]+$/, "") });
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingIdx(null);
    }
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const cleanItems = items
        .filter((i) => i.item_name.trim())
        .map((i) => ({
          item_name: i.item_name.trim(),
          unit: i.unit.trim(),
          quantity: Number(i.quantity) || 0,
          unit_price: Number(i.unit_price) || 0,
        }));
      const saved = await api.saveEstimateResults(
        estimateId,
        {
          summary,
          timeline,
          notes,
          currency: "RWF",
          items: cleanItems,
          deliverables: files.filter((f) => f.url.trim()).map((f) => ({ ...f, label: f.label.trim() || f.kind })),
        },
        token
      );
      onSaved?.(saved);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Results - ${name || "estimate"}`} onClose={onClose} maxWidth="max-w-4xl">
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      ) : (
        <form onSubmit={save} className="space-y-6">
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

          <section>
            <h3 className="text-sm font-bold text-ink-900">Bill of quantities</h3>
            <p className="mt-0.5 text-xs text-slate-500">Each line's total is quantity × unit price. The estimate's total is their sum.</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-xs text-slate-500">
                  <tr>
                    <th className="pb-1 pr-2 font-semibold">Item</th>
                    <th className="w-20 pb-1 pr-2 font-semibold">Unit</th>
                    <th className="w-24 pb-1 pr-2 font-semibold">Qty</th>
                    <th className="w-32 pb-1 pr-2 font-semibold">Unit price (RWF)</th>
                    <th className="w-32 pb-1 pr-2 text-right font-semibold">Total</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((row, idx) => (
                    <tr key={idx}>
                      <td className="pb-2 pr-2">
                        <input className={input} placeholder="e.g. Concrete C25" value={row.item_name} onChange={(e) => patchItem(idx, { item_name: e.target.value })} />
                      </td>
                      <td className="pb-2 pr-2">
                        <input className={input} placeholder="m3" value={row.unit} onChange={(e) => patchItem(idx, { unit: e.target.value })} />
                      </td>
                      <td className="pb-2 pr-2">
                        <input className={input} type="number" min="0" step="any" value={row.quantity} onChange={(e) => patchItem(idx, { quantity: e.target.value })} />
                      </td>
                      <td className="pb-2 pr-2">
                        <input className={input} type="number" min="0" step="any" value={row.unit_price} onChange={(e) => patchItem(idx, { unit_price: e.target.value })} />
                      </td>
                      <td className="pb-2 pr-2 text-right font-semibold text-ink-900">
                        {((Number(row.quantity) || 0) * (Number(row.unit_price) || 0)).toLocaleString()}
                      </td>
                      <td className="pb-2">
                        <button
                          type="button"
                          aria-label="Remove line"
                          onClick={() => setItems((rows) => (rows.length > 1 ? rows.filter((_, i) => i !== idx) : [blankItem()]))}
                          className="text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between">
              <button type="button" onClick={() => setItems((rows) => [...rows, blankItem()])} className="flex items-center gap-1 text-sm font-semibold text-brand-500 hover:underline">
                <Plus className="h-4 w-4" /> Add line
              </button>
              <p className="text-sm text-slate-500">
                Total: <strong className="text-lg text-ink-900">RWF {total.toLocaleString()}</strong>
              </p>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-ink-900">Summary <span className="font-normal text-slate-400">- shown to the client</span></label>
              <textarea rows={3} className={`${input} mt-1`} value={summary} onChange={(e) => setSummary(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink-900">Timeline</label>
              <input className={`${input} mt-1`} placeholder="e.g. 9-11 months" value={timeline} onChange={(e) => setTimeline(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink-900">Notes <span className="font-normal text-slate-400">- shown to the client</span></label>
              <input className={`${input} mt-1`} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold text-ink-900">Drawings &amp; files</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Upload DWG / DXF / IFC / PDF drawings or renders, or paste a link. Clients open these in AutoCAD, ArchiCAD and similar tools.
            </p>
            <div className="mt-3 space-y-2">
              {files.map((f, idx) => (
                <div key={idx} className="grid gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-[150px_1fr_1fr_auto]">
                  <select className={input} value={f.kind} onChange={(e) => patchFile(idx, { kind: e.target.value })}>
                    {DELIVERABLE_KINDS.map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  <input className={input} placeholder="Label (e.g. Ground floor)" value={f.label} onChange={(e) => patchFile(idx, { label: e.target.value })} />
                  <div className="flex min-w-0 gap-2">
                    <input className={input} placeholder="https://… or upload →" value={f.url} onChange={(e) => patchFile(idx, { url: e.target.value })} />
                    <label className="flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-slate-300 bg-slate-50 px-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100">
                      {uploadingIdx === idx ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                      <input type="file" className="hidden" onChange={(e) => { attach(idx, e.target.files?.[0]); e.target.value = ""; }} />
                    </label>
                  </div>
                  <button type="button" aria-label="Remove file" onClick={() => setFiles((rows) => rows.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setFiles((rows) => [...rows, blankFile()])} className="mt-2 flex items-center gap-1 text-sm font-semibold text-brand-500 hover:underline">
              <Plus className="h-4 w-4" /> Add a drawing or file
            </button>
          </section>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100">
              Cancel
            </button>
            <button disabled={saving} className="flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Saving…" : "Save results"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
