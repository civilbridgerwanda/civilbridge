// A striped label/value table for structural details - e.g. the "Detail"
// column on the Alibaba-style product reference. Rows with no value are
// skipped so optional fields don't render as blank lines.
export default function SpecTable({ rows }) {
  const visible = rows.filter((r) => r.value !== null && r.value !== undefined && r.value !== "");
  if (!visible.length) return null;

  return (
    <table className="w-full overflow-hidden rounded-xl border border-slate-200 text-sm">
      <tbody>
        {visible.map((row, i) => (
          <tr key={row.label} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
            <td className="w-1/3 px-4 py-3 font-semibold text-slate-500">{row.label}</td>
            <td className="px-4 py-3 text-ink-900">{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
