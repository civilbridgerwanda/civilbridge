import { Link } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { useUnreadMessagesCount } from "../lib/useUnreadMessages";

export default function MessagesIconLink() {
  const { token } = useAuth();
  const unreadCount = useUnreadMessagesCount();

  if (!token) return null;

  return (
    <Link
      to="/messages"
      aria-label="Messages"
      className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-ink-900"
    >
      <MessageSquare className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
