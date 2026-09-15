import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

// Single shared connection for the whole app - imported wherever a
// component needs to listen for or react to live backend events.
export const socket = io(SOCKET_URL, {
  autoConnect: true,
  transports: ["websocket", "polling"],
});
