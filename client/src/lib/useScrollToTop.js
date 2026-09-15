import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Since this is a single-page app, the browser never does its normal
// "new page starts scrolled to top" behavior on its own - this restores it.
export function useScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }, [pathname]);
}
