import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import { socket } from "../../lib/socket";

// The admin team's view of every expert: verification, workload, and whether
// they're on the site right now. Presence changes arrive live over the socket
// (staff-only "presence:changed" events); a slow poll and reload() cover
// everything else (workload changes after an assignment, etc.).
export function useAdminExperts() {
  const { token } = useAuth();
  const [experts, setExperts] = useState(null);
  const [error, setError] = useState(null);
  const rowsRef = useRef(null); // latest list, readable from the socket handler
  useEffect(() => {
    rowsRef.current = experts;
  }, [experts]);

  const reload = useCallback(async () => {
    try {
      setExperts(await api.adminExperts(token));
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, [token]);

  useEffect(() => {
    reload();
    const poll = setInterval(reload, 60000);
    return () => clearInterval(poll);
  }, [reload]);

  useEffect(() => {
    function onPresence({ user_id, status }) {
      // Someone we don't have a row for yet (an expert who registered after
      // this page loaded): fetch the list rather than ignore them.
      if (rowsRef.current && !rowsRef.current.some((e) => e.user_id === user_id)) {
        reload();
        return;
      }
      setExperts((rows) =>
        rows?.map((e) =>
          e.user_id === user_id
            ? { ...e, presence: status, last_seen_at: status === "offline" ? new Date().toISOString() : e.last_seen_at }
            : e
        )
      );
    }
    socket.on("presence:changed", onPresence);
    return () => socket.off("presence:changed", onPresence);
  }, [reload]);

  return { experts, error, reload, setExperts };
}

const RANK = { online: 0, away: 1, offline: 2 };

// Most available first: online, then away, then offline - and within each,
// whoever has the least open work.
export function byAvailability(a, b) {
  return (RANK[a.presence] ?? 2) - (RANK[b.presence] ?? 2) || (a.open_tasks || 0) - (b.open_tasks || 0);
}
