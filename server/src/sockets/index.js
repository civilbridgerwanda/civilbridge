/**
 * Socket.IO wiring.
 *
 * How it's used: whenever data changes in the backend (a new estimate is
 * generated, a property is added, an expert verifies a plan, etc.) the
 * relevant route handler calls io.emit(...) after writing to MySQL. Every
 * connected browser tab receives the event instantly and updates its UI
 * with no page refresh and no polling.
 */
export function registerSocketHandlers(io) {
  io.on("connection", (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    socket.on("join:room", (room) => {
      socket.join(room);
    });

    socket.on("disconnect", () => {
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
};
