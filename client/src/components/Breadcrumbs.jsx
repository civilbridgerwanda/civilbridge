import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

// items: [{ label, to? }] - the last item (no `to`) renders as plain text,
// since it's the current page.
export default function Breadcrumbs({ items }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
      {items.map((item, i) => (
        <span key={item.label} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-300" />}
          {item.to ? (
            <Link to={item.to} className="hover:text-ink-900 hover:underline">
              {item.label}
            </Link>
          ) : (
            <span className="truncate text-ink-900">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
