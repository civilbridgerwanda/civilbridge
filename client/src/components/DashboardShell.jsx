import { Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Calculator,
  Building2,
  FileText,
  MessageSquare,
  Settings,
  Users,
  Mail,
  CreditCard,
  BarChart3,
  LifeBuoy,
} from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { useUnreadMessagesCount } from "../lib/useUnreadMessages";
import DashboardLayout from "./DashboardLayout";
import PageLoader from "./PageLoader";

export default function DashboardShell() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const unreadMessages = useUnreadMessagesCount();

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/sign-in" state={{ from: location.pathname }} replace />;

  const messagesItem = { to: "/messages", label: "Messages", icon: MessageSquare, badge: unreadMessages };

  let navItems;
  let searchPlaceholder;
  let onSearch;

  if (user.role === "admin") {
    navItems = [
      { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
      { to: "/admin?tab=Analytics", label: "Analytics", icon: BarChart3 },
      { to: "/admin?tab=Estimates", label: "Estimates", icon: Calculator },
      { to: "/admin?tab=Users", label: "Users", icon: Users },
      { to: "/admin?tab=Properties", label: "Properties", icon: Building2 },
      { to: "/admin?tab=Plans", label: "Plans", icon: FileText },
      { to: "/admin?tab=Inquiries", label: "Inquiries", icon: LifeBuoy },
      { to: "/admin?tab=Payments", label: "Payments", icon: CreditCard },
      { to: "/admin?tab=Newsletter", label: "Newsletter", icon: Mail },
      messagesItem,
    ];
    searchPlaceholder = "Search users by name or email...";
    onSearch = (q) => navigate(`/admin?tab=Users&search=${encodeURIComponent(q)}`);
  } else if (user.role === "expert") {
    // Property listing is deliberately not part of the expert role - see
    // properties.controller.js's create() guard.
    navItems = [
      { to: "/expert-dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
      { to: "/experts", label: "Expert Directory", icon: Users },
      { to: "/estimator", label: "Cost Estimator", icon: Calculator },
      { to: "/plans", label: "Building Plans", icon: FileText },
      { to: "/payments", label: "Payments", icon: CreditCard },
      messagesItem,
      { to: "/settings", label: "Settings", icon: Settings },
    ];
    searchPlaceholder = "Search the expert directory...";
    onSearch = (q) => navigate(`/experts?search=${encodeURIComponent(q)}`);
  } else if (user.role === "property_owner") {
    // A client is upgraded to this role automatically the moment they list
    // their first property (see properties.controller.js's create()) -
    // property management only shows up here, never for plain clients or
    // experts.
    navItems = [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
      { to: "/my-properties", label: "My Properties", icon: Building2 },
      { to: "/estimator", label: "Cost Estimator", icon: Calculator },
      { to: "/marketplace", label: "Marketplace", icon: Building2 },
      { to: "/plans", label: "Building Plans", icon: FileText },
      { to: "/payments", label: "Payments", icon: CreditCard },
      messagesItem,
      { to: "/settings", label: "Settings", icon: Settings },
    ];
    searchPlaceholder = "Search properties...";
    onSearch = (q) => navigate(`/marketplace?search=${encodeURIComponent(q)}`);
  } else {
    // Plain client - no property management here either; listing a
    // property is what upgrades them to property_owner in the first place.
    navItems = [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
      { to: "/estimator", label: "Cost Estimator", icon: Calculator },
      { to: "/marketplace", label: "Marketplace", icon: Building2 },
      { to: "/plans", label: "Building Plans", icon: FileText },
      { to: "/payments", label: "Payments", icon: CreditCard },
      messagesItem,
      { to: "/settings", label: "Settings", icon: Settings },
    ];
    searchPlaceholder = "Search properties...";
    onSearch = (q) => navigate(`/marketplace?search=${encodeURIComponent(q)}`);
  }

  return <DashboardLayout navItems={navItems} searchPlaceholder={searchPlaceholder} onSearch={onSearch} />;
}
