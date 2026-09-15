import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Send, Loader2, MessageSquare, Plus, Search, LifeBuoy, X } from "lucide-react";
import { api } from "../lib/api";
import { socket } from "../lib/socket";
import { useAuth } from "../lib/AuthContext";
import { formatRelativeTime } from "../lib/formatRelativeTime";
import Seo from "../components/Seo";

export default function Messages() {
  const { id: conversationId } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin";

  const [conversations, setConversations] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [thread, setThread] = useState(null);
  const [loadingThread, setLoadingThread] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  // Admin's "start a new conversation with any user" picker.
  const [showPicker, setShowPicker] = useState(false);
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [startingWith, setStartingWith] = useState(null);

  async function loadConversations() {
    setLoadingList(true);
    try {
      const data = await api.getConversations(token);
      setConversations(data);
    } catch {
      // non-fatal for the list
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    if (token) loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!conversationId || !token) {
      setThread(null);
      return;
    }
    setLoadingThread(true);
    socket.emit("join:room", `conversation:${conversationId}`);
    api
      .getConversation(conversationId, token)
      .then(setThread)
      .catch(() => setThread(null))
      .finally(() => setLoadingThread(false));
  }, [conversationId, token]);

  // Live: new messages in the open thread, and refresh the list preview
  // for whichever conversation they belong to.
  useEffect(() => {
    function handleNew(message) {
      if (message.conversation_id === conversationId) {
        setThread((prev) => (prev ? { ...prev, messages: [...prev.messages, message] } : prev));
      }
      loadConversations();
    }
    socket.on("message:new", handleNew);
    return () => socket.off("message:new", handleNew);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // Also refresh the list when a message-related notification comes in,
  // so unread badges update even for conversations not currently open.
  useEffect(() => {
    function handleNotification(n) {
      if (n.type === "message_received") loadConversations();
    }
    socket.on("notification:new", handleNotification);
    return () => socket.off("notification:new", handleNotification);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread?.messages?.length]);

  // Admin user search for the "start new conversation" picker (debounced).
  useEffect(() => {
    if (!isAdmin || !showPicker) return;
    setSearchingUsers(true);
    const t = setTimeout(() => {
      api
        .adminUsers(token, { search: userQuery || undefined })
        .then((rows) => setUserResults(rows.filter((u) => u.id !== user?.id)))
        .catch(() => setUserResults([]))
        .finally(() => setSearchingUsers(false));
    }, 250);
    return () => clearTimeout(t);
  }, [userQuery, showPicker, isAdmin, token, user?.id]);

  async function handleStartWithUser(targetUserId) {
    setStartingWith(targetUserId);
    try {
      const { id } = await api.startConversation(targetUserId, token);
      setShowPicker(false);
      setUserQuery("");
      loadConversations();
      navigate(`/messages/${id}`);
    } catch (err) {
      alert(err.message);
    } finally {
      setStartingWith(null);
    }
  }

  async function handleMessageSupport() {
    try {
      const admin = await api.getSupportContact(token);
      const { id } = await api.startConversation(admin.id, token);
      loadConversations();
      navigate(`/messages/${id}`);
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!input.trim() || !conversationId) return;
    setSending(true);
    try {
      await api.sendMessage(conversationId, input.trim(), token);
      setInput("");
    } catch (err) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Seo title="Messages" description="Your CivilBridge conversations." path="/messages" />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-ink-900">Messages</h1>
        {isAdmin ? (
          <button
            type="button"
            onClick={() => setShowPicker((v) => !v)}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
          >
            <Plus className="h-4 w-4" /> New Message
          </button>
        ) : (
          <button
            type="button"
            onClick={handleMessageSupport}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-ink-900 hover:bg-slate-50"
          >
            <LifeBuoy className="h-4 w-4" /> Message Support
          </button>
        )}
      </div>

      {showPicker && isAdmin && (
        <div className="mt-4 rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-ink-900">Start a conversation with any user</p>
            <button type="button" onClick={() => setShowPicker(false)} aria-label="Close" className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              type="text"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-brand-400 focus:outline-none"
            />
          </div>
          <div className="mt-3 max-h-64 overflow-y-auto">
            {searchingUsers ? (
              <div className="flex justify-center py-6 text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : userResults.length ? (
              userResults.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleStartWithUser(u.id)}
                  disabled={startingWith === u.id}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm hover:bg-slate-50 disabled:opacity-60"
                >
                  <span>
                    <span className="font-semibold text-ink-900">{u.full_name}</span>
                    <span className="ml-2 text-xs capitalize text-slate-400">{u.role}</span>
                    <br />
                    <span className="text-xs text-slate-500">{u.email}</span>
                  </span>
                  {startingWith === u.id && <Loader2 className="h-4 w-4 animate-spin text-brand-500" />}
                </button>
              ))
            ) : (
              <p className="py-6 text-center text-sm text-slate-400">No users found.</p>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Conversation list */}
        <div className="rounded-2xl border border-slate-200">
          {loadingList ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : conversations.length ? (
            <ul>
              {conversations.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/messages/${c.id}`)}
                    className={`block w-full border-b border-slate-100 px-4 py-3 text-left last:border-b-0 hover:bg-slate-50 ${
                      c.id === conversationId ? "bg-brand-50" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-ink-900">{c.otherUser?.full_name || "Unknown"}</p>
                      {c.unreadCount > 0 && (
                        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-500 px-1.5 text-xs font-bold text-white">
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 truncate text-sm text-slate-500">{c.lastMessage || "No messages yet"}</p>
                    <p className="mt-1 text-xs text-slate-400">{formatRelativeTime(c.updatedAt)}</p>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-16 text-center text-sm text-slate-400">
              <p>No conversations yet.</p>
              <p className="mt-1">
                {isAdmin ? 'Click "New Message" to reach out to any user.' : "Message an expert, property owner, or support to start one."}
              </p>
            </div>
          )}
        </div>

        {/* Thread */}
        <div className="flex min-h-[60vh] flex-col rounded-2xl border border-slate-200">
          {!conversationId && (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-slate-400">
              <MessageSquare className="h-10 w-10" />
              <p>Select a conversation to view messages</p>
            </div>
          )}

          {conversationId && loadingThread && (
            <div className="flex flex-1 items-center justify-center text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}

          {conversationId && !loadingThread && thread && (
            <>
              <div className="border-b border-slate-100 px-5 py-4">
                <p className="font-bold text-ink-900">{thread.otherUser?.full_name}</p>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
                {thread.messages.map((m) => {
                  const isMine = m.sender_id === user?.id;
                  return (
                    <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                          isMine ? "bg-brand-500 text-white" : "border border-slate-200 bg-white text-slate-700"
                        }`}
                      >
                        {m.content}
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <form onSubmit={handleSend} className="flex items-center gap-3 border-t border-slate-100 px-4 py-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 rounded-full border border-slate-300 px-4 py-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || sending}
                  aria-label="Send"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white transition hover:bg-brand-600 disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
