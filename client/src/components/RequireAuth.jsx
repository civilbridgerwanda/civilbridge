import { useLocation } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import PageLoader from "./PageLoader";
import AuthGate from "./AuthGate";

// A generic content skeleton stands in for whatever this route would have
// shown, so the hard gate below reads as "this page needs an account" -
// not a blank screen or, worse, an abrupt redirect away from the URL the
// person actually clicked.
function ContentSkeleton() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse px-6 py-10">
      <div className="h-4 w-40 rounded bg-slate-200" />
      <div className="mt-6 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="aspect-[16/10] rounded-2xl bg-slate-200" />
          <div className="mt-6 h-8 w-2/3 rounded bg-slate-200" />
          <div className="mt-3 h-4 w-1/3 rounded bg-slate-200" />
          <div className="mt-6 h-24 rounded bg-slate-200" />
        </div>
        <div className="h-64 rounded-2xl bg-slate-200" />
      </div>
    </div>
  );
}

export default function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader />;

  if (!user) {
    return (
      <div className="relative min-h-[70vh] overflow-hidden">
        <ContentSkeleton />
        <AuthGate
          variant="hard"
          from={location.pathname}
          title="Sign in to continue"
          message="You need a free CivilBridge account to view this page."
        />
      </div>
    );
  }

  return children;
}
