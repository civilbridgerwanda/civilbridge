import { getIntegrations } from "../../config/integrations.js";

/**
 * Layer 2 provider: hands a job to an n8n workflow through its Webhook node.
 *
 * n8n should use the Webhook node's "Respond Immediately" mode and report
 * back later through our callback (POST /api/agent/callback) - estimation and
 * drawing generation take far longer than an HTTP request should stay open.
 * See docs/N8N_AGENT_INTEGRATION.md for the exact request/response contract.
 *
 * Provider interface (every agent implementation must match this):
 *   name                 string, matches AGENT_PROVIDER
 *   dispatch(request)    send the job; resolves { externalRef } once the
 *                        agent has ACCEPTED it (not finished it), or throws
 */
export const n8nProvider = {
  name: "n8n",

  async dispatch(request) {
    const { webhookUrl, webhookSecret, timeoutMs } = getIntegrations().agent.n8n;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CivilBridge-Secret": webhookSecret,
          "User-Agent": "CivilBridge-Agent/1",
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`n8n webhook answered HTTP ${response.status}`);

      // "Respond Immediately" returns something like { message: "Workflow
      // was started" }; a Respond-to-Webhook node can return an execution id.
      let externalRef = null;
      try {
        const body = await response.json();
        const ref = body?.execution_id ?? body?.executionId ?? body?.id;
        if (ref != null) externalRef = String(ref).slice(0, 120);
      } catch {
        /* an empty/non-JSON body is fine */
      }
      return { externalRef };
    } catch (err) {
      // Never let the URL/secret leak into logs or the stored error.
      if (err.name === "AbortError") throw new Error(`n8n did not answer within ${timeoutMs}ms`);
      throw new Error(err.message?.startsWith("n8n") ? err.message : "Could not reach the n8n webhook");
    } finally {
      clearTimeout(timer);
    }
  },
};
