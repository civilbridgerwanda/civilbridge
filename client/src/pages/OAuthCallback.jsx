import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../lib/AuthContext";

export default function OAuthCallback() {
  const { applyToken } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setError("No sign-in token was returned.");
      return;
    }

    applyToken(token)
      .then(() => navigate("/", { replace: true }))
      .catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 px-4 text-white">
      {error ? (
        <>
          <p className="text-lg font-semibold">Sign-in didn't complete</p>
          <p className="text-brand-100">{error}</p>
          <a href="/sign-in" className="mt-2 underline">
            Back to sign in
          </a>
        </>
      ) : (
        <>
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>Finishing sign-in…</p>
        </>
      )}
    </div>
  );
}
