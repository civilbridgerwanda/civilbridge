import { randomBytes } from "crypto";
import { AiConversation, AiMessage } from "../models/index.js";
import { generateReply } from "../lib/aiReply.js";

function titleFromMessage(message) {
  const firstLine = message.split("\n")[0].trim();
  return firstLine.length > 60 ? `${firstLine.slice(0, 57)}...` : firstLine || "New Conversation";
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
      include: [{ model: AiMessage, as: "messages", attributes: ["id", "role", "content", "created_at"] }],
      order: [[{ model: AiMessage, as: "messages" }, "created_at", "ASC"]],
    });
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }
    res.json({ success: true, data: conversation });
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
export async function sendMessage(req, res) {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: "Message is required" });
    }

    const conversationId = req.params.id;
    const conversation = await AiConversation.findOne({
      where: { id: conversationId, user_id: req.user.sub },
    });
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    const userMessage = await AiMessage.create({
      conversation_id: conversationId,
      role: "user",
      content: message,
    });

    const replyText = generateReply(message);
    const assistantMessage = await AiMessage.create({
      conversation_id: conversationId,
      role: "assistant",
      content: replyText,
    });

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
        assistantMessage: { id: assistantMessage.id, role: "assistant", content: replyText },
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
// viewing it never grants any access to the owner's account.
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
