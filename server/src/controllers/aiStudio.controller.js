import { randomBytes, randomUUID } from "crypto";
import { AiConversation, AiMessage, AgentJob, AgentDeliverable } from "../models/index.js";
import { converse, routeMessage, agentUnavailableReply, workingReply } from "../chat/index.js";
import { isAgentActive } from "../config/integrations.js";
import { createJob } from "../agent/jobs.js";
import { publicJob } from "../agent/payload.js";

const MESSAGE_MAX_LENGTH = 2000;
const HISTORY_LIMIT = 10;

// Chat can trigger a paid model call (Layer 1) or agent work (Layer 2), so a
// stuck key or a script shouldn't be able to fire it unbounded. Per process,
// in memory - enough to stop accidental floods; not a substitute for
// gateway-level limits on a multi-instance deployment.
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX_MESSAGES = 20;
const recentSends = new Map(); // userId -> [timestamps]
function isSendingTooFast(userId) {
  const now = Date.now();
  const recent = (recentSends.get(userId) || []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  recentSends.set(userId, recent);
  return recent.length > RATE_MAX_MESSAGES;
}

function titleFromMessage(message) {
  const firstLine = message.split("\n")[0].trim();
  return firstLine.length > 60 ? `${firstLine.slice(0, 57)}...` : firstLine || "New Conversation";
}

// Adds each message's agent job (status/progress) and any files it produced,
// so the chat can show "working on it", then the answer and its downloads.
async function withJobs(messages) {
  const plain = messages.map((m) => (m.toJSON ? m.toJSON() : m));
  const jobIds = plain.map((m) => m.job_id).filter(Boolean);
  if (!jobIds.length) return plain.map((m) => ({ ...m, job: null, deliverables: [] }));

  const [jobs, deliverables] = await Promise.all([
    AgentJob.findAll({ where: { id: jobIds } }),
    AgentDeliverable.findAll({
      where: { job_id: jobIds },
      order: [["created_at", "ASC"]],
      attributes: ["id", "job_id", "kind", "format", "label", "url"],
    }),
  ]);
  const jobById = new Map(jobs.map((j) => [j.id, j]));
  return plain.map((m) => ({
    ...m,
    job: m.job_id && jobById.has(m.job_id) ? publicJob(jobById.get(m.job_id)) : null,
    deliverables: m.job_id ? deliverables.filter((d) => d.job_id === m.job_id).map((d) => d.toJSON()) : [],
  }));
}

// GET /api/ai-studio/conversations
export async function listConversations(req, res) {
  try {
    const rows = await AiConversation.findAll({
      where: { user_id: req.user.sub },
      attributes: ["id", "title", "created_at", "updated_at"],
      order: [["updated_at", "DESC"]],
    });
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch conversations" });
  }
}

// GET /api/ai-studio/conversations/:id  (with messages)
export async function getConversation(req, res) {
  try {
    const conversation = await AiConversation.findOne({
      where: { id: req.params.id, user_id: req.user.sub },
      include: [{ model: AiMessage, as: "messages", attributes: ["id", "role", "content", "job_id", "created_at"] }],
      order: [[{ model: AiMessage, as: "messages" }, "created_at", "ASC"]],
    });
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }
    const data = conversation.toJSON();
    data.messages = await withJobs(conversation.messages);
    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch conversation" });
  }
}

