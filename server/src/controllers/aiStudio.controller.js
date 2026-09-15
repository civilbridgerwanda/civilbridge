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
    const conversation = await AiConversation.findByPk(req.params.id, {
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
    const conversation = await AiConversation.create({ title: "New Conversation" });
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
    const conversation = await AiConversation.findByPk(conversationId);
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
