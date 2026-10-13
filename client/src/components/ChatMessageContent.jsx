import { Link } from "react-router-dom";

// Minimal markdown: **bold**, [label](/internal-path) links and line breaks -
// all the assistant's replies use. Links are limited to paths inside this
// site (a single leading "/", never "//" or a full URL), so whatever a reply
// contains - including text produced by a language model - can't render as a
// link to somewhere else or a javascript: URL.
const TOKENS = /(\*\*[^*]+\*\*|\[[^\]]+\]\(\/(?!\/)[^)\s]*\))/g;
const LINK = /^\[([^\]]+)\]\((\/(?!\/)[^)\s]*)\)$/;

function renderLine(line, key, inverted) {
  const parts = line.split(TOKENS).filter(Boolean);
  return (
    <p key={key} className={line.trim() === "" ? "h-2" : ""}>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
        const link = part.match(LINK);
        if (link) {
          return (
            <Link
              key={i}
              to={link[2]}
              className={`font-semibold underline underline-offset-2 ${inverted ? "text-white" : "text-brand-600 hover:text-brand-700"}`}
            >
              {link[1]}
            </Link>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
}

export default function ChatMessageContent({ content, inverted = false }) {
  return <div className="space-y-1">{content.split("\n").map((line, i) => renderLine(line, i, inverted))}</div>;
}
