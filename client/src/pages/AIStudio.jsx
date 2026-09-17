import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Sparkles,
  Send,
  Calculator,
  FileText,
  Home as HomeIcon,
  MessageSquare,
  ChevronRight,
  Plus,
  Clock,
  Download,
  Loader2,
} from "lucide-react";
import { api } from "../lib/api";
import { trackEvent } from "../lib/analytics";
import { formatRelativeTime } from "../lib/formatRelativeTime";
import Seo from "../components/Seo";
import ChatMessageContent from "../components/ChatMessageContent";

const GREETING =
  "Hello! I'm your CivilBridge AI assistant. I can help you with construction planning, cost estimation, design ideas, and feasibility analysis. What would you like to explore today?";

const tryAsking = [
  "I want to build a 3-bedroom house with a budget of 50 million RWF",
  "What's the cost difference between brick and block construction?",
  "Generate a plan for a small commercial building",
  "What can I build on a 400 sqm plot in Kigali?",
];

export default function AIStudio() {
  const [conversations, setConversations] = useState([]);
  const [conversation, setConversation] = useState(null); // { id, title, messages }
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  async function loadConversations() {
    try {
      const data = await api.getAiConversations();
      setConversations(data);
      return data;
    } catch {
      return [];
    }
  }

  async function startNewConversation() {
    const created = await api.createAiConversation();
    setConversation(created);
    setInput("");
    loadConversations();
  }

  // On first load: resume the most recent conversation if one exists,
  // otherwise start a fresh one.
  useEffect(() => {
    (async () => {
      setLoading(true);
      const list = await loadConversations();
      if (list.length) {
        try {
          const full = await api.getAiConversation(list[0].id);
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
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages?.length, sending]);

  async function sendMessage(text) {
    const trimmed = text.trim();
    if (!trimmed || !conversation || sending) return;

    setSending(true);
    setInput("");
    // Optimistically show the user's message right away.
    setConversation((c) => ({
      ...c,
      messages: [...c.messages, { id: `temp-${Date.now()}`, role: "user", content: trimmed }],
    }));

    try {
      const result = await api.sendAiMessage(conversation.id, trimmed);
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
    const full = await api.getAiConversation(id);
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

  return (
    <>
      <Seo
        title="AI Studio"
        description="Chat with CivilBridge's AI assistant for construction planning, cost estimation, and feasibility analysis."
        path="/ai-studio"
      />

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {/* In-page header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <Link to="/" aria-label="Back" className="text-slate-500 hover:text-ink-900">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-white">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <p className="font-bold text-ink-900">AI Studio</p>
              <p className="text-xs text-slate-500">Construction Intelligence</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={exportChat}
              disabled={!conversation?.messages?.length}
              className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-ink-900 disabled:opacity-40"
            >
              <Download className="h-4 w-4" />
              Export Chat
            </button>
            <button
              type="button"
              onClick={startNewConversation}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-[background-color,transform,box-shadow] duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-md active:translate-y-0"
            >
              New Session
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-[1fr_260px] lg:grid-cols-[1fr_320px]">
          {/* Chat panel */}
          <div className="rounded-2xl border border-slate-200 bg-white">
            <div className="h-[55vh] min-h-[360px] overflow-y-auto p-6">
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
            </div>

            {/* Quick actions + suggestions */}
            <div className="border-t border-slate-100 px-6 py-5">
              <div className="grid gap-3 sm:grid-cols-2">
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
                      className="rounded-xl border border-slate-200 p-4 transition-colors duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:border-brand-300 hover:bg-brand-50"
                    >
                      {content}
                    </Link>
                  ) : (
                    <button
                      key={qa.title}
                      type="button"
                      onClick={qa.onClick}
                      className="rounded-xl border border-slate-200 p-4 text-left transition-colors duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:border-brand-300 hover:bg-brand-50"
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
                    className="block w-full rounded-lg border border-slate-200 px-4 py-2.5 text-left text-sm text-slate-700 transition-colors duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:border-brand-300 hover:bg-brand-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="flex items-center gap-3 border-t border-slate-100 px-6 py-4">
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
            <p className="border-t border-slate-100 px-6 py-3 text-center text-xs text-slate-400">
              AI-powered construction intelligence for Rwanda. Always verify critical decisions with
              licensed professionals.
            </p>
          </div>

          {/* History sidebar */}
          <div className="h-fit rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="font-bold text-ink-900">History</p>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </div>

            <button
              type="button"
              onClick={startNewConversation}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-white transition-[background-color,transform,box-shadow] duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-md active:translate-y-0"
            >
              <Plus className="h-4 w-4" />
              New Conversation
            </button>

            <div className="mt-5 space-y-4">
              {conversations.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => selectConversation(c.id)}
                  className={`block w-full border-b border-slate-100 pb-3 text-left last:border-b-0 ${
                    conversation?.id === c.id ? "text-brand-600" : "text-ink-900"
                  }`}
                >
                  <p className="text-sm font-semibold">{c.title}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                    <Clock className="h-3 w-3" />
                    {formatRelativeTime(c.updated_at)}
                  </p>
                </button>
              ))}
              {!conversations.length && (
                <p className="text-sm text-slate-400">Your past conversations will show up here.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
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
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser ? "bg-ink-900 text-white" : "bg-brand-500 text-white"
        }`}
      >
        {isUser ? <MessageSquare className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
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
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white">
        <Sparkles className="h-4 w-4" />
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
