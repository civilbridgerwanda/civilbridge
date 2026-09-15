/**
 * Pushes events into the GTM dataLayer. GTM is configured (in the Google Tag
 * Manager UI, not in code) to forward these to GA4 as pageview/click events.
 * This keeps analytics changes a no-deploy, GTM-console-only job.
 */
export function trackPageview(path, title) {
  if (typeof window === "undefined" || !window.dataLayer) return;
  window.dataLayer.push({
    event: "page_view",
    page_path: path,
    page_title: title,
  });
}

export function trackEvent(eventName, params = {}) {
  if (typeof window === "undefined" || !window.dataLayer) return;
  window.dataLayer.push({ event: eventName, ...params });
}
