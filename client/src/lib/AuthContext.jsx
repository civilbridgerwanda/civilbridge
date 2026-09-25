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

  // Live notifications/messages are delivered to a per-user Socket.IO
  // room ("user:<id>") - join it whenever we know who's signed in.
  useEffect(() => {
    if (user?.id) socket.emit("join:room", `user:${user.id}`);
  }, [user?.id]);

  // When a payment is confirmed (or reversed), the server pushes a
  // notification and the person's plan / per-plan access changes. Refresh
  // the user right away so limits and badges update without a reload, and
  // tell any open page (e.g. a plan they're viewing) to re-check its own
  // data via a window event.
  useEffect(() => {
    if (!token) return;
    const ENTITLEMENT_TYPES = ["plan_upgraded", "plan_downgraded", "plan_license_granted", "plan_license_revoked"];
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
