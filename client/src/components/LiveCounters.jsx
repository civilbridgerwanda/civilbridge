import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BadgeCheck, Calculator, Star, ArrowRight } from "lucide-react";
import { api } from "../lib/api";
import { socket } from "../lib/socket";
import { fadeUp, stagger } from "../lib/motion";
import AnimatedCounter from "./AnimatedCounter";

// Real, live numbers - straight from the database via /api/stats/public, never
// typed in. They refresh themselves three ways: the server pushes a
// "stats:updated" event when something changes (an expert is verified, an
// estimate completes), the tab re-checks whenever it becomes visible again,
// and a slow poll covers anything missed.
//
// A number of 0 isn't hidden or dressed up - it becomes an invitation
// ("be the first...") so an empty platform looks honest, not broken.
export default function LiveCounters() {
  const [stats, setStats] = useState(null);
  const [failed, setFailed] = useState(false);
  const debounce = useRef(null);

  const load = useCallback(() => {
    api
      .getPublicStats()
      .then((s) => {
        setStats(s);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    load();
    const poll = setInterval(load, 60000);
    const onUpdate = () => {
      clearTimeout(debounce.current);
      debounce.current = setTimeout(load, 800); // a burst of changes = one refetch
    };
    const onVisible = () => document.visibilityState === "visible" && load();
    socket.on("stats:updated", onUpdate);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(poll);
      clearTimeout(debounce.current);
      socket.off("stats:updated", onUpdate);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  // If the numbers can't be loaded, show nothing rather than stale or made-up ones.
  if (failed && !stats) return null;

  const cards = [
    {
      key: "experts",
      icon: BadgeCheck,
      value: stats?.verified_experts,
      label: "Verified experts ready to help",
      empty: { text: "Join as our first verified expert", to: "/join-as-expert" },
    },
    {
      key: "projects",
      icon: Calculator,
      value: stats?.projects_estimated,
      label: "Projects estimated",
      empty: { text: "Upload a plan for the first estimate", to: "/estimator" },
    },
  ];
  // Only shown once there are enough real reviews for an average to mean something.
  if (stats?.rating) {
    cards.push({
      key: "rating",
      icon: Star,
      value: null,
      display: stats.rating.average.toFixed(1),
      label: `Average rating from ${stats.rating.count} verified reviews`,
    });
  }

  return (
    <section className="border-y border-slate-100 bg-white py-10">
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
        variants={stagger}
        className={`mx-auto grid max-w-5xl gap-4 px-6 sm:grid-cols-2 ${cards.length > 2 ? "lg:grid-cols-3" : ""}`}
      >
        {cards.map((c) => {
          const Icon = c.icon;
          const loading = stats === null;
          const isEmpty = !loading && c.empty && !c.value;
          return (
            <motion.div key={c.key} variants={fadeUp} className="relative flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-6">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white">
                <Icon className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                {loading ? (
                  <div className="h-8 w-16 animate-pulse rounded bg-slate-200" />
                ) : isEmpty ? (
                  <Link to={c.empty.to} className="group inline-flex items-center gap-1.5 text-lg font-bold text-brand-600 hover:underline">
                    {c.empty.text}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                ) : (
                  <p className="text-3xl font-extrabold text-ink-900">
                    {c.display ?? <AnimatedCounter to={c.value} />}
                  </p>
                )}
                <p className="mt-0.5 text-sm text-slate-500">{c.label}</p>
              </div>
              {/* Says "this number updates itself" without any extra copy. */}
              {!loading && !isEmpty && (
                <span className="absolute right-4 top-4 flex h-2 w-2" title="Updates live">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
              )}
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
