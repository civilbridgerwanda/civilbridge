import { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api";
import { socket } from "./socket";

const AuthContext = createContext(null);
const TOKEN_KEY = "civilbridge_token";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(true);

  // On load, if a token is already stored, verify it's still valid and
  // fetch the current user so a refresh doesn't log people out.
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .me(token)
      .then(setUser)
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  function applySession({ token: newToken, user: newUser }) {
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(newUser);
  }

  // Live notifications/messages are delivered to private Socket.IO rooms, and
  // the server only puts a connection in them once it has proved who it is -
  // so we send our login token on every (re)connect. Doing it on "connect"
  // also fixes notifications silently stopping after a dropped connection or
  // an API restart, which used to lose the room for good.
  //
  // Experts additionally report whether the tab is in use, so the admin team
  // can see who is actually on the site to be handed work: "away" when the tab
  // is hidden or untouched for a few minutes, "active" again on any input.
  useEffect(() => {
    if (!token || !user?.id) return undefined;

    const isExpert = user.role === "expert";
    const IDLE_MS = 5 * 60 * 1000;
    let state = "active";
    let idleTimer = null;
    let lastInput = 0;

    const report = () => {
      if (isExpert) socket.emit("presence:state", state);
    };
    const setState = (next) => {
      if (next === state) return;
      state = next;
      report();
    };
    const identify = () => socket.emit("auth", token, () => report());

    const markActive = () => {
      const now = Date.now();
      if (now - lastInput < 5000) return; // input fires constantly; sample it
      lastInput = now;
      setState("active");
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => setState("away"), IDLE_MS);
    };
    const onVisibility = () => (document.hidden ? setState("away") : markActive());

    if (socket.connected) identify();
    socket.on("connect", identify);
    if (isExpert) {
      const events = ["pointerdown", "keydown", "scroll", "mousemove"];
      events.forEach((e) => window.addEventListener(e, markActive, { passive: true }));
      document.addEventListener("visibilitychange", onVisibility);
      markActive();
      return () => {
        events.forEach((e) => window.removeEventListener(e, markActive));
        document.removeEventListener("visibilitychange", onVisibility);
        clearTimeout(idleTimer);
        socket.off("connect", identify);
        socket.emit("deauth");
      };
    }
    return () => {
      socket.off("connect", identify);
      socket.emit("deauth");
    };
  }, [token, user?.id, user?.role]);

  // When a payment is confirmed (or reversed), the server pushes a
  // notification and the person's plan / per-plan access changes. Refresh
  // the user right away so limits and badges update without a reload, and
  // tell any open page (e.g. a plan they're viewing) to re-check its own
  // data via a window event.
  useEffect(() => {
    if (!token) return;
    const ENTITLEMENT_TYPES = [
      "plan_upgraded",
      "plan_downgraded",
      "plan_license_granted",
      "plan_license_revoked",
      "credits_granted", // a pay-as-you-go estimate / drawing purchase was confirmed
      "credits_revoked",
    ];
    function handleNotification(n) {
      if (!ENTITLEMENT_TYPES.includes(n?.type)) return;
      api.me(token).then(setUser).catch(() => {});
      window.dispatchEvent(new CustomEvent("civilbridge:entitlements-changed"));
    }
    socket.on("notification:new", handleNotification);
    return () => socket.off("notification:new", handleNotification);
  }, [token]);

  async function login(email, password) {
    const data = await api.login({ email, password });
    applySession(data);
    return data.user;
  }

  async function register(full_name, email, password, role) {
    const data = await api.register({ full_name, email, password, role });
    applySession(data);
    return data.user;
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }

  async function verifyEmail(email, code) {
    const data = await api.verifyEmail(email, code);
    setUser((prev) => (prev ? { ...prev, ...data.user } : data.user));
    return data.user;
  }

  async function resetPassword(email, code, newPassword) {
    const data = await api.resetPassword(email, code, newPassword);
    applySession(data);
    return data.user;
  }

  // Used by the OAuth callback page: we already have a token (minted by
  // the backend after Google/Facebook/X approved the person), just need
  // to store it and fetch the user it belongs to.
  async function applyToken(newToken) {
    const fetchedUser = await api.me(newToken);
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(fetchedUser);
    return fetchedUser;
  }

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, register, logout, verifyEmail, resetPassword, applyToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
