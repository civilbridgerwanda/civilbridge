import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check } from "lucide-react";
import { api } from "../lib/api";
import { socket } from "../lib/socket";
import { useAuth } from "../lib/AuthContext";
import { formatRelativeTime } from "../lib/formatRelativeTime";

export default function NotificationBell() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!token) return;
    api
      .getNotifications(token)
      .then(({ notifications, unreadCount }) => {
        setNotifications(notifications);
        setUnreadCount(unreadCount);
      })
      .catch(() => {});
  }, [token]);

  // Live: a new notification arrives instantly while signed in.
  useEffect(() => {
    function handleNew(notification) {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((c) => c + 1);
    }
    socket.on("notification:new", handleNew);
    return () => socket.off("notification:new", handleNew);
  }, []);

  // Close the dropdown on outside click.
  useEffect(() => {
    function handleClick(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleOpenNotification(n) {
    setOpen(false);
    if (!n.is_read) {
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
      api.markNotificationRead(n.id, token).catch(() => {});
    }
    if (n.link) navigate(n.link);
  }

  async function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    api.markAllNotificationsRead(token).catch(() => {});
  }

  if (!token) return null;

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-ink-900"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-bold text-ink-900">Notifications</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs font-semibold text-brand-500 hover:underline"
              >
                <Check className="h-3 w-3" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-slate-400">No notifications yet.</p>
            )}
            {notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => handleOpenNotification(n)}
                className={`block w-full border-b border-slate-50 px-4 py-3 text-left last:border-b-0 hover:bg-slate-50 ${
                  n.is_read ? "" : "bg-brand-50/40"
                }`}
              >
                <div className="flex items-start gap-2">
                  {!n.is_read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
                  <div className={n.is_read ? "pl-4" : ""}>
                    <p className="text-sm font-semibold text-ink-900">{n.title}</p>
                    {n.body && <p className="mt-0.5 text-xs text-slate-500">{n.body}</p>}
                    <p className="mt-1 text-xs text-slate-400">{formatRelativeTime(n.created_at)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
