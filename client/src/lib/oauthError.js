export function describeOauthError(code) {
  if (!code) return null;

  const [provider, reason] = code.split(/_(?=not_configured|failed|suspended)/);
  const label = { google: "Google", facebook: "Facebook", x: "X" }[provider] || provider;

  if (reason === "not_configured") {
    return `${label} sign-in isn't configured on the server yet.`;
  }
  if (reason === "suspended") {
    return "This account has been suspended. Contact support if you believe this is a mistake.";
  }
  if (reason === "failed") {
    return `${label} sign-in didn't complete. Please try again.`;
  }
  return `Something went wrong signing in with ${label}.`;
}
