import { useEffect, useState } from "react";
import { api } from "./api";
import { socket } from "./socket";
import { useAuth } from "./AuthContext";

export function useUnreadMessagesCount() {
  const { token } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  async function refresh() {
    if (!token) return;
    try {
      const conversations = await api.getConversations(token);
      setUnreadCount(conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0));
    } catch {
      // non-fatal
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    function handleNotification(n) {
      if (n.type === "message_received") refresh();
    }
    socket.on("notification:new", handleNotification);
    return () => socket.off("notification:new", handleNotification);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return unreadCount;
}
