import { useLayoutEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

// Session-only (per-tab, per-pathname) memory of where the user had
// scrolled to, so pressing Back returns them to their exact spot in a list
// instead of resetting to the top - only on POP (back/forward); a normal
// link click (PUSH) always starts a new page at the top.
const scrollPositions = new Map();
const instant = "instant" in window ? "instant" : "auto";

// Since this is a single-page app, the browser never does its normal
// "new page starts scrolled to top" behavior on its own - this restores it.
// useLayoutEffect (not useEffect) so the scroll jump happens before the
// browser paints the new page, instead of after - otherwise the old
// scroll position is visible for a frame, making a fresh page look like
// it loaded already scrolled down.
export function useScrollToTop() {
  const { pathname } = useLocation();
  const navigationType = useNavigationType(); // "POP" | "PUSH" | "REPLACE"

  useLayoutEffect(() => {
    const saved = navigationType === "POP" ? scrollPositions.get(pathname) : undefined;
    window.scrollTo({ top: saved ?? 0, behavior: instant });

    return () => {
      scrollPositions.set(pathname, window.scrollY);
    };
  }, [pathname, navigationType]);
}
