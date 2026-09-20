import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Sparkles, MessageSquare, Loader2, ArrowLeft } from "lucide-react";
import { api } from "../lib/api";
import Seo from "../components/Seo";
import ChatMessageContent from "../components/ChatMessageContent";

// Public, read-only view of a shared AI Studio conversation - no sign-in
// needed to view. The only way to actually participate is to sign in and
// start your own chat, per the "forces them to collaborate" spec: viewing
// is free, replying isn't.
export default function AISharedChat() {
  const { token } = useParams();
  const [conversation, setConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .getSharedAiConversation(token)
      .then(setConversation)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white">
      <Seo title="Shared Chat" description="A shared CivilBridge AI Studio conversation." path={`/ai-studio/shared/${token}`} />

      <header className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3">
        <Link to="/" className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-ink-900">
          <ArrowLeft className="h-4 w-4" />
          CivilBridge
        </Link>
        <Link
          to="/ai-studio"
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-[background-color,transform,box-shadow] duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-md active:translate-y-0"
        >
          Start Your Own Chat
        </Link>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
        <div className="mx-auto max-w-3xl">
          {loading && (
            <div className="flex h-full items-center justify-center text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}

          {error && (
            <div className="py-24 text-center">
              <h1 className="text-2xl font-bold text-ink-900">Chat not found</h1>
              <p className="mt-2 text-slate-500">{error}</p>
            </div>
          )}

          {conversation && (
            <>
              <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                Read-only shared conversation - <strong>{conversation.title}</strong>. Sign in to reply or start
                your own.
              </div>
              <div className="space-y-5">
                {conversation.messages.map((m) => (
                  <div key={m.id} className={`flex items-start gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        m.role === "user" ? "bg-ink-900 text-white" : "bg-brand-500 text-white"
                      }`}
                    >
                      {m.role === "user" ? <MessageSquare className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                    </span>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                        m.role === "user" ? "bg-brand-500 text-white" : "border border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      <ChatMessageContent content={m.content} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
