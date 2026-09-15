import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import PageLoader from "./PageLoader";

export default function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader />;

  if (!user) {
    return <Navigate to="/sign-in" state={{ from: location.pathname }} replace />;
  }

  return children;
}
