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

  useEffect(() => {
    if (!inView) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Read the target from data-target - the same attribute the static
    // markup carries - so the animation can never drift out of sync with
    // what's actually rendered.
    const target = Number(ref.current?.dataset.target ?? to);

    setValue(0);
    const start = performance.now();

    function tick(now) {
      const elapsed = (now - start) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic - fast start, settles gently on the final number
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
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
