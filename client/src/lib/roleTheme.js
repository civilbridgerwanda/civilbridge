// Per-role accent for the dashboard shell (DashboardLayout) and each role's
// own dashboard page - deliberately just an accent swap (active nav state,
// primary buttons, icon chips), not a full re-skin. The shared white
// sidebar/header and brand-50 canvas stay the same for every role so the
// shell still reads as one product; only the highlight color changes so
// each role's own space feels distinct at a glance.
//
// Classes are written out in full (never built from a template string) so
// Tailwind's class scanner picks them all up at build time.
const THEMES = {
  client: {
    activeNav: "bg-brand-50 text-brand-600",
    badge: "bg-brand-500",
    avatar: "bg-brand-500",
    button: "bg-brand-500 hover:bg-brand-600",
    text: "text-brand-500",
    hoverText: "hover:text-brand-500",
    iconChip: "bg-brand-50 text-brand-500",
    ring: "focus:ring-brand-100",
    border: "border-brand-100",
  },
  expert: {
    activeNav: "bg-teal-50 text-teal-700",
    badge: "bg-teal-600",
    avatar: "bg-teal-600",
    button: "bg-teal-600 hover:bg-teal-700",
    text: "text-teal-600",
    hoverText: "hover:text-teal-600",
    iconChip: "bg-teal-50 text-teal-600",
    ring: "focus:ring-teal-100",
    border: "border-teal-100",
  },
  property_owner: {
    activeNav: "bg-violet-50 text-violet-700",
    badge: "bg-violet-600",
    avatar: "bg-violet-600",
    button: "bg-violet-600 hover:bg-violet-700",
    text: "text-violet-600",
    hoverText: "hover:text-violet-600",
    iconChip: "bg-violet-50 text-violet-600",
    ring: "focus:ring-violet-100",
    border: "border-violet-100",
  },
  admin: {
    activeNav: "bg-indigo-50 text-indigo-700",
    badge: "bg-indigo-600",
    avatar: "bg-indigo-600",
    button: "bg-indigo-600 hover:bg-indigo-700",
    text: "text-indigo-600",
    hoverText: "hover:text-indigo-600",
    iconChip: "bg-indigo-50 text-indigo-600",
    ring: "focus:ring-indigo-100",
    border: "border-indigo-100",
  },
};

export function getRoleTheme(role) {
  return THEMES[role] || THEMES.client;
}
