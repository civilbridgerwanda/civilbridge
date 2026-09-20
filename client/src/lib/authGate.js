// Shared across Marketplace.jsx and Plans.jsx so dismissing the soft
// sign-in prompt on one doesn't make it pop up again on the other -
// sessionStorage so it comes back for a genuinely new visit/tab.
const KEY = "cb_auth_gate_dismissed";

export function isAuthGateDismissed() {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissAuthGate() {
  try {
    sessionStorage.setItem(KEY, "1");
  } catch {
    // Private browsing / storage disabled - the gate just reappears next
    // time, which is a fine fallback.
  }
}
