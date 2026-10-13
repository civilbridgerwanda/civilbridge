import { getIntegrations, isAgentActive } from "../config/integrations.js";
import { n8nProvider } from "./providers/n8n.js";

/**
 * The seam between CivilBridge and whatever AI does the heavy work.
 *
 * Everything else in the app talks to this folder through jobs.js
 * (createJob / results / failures) and never imports a provider directly. To
 * swap n8n for a proprietary trained model later:
 *   1. add providers/<name>.js exporting { name, dispatch(request) }
 *      (see providers/n8n.js for the contract),
 *   2. register it below,
 *   3. set AGENT_PROVIDER=<name>.
 * Jobs, the database, the callback route, chat handoff and every screen stay
 * exactly as they are, because they only ever see the job/result shapes
 * defined in payload.js - not the provider.
 */
const providers = {
  [n8nProvider.name]: n8nProvider,
};

export function getProvider() {
  return providers[getIntegrations().agent.provider] || null;
}

export { isAgentActive };
