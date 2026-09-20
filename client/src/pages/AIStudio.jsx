import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Sparkles,
  Send,
  Calculator,
  FileText,
  Home as HomeIcon,
  MessageSquare,
  Plus,
  Clock,
  Download,
  Share2,
  Copy,
  Check,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { api } from "../lib/api";
import { trackEvent } from "../lib/analytics";
import { formatRelativeTime } from "../lib/formatRelativeTime";
import Seo from "../components/Seo";
import ChatMessageContent from "../components/ChatMessageContent";
import { useAuth } from "../lib/AuthContext";
import AuthGate from "../components/AuthGate";
import Modal from "../components/Modal";

const GREETING =
  "Hey there! I'm your CivilBridge AI assistant - happy to help with construction planning, cost estimation, design ideas, or feasibility analysis. What's on your mind today?";

const tryAsking = [
  "I want to build a 3-bedroom house with a budget of 50 million RWF",
  "What's the cost difference between brick and block construction?",
  "Generate a plan for a small commercial building",
  "What can I build on a 400 sqm plot in Kigali?",
];

// Shown to signed-out visitors so they can see the chat UI before the app
// asks them to sign in - it never touches the server, so it never hits the
// per-user-scoped conversation endpoints.
const DRAFT_CONVERSATION = { id: null, title: "New Conversation", messages: [] };

