import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Menu, X, Search, LogOut } from "lucide-react";
import logo from "../assets/logo.png";
import { useAuth } from "../lib/AuthContext";
import NotificationBell from "./NotificationBell";
import MessagesIconLink from "./MessagesIconLink";

export default function DashboardLayout({ navItems, searchPlaceholder, onSearch, roleLabel }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");

  function handleLogout() {
    logout();
    navigate("/");
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    if (onSearch && search.trim()) onSearch(search.trim());
  }

  const sidebarContent = (
    <>
      <Link to="/" className="flex items-center gap-2 px-5 py-5 text-lg font-bold text-brand-600">
        <img src={logo} alt="CivilBridge" className="h-7 w-7" />
        CivilBridge
      </Link>

      <nav className="flex-1 space-y-1 px-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200 ease-[cubic-bezier(.22,.61,.36,1)] ${
                  isActive ? "bg-brand-50 text-brand-600" : "text-slate-600 hover:bg-slate-50"
                }`
              }
            >
              <span className="flex items-center gap-3">
                <Icon className="h-4.5 w-4.5" />
                {item.label}
              </span>
              {item.badge > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-500 px-1.5 text-xs font-bold text-white">
                  {item.badge > 9 ? "9+" : item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500 text-sm font-semibold text-white">
            {user?.full_name?.[0]?.toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink-900">{user?.full_name}</p>
            <p className="truncate text-xs capitalize text-slate-400">{roleLabel || user?.role}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-red-600"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSidebarOpen(false)} />
          <aside className="relative flex w-64 flex-col bg-white">
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close menu"
              className="absolute right-3 top-4 text-slate-400"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            className="text-slate-500 md:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder || "Search..."}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </form>

          <div className="ml-auto flex items-center gap-1">
            <MessagesIconLink />
            <NotificationBell />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
