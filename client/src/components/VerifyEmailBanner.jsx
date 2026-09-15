import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, X } from "lucide-react";
import { useAuth } from "../lib/AuthContext";

export default function VerifyEmailBanner() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  if (!user || user.email_verified || !user.has_verifiable_email || dismissed) return null;

  return (
    <div className="flex items-center justify-center gap-3 bg-amber-50 px-4 py-2 text-sm text-amber-800">
      <Mail className="h-4 w-4 shrink-0" />
      <span>
        Please verify your email address.{" "}
        <Link to="/verify-email" className="font-semibold underline">
          Verify now
        </Link>
      </span>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="ml-2 text-amber-600 hover:text-amber-900"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
