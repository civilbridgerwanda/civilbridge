import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { LogOut, LayoutDashboard } from "lucide-react";
import logo from "../assets/logo.png";
import { useAuth } from "../lib/AuthContext";
import NotificationBell from "./NotificationBell";
import MessagesIconLink from "./MessagesIconLink";

const links = [
  { to: "/", label: "Home" },
  { to: "/marketplace", label: "Marketplace" },
  { to: "/experts", label: "Experts" },
  { to: "/plans", label: "Plans" },
  { to: "/estimator", label: "Estimator" },
  { to: "/ai-studio", label: "AI Studio" },
  { to: "/pricing", label: "Pricing" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    setMenuOpen(false);
    navigate("/");
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold text-brand-500">
          <img src={logo} alt="CivilBridge" width="32" height="32" className="h-8 w-8" loading="eager" />
          CivilBridge
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-700 md:flex">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                isActive ? "text-brand-600" : "hover:text-brand-600"
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        {user ? (
          <div className="flex items-center gap-2">
            <MessagesIconLink />
            <NotificationBell />
            <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-full border border-slate-200 py-1 pl-1 pr-3 text-sm font-semibold text-ink-900 hover:bg-slate-50"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 text-xs text-white">
                {user.full_name?.[0]?.toUpperCase()}
              </span>
              {user.full_name?.split(" ")[0]}
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                <Link
                  to="/dashboard"
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  My Dashboard
                </Link>
                {(user.role === "expert" || user.role === "admin") && (
                  <Link
                    to="/expert-dashboard"
                    onClick={() => setMenuOpen(false)}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Expert Dashboard
                  </Link>
                )}
                {user.role === "property_owner" && (
                  <Link
                    to="/my-properties"
                    onClick={() => setMenuOpen(false)}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    My Properties
                  </Link>
                )}
                {user.role === "admin" && (
                  <Link
                    to="/admin"
                    onClick={() => setMenuOpen(false)}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Admin Dashboard
                  </Link>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <Link to="/sign-in" className="text-sm font-medium text-slate-700 hover:text-brand-600">
              Sign In
            </Link>
            <Link
              to="/get-started"
              className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
            >
              Get Started
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
