import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import PageLoader from "./PageLoader";

export default function RequireAdmin({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader />;

  if (!user) {
    return <Navigate to="/sign-in" state={{ from: location.pathname }} replace />;
  }

  if (user.role !== "admin") {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <p className="text-sm font-semibold text-brand-500">403</p>
        <h1 className="mt-2 text-2xl font-bold text-ink-900">Admin access required</h1>
        <p className="mt-3 text-slate-500">
          Your account doesn't have permission to view this page. If you believe this is a
          mistake, contact a CivilBridge administrator.
        </p>
      </div>
    );
  }

  return children;
}
