// Minimal markdown: only handles **bold** spans and line breaks, which is
// all the AI Studio replies use. Keeps us from pulling in a full markdown
// parser for a handful of formatted lines.
function renderLine(line, key) {
  const parts = line.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <p key={key} className={line.trim() === "" ? "h-2" : ""}>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i}>{part.slice(2, -2)}</strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </p>
  );
}

export default function ChatMessageContent({ content }) {
  return <div className="space-y-1">{content.split("\n").map((line, i) => renderLine(line, i))}</div>;
}
