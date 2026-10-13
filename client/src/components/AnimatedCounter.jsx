import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";

export default function AnimatedCounter({ to, suffix = "", duration = 1.4 }) {
  const ref = useRef(null);
  // useInView is IntersectionObserver-backed and only fires once (`once:
  // true`), so the count-up never re-triggers on repeated scroll past it.
  const inView = useInView(ref, { once: true, amount: 0.6 });
  // Render the real final value up front - this is what stays on screen if
  // JS never runs, is delayed, or the visitor has reduced motion enabled.
  // The animation (if it runs at all) only ever counts *up* from here.
  const [value, setValue] = useState(to);
  // What's currently on screen, and whether it has animated yet. The first
  // run counts up from 0; when `to` later changes (a live counter ticking
  // over) it counts on from where it is, instead of jumping back to 0.
  const shown = useRef(to);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!inView) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      shown.current = to;
      setValue(to);
      return;
    }

    // Read the target from data-target - the same attribute the static
    // markup carries - so the animation can never drift out of sync with
    // what's actually rendered.
    const target = Number(ref.current?.dataset.target ?? to);
    const from = hasAnimated.current ? shown.current : 0;
    hasAnimated.current = true;

    setValue(from);
    const start = performance.now();

    function tick(now) {
      // rAF's timestamp can be a hair *earlier* than the performance.now()
      // taken when the effect ran, so the first frame's elapsed time can be
      // slightly negative - clamp it, or Math.round yields -0 and the counter
      // briefly reads "-0".
      const elapsed = (now - start) / 1000;
      const progress = Math.max(0, Math.min(elapsed / duration, 1));
      // ease-out cubic - fast start, settles gently on the final number
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = Math.round(from + (target - from) * eased) || 0;
      shown.current = next;
      setValue(next);
      if (progress < 1) requestAnimationFrame(tick);
    }

    const raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);

  return (
    <span ref={ref} data-target={to}>
      {value.toLocaleString()}
      {suffix}
    </span>
  );
}
