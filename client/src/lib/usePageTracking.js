import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackPageview } from "./analytics";

// Drop this once in App.jsx. Every route change (Home -> Marketplace ->
// Experts, etc.) fires a page_view into GTM's dataLayer, so GA4 gets an
// accurate picture even though this is a single-page app with no real
// browser page reloads.
export function usePageTracking() {
  const location = useLocation();

  useEffect(() => {
    trackPageview(location.pathname, document.title);
  }, [location]);
}
