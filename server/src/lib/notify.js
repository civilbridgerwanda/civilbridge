import { Notification } from "../models/index.js";

/**
 * Creates a notification row and, if an `io` instance is passed, emits it
 * live to the recipient's personal room (`user:<id>`) so their bell icon
 * updates instantly without a refresh. The client joins that room once
 * signed in - see client/src/lib/socket.js.
 */
export async function notify(io, userId, { type, title, body, link }) {
  const notification = await Notification.create({ user_id: userId, type, title, body, link });
  if (io) {
    io.to(`user:${userId}`).emit("notification:new", notification);
  }
  return notification;
}
