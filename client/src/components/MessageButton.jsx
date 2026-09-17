import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { MessageSquare, Loader2 } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";

export default function MessageButton({ userId, label, className }) {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!token) {
      navigate("/sign-in", { state: { from: location.pathname } });
      return;
    }
    if (user?.id === userId) return; // can't message yourself

    setLoading(true);
    try {
      const { id } = await api.startConversation(userId, token);
      navigate(`/messages/${id}`);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (user?.id === userId) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={
        className ||
        "flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-white transition-[background-color,opacity] duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:bg-brand-600 disabled:opacity-60"
      }
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
      {label || "Send Message"}
    </button>
  );
}
