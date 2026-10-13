import { isChatLlmActive } from "../config/integrations.js";
import { llmReply } from "./providers/llm.js";
import { rulesReply } from "./providers/rules.js";

export { routeMessage, INTENTS } from "./intent.js";
export { agentUnavailableReply, workingReply } from "./providers/rules.js";

/**
 * Layer 1: answers an everyday message. Uses the language model when it's
 * switched on, and quietly falls back to the built-in responder if it isn't
 * or if the call fails - the user always gets an answer.
 */
export async function converse({ message, history = [] }) {
  if (isChatLlmActive()) {
    try {
      return { text: await llmReply({ message, history }), source: "llm" };
    } catch (err) {
      console.error("Chat model failed, using the built-in responder:", err.message);
    }
  }
  return { text: rulesReply(message), source: "rules" };
}