export default function AIStudio() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [showAuthGate, setShowAuthGate] = useState(false);
  // Open by default on desktop (per the spec); closed by default on mobile,
  // where a fixed 288px sidebar would otherwise eat most of the screen -
  // there it opens as an overlay instead (see the aside's classes below).
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== "undefined" && window.innerWidth >= 640);
  const [conversations, setConversations] = useState([]);
  const [conversation, setConversation] = useState(null); // { id, title, messages }
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [shareUrl, setShareUrl] = useState(null);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const messagesEndRef = useRef(null);
  // Tracks which token value the init effect below has already run for, so
  // React StrictMode's dev-time double-invoke (and any duplicate token
  // change) doesn't create two conversations for the same visit.
  const initializedTokenRef = useRef(undefined);

  async function loadConversations() {
    try {
      const data = await api.getAiConversations(token);
      setConversations(data);
      return data;
    } catch {
      return [];
    }
  }

  async function startNewConversation() {
    if (!token) {
      setConversation(DRAFT_CONVERSATION);
      setInput("");
      return;
    }
    const created = await api.createAiConversation(token);
    setConversation(created);
    setInput("");
    loadConversations();
  }

  // On first load (and whenever sign-in state changes): resume the most
  // recent conversation if one exists, otherwise start a fresh one. Signed-out
  // visitors get a local-only draft so they can see the chat UI without any
  // of this hitting the server - those endpoints are user-scoped and require
  // auth (see server/src/routes/aiStudio.js), by design.
  useEffect(() => {
    if (initializedTokenRef.current === token) return;
    initializedTokenRef.current = token;
    (async () => {
      setLoading(true);
      if (!token) {
        setConversations([]);
        setConversation(DRAFT_CONVERSATION);
        setLoading(false);
        return;
      }
      const list = await loadConversations();
      if (list.length) {
        try {
          const full = await api.getAiConversation(list[0].id, token);
          setConversation(full);
        } catch {
          await startNewConversation();
        }
      } else {
        await startNewConversation();
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages?.length, sending]);

  async function sendMessage(text) {
    const trimmed = text.trim();
    if (!trimmed || !conversation || sending) return;

    if (!token) {
      setShowAuthGate(true);
      return;
    }

    setSending(true);
    setInput("");
    // Optimistically show the user's message right away.
    setConversation((c) => ({
      ...c,
      messages: [...c.messages, { id: `temp-${Date.now()}`, role: "user", content: trimmed }],
    }));

    try {
      const result = await api.sendAiMessage(conversation.id, trimmed, token);
      setConversation((c) => ({
        ...c,
        title: result.title,
        messages: [
          ...c.messages.filter((m) => !String(m.id).startsWith("temp-")),
          result.userMessage,
          result.assistantMessage,
        ],
      }));
      trackEvent("ai_studio_message_sent");
      loadConversations();
    } catch (err) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    sendMessage(input);
  }

  async function selectConversation(id) {
    if (conversation?.id === id) return;
    const full = await api.getAiConversation(id, token);
    setConversation(full);
  }

  function exportChat() {
    if (!conversation) return;
    const lines = [
      GREETING && `Assistant: ${GREETING}`,
      ...conversation.messages.map((m) => `${m.role === "user" ? "You" : "Assistant"}: ${m.content}`),
    ];
    const blob = new Blob([lines.join("\n\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `civilbridge-chat-${conversation.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    trackEvent("ai_studio_export");
  }

  async function shareChat() {
    if (!conversation?.id) return;
    setSharing(true);
    try {
      const { share_token } = await api.shareAiConversation(conversation.id, token);
      setShareUrl(`${window.location.origin}/ai-studio/shared/${share_token}`);
      trackEvent("ai_studio_share");
    } catch (err) {
      alert(err.message);
    } finally {
      setSharing(false);
    }
  }

  function copyShareUrl() {
    navigator.clipboard?.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const quickActions = [
    { icon: Calculator, title: "Generate Estimate", body: "Get detailed cost breakdown", to: "/estimator" },
    {
      icon: FileText,
      title: "Create Custom Plan",
      body: "AI-powered design",
      onClick: () => sendMessage("Generate a custom plan for my project"),
    },
    { icon: HomeIcon, title: "Browse Plans", body: "View ready-made options", to: "/plans" },
    { icon: MessageSquare, title: "Find Expert", body: "Connect with engineers", to: "/experts" },
  ];

  const hasMessages = Boolean(conversation?.messages?.length);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white">
      <Seo
        title="AI Studio"
        description="Chat with CivilBridge's AI assistant for construction planning, cost estimation, and feasibility analysis."
        path="/ai-studio"
      />

      {showAuthGate && (
        <AuthGate
          variant="soft"
          from="/ai-studio"
          title="Sign in to send a message"
          message="You can explore AI Studio freely - an account is only needed for the assistant to actually reply."
          onDismiss={() => setShowAuthGate(false)}
        />
      )}

      {shareUrl && (
        <Modal title="Share Chat" onClose={() => setShareUrl(null)} maxWidth="max-w-md">
          <p className="text-sm text-slate-500">
            Anyone with this link can view a read-only copy of this conversation. They'll need their own
            account to reply or continue it.
          </p>
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <input readOnly value={shareUrl} className="flex-1 truncate bg-transparent text-sm text-ink-900 focus:outline-none" />
            <button
              type="button"
              onClick={copyShareUrl}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </Modal>
      )}

      {/* Top bar - the only nav here is a link back into the marketing site
          and the profile icon, per the full-screen/distraction-free ask. */}
      <header className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
            className="text-slate-500 hover:text-ink-900"
          >
            {sidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
          </button>
          <Link to="/" className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-ink-900">
            <ArrowLeft className="h-4 w-4" />
            Back to Platform
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={exportChat}
            disabled={!hasMessages}
            className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-ink-900 disabled:opacity-40"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button
            type="button"
            onClick={shareChat}
            disabled={!hasMessages || sharing}
            className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-ink-900 disabled:opacity-40"
          >
            {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
            <span className="hidden sm:inline">Share</span>
          </button>
          {user ? (
            <button
              type="button"
              onClick={() => navigate("/settings")}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white"
              aria-label="Profile"
            >
              {user.full_name?.[0]?.toUpperCase() || "?"}
            </button>
          ) : (
            <Link to="/sign-in" className="text-sm font-semibold text-brand-500 hover:underline">
              Sign In
            </Link>
          )}
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        {/* On mobile the sidebar overlays the chat (fixed + backdrop)
            instead of squeezing it into a sliver of the screen; on
            desktop (sm+) it's a normal flex column that pushes/collapses. */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/30 sm:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col overflow-hidden border-r border-slate-200 bg-slate-50 transition-transform duration-200 ease-[cubic-bezier(.22,.61,.36,1)] sm:static sm:z-auto sm:transition-[width] ${
            sidebarOpen ? "translate-x-0 sm:w-72" : "-translate-x-full sm:w-0 sm:translate-x-0 sm:border-r-0"
          }`}
        >
          <div className="w-72 flex-1 overflow-y-auto p-4">
            <button
              type="button"
              onClick={startNewConversation}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-white transition-[background-color,transform,box-shadow] duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-md active:translate-y-0"
            >
              <Plus className="h-4 w-4" />
              New Chat
            </button>

            <p className="mt-5 px-1 text-xs font-semibold uppercase text-slate-400">History</p>
            <div className="mt-2 space-y-1">
              {conversations.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => selectConversation(c.id)}
                  className={`block w-full rounded-lg px-3 py-2.5 text-left transition-colors ${
                    conversation?.id === c.id ? "bg-brand-100 text-brand-700" : "text-ink-900 hover:bg-slate-100"
                  }`}
                >
                  <p className="truncate text-sm font-semibold">{c.title}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                    <Clock className="h-3 w-3" />
                    {formatRelativeTime(c.updated_at)}
                  </p>
                </button>
              ))}
              {!conversations.length && (
                <p className="px-1 text-sm text-slate-400">Your past conversations will show up here.</p>
              )}
            </div>
          </div>
        </aside>

        {/* Conversation canvas - this column is the only thing that
            scrolls; the input stays locked to the bottom. */}
        <div className="flex min-w-0 flex-1 flex-col bg-slate-50">
          <div className="flex-1 overflow-y-auto px-4 py-6 pr-3 sm:px-8 sm:pr-6">
            <div className="mx-auto max-w-[880px]">
              {loading ? (
                <div className="flex h-full items-center justify-center text-slate-400">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-5">
                  <ChatBubble role="assistant" content={GREETING} />
                  {conversation?.messages.map((m) => (
                    <ChatBubble key={m.id} role={m.role} content={m.content} />
                  ))}
                  {sending && <TypingBubble />}
                  <div ref={messagesEndRef} />
                </div>
              )}

              {/* Greeting-time prompts - hidden the instant a real
                  exchange has happened, so returning to an ongoing chat
                  doesn't re-show onboarding clutter. */}
              {!loading && !hasMessages && (
                <div className="mt-6">
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
                    {quickActions.map((qa) => {
                      const Icon = qa.icon;
                      const content = (
                        <>
                          <Icon className="h-5 w-5 text-brand-500" />
                          <p className="mt-2 text-sm font-bold text-ink-900">{qa.title}</p>
                          <p className="text-xs text-slate-500">{qa.body}</p>
                        </>
                      );
                      return qa.to ? (
                        <Link
                          key={qa.title}
                          to={qa.to}
                          className="rounded-xl border border-slate-200 bg-white p-4 transition-colors duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:border-brand-300 hover:bg-brand-50"
                        >
                          {content}
                        </Link>
                      ) : (
                        <button
                          key={qa.title}
                          type="button"
                          onClick={qa.onClick}
                          className="rounded-xl border border-slate-200 bg-white p-4 text-left transition-colors duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:border-brand-300 hover:bg-brand-50"
                        >
                          {content}
                        </button>
                      );
                    })}
                  </div>

                  <p className="mt-5 text-sm font-semibold text-slate-500">Try asking:</p>
                  <div className="mt-2 space-y-2">
                    {tryAsking.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => sendMessage(prompt)}
                        className="block w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700 transition-colors duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:border-brand-300 hover:bg-brand-50"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Input - locked to the bottom of the viewport, never scrolls
              away with the message history. */}
          <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-4 sm:px-8">
            <form onSubmit={handleSubmit} className="mx-auto flex max-w-[880px] items-center gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything about construction, costs, designs, or feasibility..."
                className="flex-1 rounded-full border border-slate-300 px-5 py-3 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
              <button
                type="submit"
                disabled={!input.trim() || sending}
                aria-label="Send"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white transition-[background-color,opacity,transform,box-shadow] duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-md active:translate-y-0 disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
            <p className="mx-auto mt-2 max-w-[880px] text-center text-xs text-slate-400">
              AI-powered construction intelligence for Rwanda. Always verify critical decisions with
              licensed professionals.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatBubble({ role, content }) {
  const isUser = role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : ""}`}
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          isUser ? "bg-ink-900 text-white" : "bg-brand-500 text-white"
        }`}
      >
        {isUser ? <MessageSquare className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
      </span>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
          isUser ? "bg-brand-500 text-white" : "border border-slate-200 bg-white text-slate-700"
        }`}
      >
        <ChatMessageContent content={content} />
      </div>
    </motion.div>
  );
}

function TypingBubble() {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white">
        <Sparkles className="h-3.5 w-3.5" />
      </span>
      <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white px-4 py-3">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}
