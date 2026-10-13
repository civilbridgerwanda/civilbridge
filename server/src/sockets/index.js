import { User } from "../models/index.js";
import { verifyToken } from "../middleware/auth.js";
import * as presence from "../lib/presence.js";

/**
 * Socket.IO wiring.
 *
 * How it's used: whenever data changes in the backend (a new estimate is
 * generated, a property is added, an expert verifies a plan, etc.) the
 * relevant route handler calls io.emit(...) after writing to MySQL. Every
 * connected browser tab receives the event instantly and updates its UI
 * with no page refresh and no polling.
 *
 * Identity: a connection starts anonymous. The client proves who it is by
 * sending its login token in an "auth" event (on every connect, so it also
 * survives a reconnect). Only then does the server put it in the private
 * rooms that belong to that person:
 *   user:<id>  - that person's own notifications and updates
 *   admins     - staff-only events (an expert coming online, etc.)
 * A client can no longer join someone else's user room just by asking.
 */
export function registerSocketHandlers(io) {
  const tellAdmins = (userId) =>
    io.to("admins").emit(EVENTS.PRESENCE_CHANGED, { user_id: userId, status: presence.statusOf(userId) });

  // Shared by "disconnect" and "deauth" (signing out without closing the tab).
  function forget(socket) {
    const { userId } = socket.data;
    if (!userId) return;
    socket.leave(`user:${userId}`);
    socket.leave("admins");
    const gone = presence.disconnect(socket.id);
    if (gone) {
      if (gone.nowOffline) User.update({ last_seen_at: new Date() }, { where: { id: gone.userId } }).catch(() => {});
      tellAdmins(gone.userId);
    }
    socket.data.userId = null;
    socket.data.role = null;
  }

  io.on("connection", (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    socket.on("auth", async (token, ack) => {
      try {
        const payload = verifyToken(token);
        // Role comes from the database, not the token: a token can be up to 30
        // days old, and someone promoted to expert (or suspended) since then
        // should be treated as they are now.
        const user = payload ? await User.findByPk(payload.sub, { attributes: ["id", "role", "is_suspended"] }) : null;
        if (!user || user.is_suspended) {
          forget(socket);
          return ack?.({ ok: false });
        }
        if (socket.data.userId && socket.data.userId !== user.id) forget(socket); // switched accounts

        socket.data.userId = user.id;
        socket.data.role = user.role;
        socket.join(`user:${user.id}`);
        if (user.role === "admin") socket.join("admins");
        if (user.role === "expert") {
          presence.connect(user.id, socket.id);
          tellAdmins(user.id);
        }
        ack?.({ ok: true });
      } catch (err) {
        console.error("Socket auth error:", err.message);
        ack?.({ ok: false });
      }
    });

    socket.on("deauth", () => forget(socket));

    // An expert's tab going idle/hidden or coming back. "away" = still open,
    // but nobody's looking.
    socket.on("presence:state", (state) => {
      if (socket.data.role !== "expert") return;
      presence.setState(socket.id, state);
      tellAdmins(socket.data.userId);
    });

    socket.on("join:room", (room) => {
      // Private rooms are joined through "auth" only.
      if (typeof room !== "string" || room.startsWith("user:") || room === "admins") return;
      socket.join(room);
    });

    socket.on("disconnect", () => {
      forget(socket);
      console.log(`❌ Client disconnected: ${socket.id}`);
    });
  });
}

// Event name constants, shared so routes and the client agree on spelling.
export const EVENTS = {
  PROPERTY_CREATED: "property:created",
  PROPERTY_UPDATED: "property:updated",
  ESTIMATE_CREATED: "estimate:created",
  ESTIMATE_STATUS_CHANGED: "estimate:status_changed",
  // A backend-agent job moved (queued -> running -> completed/failed).
  // Sent only to the owner's personal room, with no job input or output.
  AGENT_JOB_UPDATED: "agent:job_updated",
  // Homepage counters changed - broadcast, carries no data (clients refetch).
  STATS_UPDATED: "stats:updated",
  // An expert came online / went idle / left. Staff room only.
  PRESENCE_CHANGED: "presence:changed",
};
