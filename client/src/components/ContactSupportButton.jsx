import { useEffect, useState } from "react";
import { LifeBuoy } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import MessageButton from "./MessageButton";

export default function ContactSupportButton({ className }) {
  const { token } = useAuth();
  const [supportId, setSupportId] = useState(null);

  useEffect(() => {
    if (!token) return;
    api
      .getSupportContact(token)
      .then((admin) => setSupportId(admin.id))
      .catch(() => {});
  }, [token]);

  if (!supportId) return null;

  return (
    <MessageButton
      userId={supportId}
      label="Contact Support"
      className={
        className ||
        "inline-flex items-center gap-2 rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-ink-900 transition-colors duration-200 ease-[cubic-bezier(.22,.61,.36,1)] hover:bg-slate-50"
      }
    />
  );
}