// POST /api/ai-studio/conversations  (start a new, empty conversation)
export async function createConversation(req, res) {
  try {
    const conversation = await AiConversation.create({ title: "New Conversation", user_id: req.user.sub });
    res.status(201).json({ success: true, data: { ...conversation.toJSON(), messages: [] } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to create conversation" });
  }
}

// POST /api/ai-studio/conversations/:id/messages
//
// The hybrid chat's traffic controller (see ../chat/intent.js):
//   Layer 1 - answered right here, immediately.
//   Layer 2 - recorded as an agent job. The reply that comes back now is a
//             "working on it" message already linked to that job; when the
//             agent finishes, the SAME message is rewritten with the answer
//             (agent/jobs.js applyChatResult) and the client is pushed an
//             update. One message row per turn, so history stays ordered and
//             a reload mid-task still shows the right state.
export async function sendMessage(req, res) {
  try {
    const io = req.app.get("io");
    const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
    if (!message) {
      return res.status(400).json({ success: false, message: "Message is required" });
    }
    if (message.length > MESSAGE_MAX_LENGTH) {
      return res.status(400).json({ success: false, message: `Please keep messages under ${MESSAGE_MAX_LENGTH} characters.` });
    }
    if (isSendingTooFast(req.user.sub)) {
      return res.status(429).json({ success: false, message: "You're sending messages very quickly - give it a moment." });
    }

    const conversationId = req.params.id;
    const conversation = await AiConversation.findOne({
      where: { id: conversationId, user_id: req.user.sub },
    });
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    // Context for whoever answers: the last few turns, oldest first.
    const previous = await AiMessage.findAll({
      where: { conversation_id: conversationId },
      order: [["created_at", "DESC"]],
      limit: HISTORY_LIMIT,
      attributes: ["role", "content"],
    });
    const history = previous.reverse().map((m) => ({ role: m.role, content: m.content }));

    const userMessage = await AiMessage.create({
      conversation_id: conversationId,
      role: "user",
      content: message,
    });

    const route = routeMessage(message);
    let content;
    let job = null;
    let assistant;

    if (route.layer === 2 && isAgentActive()) {
      const jobId = randomUUID();
      assistant = await AiMessage.create({
        conversation_id: conversationId,
        role: "assistant",
        content: workingReply(route.intent),
        job_id: jobId,
      });
      try {
        job = await createJob(
          {
            id: jobId,
            kind: "chat_task",
            userId: req.user.sub,
            conversationId,
            input: { intent: route.intent, message, history },
          },
          io
        );
      } catch (err) {
        console.error("Could not create chat job:", err);
        assistant.job_id = null;
        assistant.content = agentUnavailableReply(route.intent);
        await assistant.save();
      }
    } else {
      content =
        route.layer === 2 ? agentUnavailableReply(route.intent) : (await converse({ message, history })).text;
      assistant = await AiMessage.create({ conversation_id: conversationId, role: "assistant", content });
    }

    let title = conversation.title;
    if (title === "New Conversation") {
      title = titleFromMessage(message);
      conversation.title = title;
    }
    conversation.updated_at = new Date();
    await conversation.save();

    res.json({
      success: true,
      data: {
        title,
        userMessage: { id: userMessage.id, role: "user", content: message },
        assistantMessage: {
          id: assistant.id,
          role: "assistant",
          content: assistant.content,
          job: job ? publicJob(job) : null,
          deliverables: [],
        },
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to send message" });
  }
}

// POST /api/ai-studio/conversations/:id/share
// Idempotent - returns the existing token if this conversation was already
// shared, rather than minting a new one (and orphaning the old link) every
// time someone clicks Share again.
export async function shareConversation(req, res) {
  try {
    const conversation = await AiConversation.findOne({
      where: { id: req.params.id, user_id: req.user.sub },
    });
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }
    if (!conversation.share_token) {
      conversation.share_token = randomBytes(12).toString("hex");
      await conversation.save();
    }
    res.json({ success: true, data: { share_token: conversation.share_token } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to share conversation" });
  }
}

// GET /api/ai-studio/shared/:token
// Public and read-only, on purpose - anyone with the link can view the
// transcript (that's the point of sharing it), but there's no way to reach
// this conversation's real id or post a reply through this route, so
// viewing it never grants any access to the owner's account. Agent files are
// deliberately not included: a share link shows the words, not the deliverables.
export async function getSharedConversation(req, res) {
  try {
    const conversation = await AiConversation.findOne({
      where: { share_token: req.params.token },
      attributes: ["id", "title", "created_at"],
      include: [{ model: AiMessage, as: "messages", attributes: ["id", "role", "content", "created_at"] }],
      order: [[{ model: AiMessage, as: "messages" }, "created_at", "ASC"]],
    });
    if (!conversation) {
      return res.status(404).json({ success: false, message: "This shared chat wasn't found - the link may be wrong or no longer active." });
    }
    res.json({ success: true, data: conversation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch shared conversation" });
  }
}
