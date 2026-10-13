/**
 * Every external endpoint and secret the app can talk to, read in ONE place.
 *
 * Nothing else in the codebase touches process.env for these - controllers
 * ask this module. That keeps three promises:
 *   1. Secrets only ever come from the environment (server/.env, or the
 *      process manager on the VPS). Never the database, never the client.
 *   2. Storing a key does not switch anything on. Each integration has an
 *      explicit on-switch (AGENT_ENABLED, CHAT_PROVIDER=llm), so keys can sit
 *      here "idle" until the live endpoints are ready, then one flag turns
 *      the integration on.
 *   3. The admin UI can show what's wired up without ever seeing a value -
 *      integrationStatus() returns booleans and names only.
 *
 * Read lazily (a function, not a top-level const): index.js calls
 * dotenv.config() *after* its imports are hoisted, so a value captured at
 * import time would be empty.
 */

const truthy = (value) => ["1", "true", "yes", "on"].includes(String(value ?? "").trim().toLowerCase());

export function getIntegrations(env = process.env) {
  return {
    // Public origin of THIS server - what the agent is told to call back and
    // where relative /uploads paths are resolved to absolute links.
    serverUrl: (env.SERVER_URL || `http://localhost:${env.PORT || 5000}`).replace(/\/+$/, ""),

    // Layer 2: the heavy-duty agent (estimation, drawings, DB/tool work).
    agent: {
      enabled: truthy(env.AGENT_ENABLED),
      provider: (env.AGENT_PROVIDER || "n8n").trim().toLowerCase(),
      n8n: {
        webhookUrl: (env.N8N_WEBHOOK_URL || "").trim(),
        // Sent to n8n on every request (header) so n8n can reject strangers.
        webhookSecret: env.N8N_WEBHOOK_SECRET || "",
        // n8n signs its replies with this (HMAC-SHA256 of the raw body).
        callbackSecret: env.N8N_CALLBACK_SECRET || "",
        timeoutMs: Number(env.N8N_TIMEOUT_MS) || 15000,
      },
    },

    // Layer 1: the lightweight conversational model in the chat UI.
    chat: {
      provider: (env.CHAT_PROVIDER || "rules").trim().toLowerCase(),
      llm: {
        apiKey: env.CHAT_LLM_API_KEY || "",
        model: (env.CHAT_LLM_MODEL || "claude-haiku-4-5-20251001").trim(),
        baseUrl: (env.CHAT_LLM_BASE_URL || "https://api.anthropic.com").replace(/\/+$/, ""),
      },
    },
  };
}

// What's missing for each integration to actually run (empty = ready).
function agentMissing(cfg) {
  if (cfg.agent.provider !== "n8n") return [];
  const missing = [];
  if (!cfg.agent.n8n.webhookUrl) missing.push("N8N_WEBHOOK_URL");
  if (!cfg.agent.n8n.webhookSecret) missing.push("N8N_WEBHOOK_SECRET");
  if (!cfg.agent.n8n.callbackSecret) missing.push("N8N_CALLBACK_SECRET");
  return missing;
}

function chatMissing(cfg) {
  return cfg.chat.provider === "llm" && !cfg.chat.llm.apiKey ? ["CHAT_LLM_API_KEY"] : [];
}

// True only when the agent is switched on AND fully configured. This is the
// single check the rest of the app uses to decide "dispatch now" vs "leave
// it queued".
export function isAgentActive(env = process.env) {
  const cfg = getIntegrations(env);
  return cfg.agent.enabled && agentMissing(cfg).length === 0;
}

export function isChatLlmActive(env = process.env) {
  const cfg = getIntegrations(env);
  return cfg.chat.provider === "llm" && chatMissing(cfg).length === 0;
}

/**
 * Safe-to-show summary for the admin dashboard. State is one of:
 *   off            - switched off and nothing stored
 *   idle           - keys are stored but the switch is off (the "ready, waiting" state)
 *   active         - switched on and complete
 *   misconfigured  - switched on but keys missing
 */
export function integrationStatus(env = process.env) {
  const cfg = getIntegrations(env);

  const agentMissingKeys = agentMissing(cfg);
  const agentKeysPresent = cfg.agent.n8n.webhookUrl || cfg.agent.n8n.webhookSecret || cfg.agent.n8n.callbackSecret;
  let agentState = "off";
  if (cfg.agent.enabled) agentState = agentMissingKeys.length ? "misconfigured" : "active";
  else if (agentKeysPresent) agentState = "idle";

  const chatMissingKeys = chatMissing(cfg);
  const chatUsingLlm = cfg.chat.provider === "llm";
  let chatState = "active"; // the built-in rules responder is always available
  if (chatUsingLlm && chatMissingKeys.length) chatState = "misconfigured";
  else if (!chatUsingLlm && cfg.chat.llm.apiKey) chatState = "idle";

  return [
    {
      key: "agent",
      label: "Backend AI agent (Layer 2)",
      provider: cfg.agent.provider,
      state: agentState,
      switch: "AGENT_ENABLED",
      missing: agentMissingKeys,
      detail:
        agentState === "active"
          ? `Routing estimate analysis and chat tasks to ${cfg.agent.provider}.`
          : agentState === "idle"
            ? "Keys are stored. Set AGENT_ENABLED=true to start sending work to the agent."
            : agentState === "misconfigured"
              ? "Switched on, but required keys are missing - jobs stay queued."
              : "Not configured. Requests are queued for the expert team to handle by hand.",
    },
    {
      key: "chat",
      label: "Chat assistant (Layer 1)",
      provider: cfg.chat.provider,
      state: chatState,
      switch: "CHAT_PROVIDER",
      missing: chatMissingKeys,
      detail: chatUsingLlm
        ? chatMissingKeys.length
          ? "CHAT_PROVIDER=llm but no API key - falling back to the built-in responder."
          : `Answering everyday questions with ${cfg.chat.llm.model}.`
        : cfg.chat.llm.apiKey
          ? "An API key is stored. Set CHAT_PROVIDER=llm to use it."
          : "Using the built-in rule-based responder.",
    },
  ];
}
