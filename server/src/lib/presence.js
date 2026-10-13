/**
 * Who's on the site right now.
 *
 * Only experts are tracked - it exists so the admin team can see which experts
 * are actually here to be handed work. It lives in memory: a connection is the
 * source of truth, so a server restart simply rebuilds it as browsers
 * reconnect and re-identify (the client does that on every connect). With
 * several API instances this would move to Redis; today it's one process.
 *
 *   online  - at least one open tab that's in use
 *   away    - tabs are open but hidden/idle (the browser reports this)
 *   offline - no connection
 */

const sockets = new Map(); // socketId -> { userId, state: "active" | "away" }
const usersSockets = new Map(); // userId -> Set<socketId>

export function connect(userId, socketId) {
  sockets.set(socketId, { userId, state: "active" });
  if (!usersSockets.has(userId)) usersSockets.set(userId, new Set());
  usersSockets.get(userId).add(socketId);
}

export function setState(socketId, state) {
  const entry = sockets.get(socketId);
  if (entry && (state === "active" || state === "away")) entry.state = state;
}

/** Returns { userId, nowOffline } for the socket that went away, or null if untracked. */
export function disconnect(socketId) {
  const entry = sockets.get(socketId);
  if (!entry) return null;
  sockets.delete(socketId);
  const set = usersSockets.get(entry.userId);
  set?.delete(socketId);
  const nowOffline = !set || set.size === 0;
  if (nowOffline) usersSockets.delete(entry.userId);
  return { userId: entry.userId, nowOffline };
}

export function statusOf(userId) {
  const set = usersSockets.get(userId);
  if (!set || set.size === 0) return "offline";
  for (const id of set) if (sockets.get(id)?.state === "active") return "online";
  return "away";
}

export function onlineCount() {
  return usersSockets.size;
}
