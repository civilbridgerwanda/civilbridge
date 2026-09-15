import { Op } from "sequelize";
import { Conversation, Message, User } from "../models/index.js";
import { notify } from "../lib/notify.js";
import { findOrCreateConversation } from "../lib/conversations.js";

// GET /api/messages/support-contact
// Gives clients/experts someone to message for support without needing to
// know an admin's user ID - just picks the longest-standing admin account.
export async function getSupportContact(req, res) {
  try {
    const admin = await User.findOne({
      where: { role: "admin" },
      attributes: ["id", "full_name"],
      order: [["created_at", "ASC"]],
    });
    if (!admin) {
      return res.status(404).json({ success: false, message: "No support contact is available right now" });
    }
    res.json({ success: true, data: admin });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to find a support contact" });
  }
}

// GET /api/messages/conversations
export async function listConversations(req, res) {
  try {
    const userId = req.user.sub;
    const conversations = await Conversation.findAll({
      where: { [Op.or]: [{ user_a_id: userId }, { user_b_id: userId }] },
      // Only belongsTo includes here - both are simple joins Sequelize can
      // handle directly. Combining a `limit` on a hasMany include (like
      // "last message per conversation") with other aliased includes and
      // a top-level `order` is a known Sequelize footgun that can produce
      // invalid SQL depending on the MySQL/MariaDB version - fetched
      // separately below instead.
      include: [
        { model: User, as: "userA", attributes: ["id", "full_name"] },
        { model: User, as: "userB", attributes: ["id", "full_name"] },
      ],
      order: [["updated_at", "DESC"]],
    });

    const conversationIds = conversations.map((c) => c.id);
    const recentMessages = conversationIds.length
      ? await Message.findAll({
          where: { conversation_id: conversationIds },
          order: [["created_at", "DESC"]],
        })
      : [];
    // First occurrence per conversation_id is the most recent, since the
    // query above is already ordered newest-first.
    const lastMessageByConversation = {};
    for (const m of recentMessages) {
      if (!(m.conversation_id in lastMessageByConversation)) {
        lastMessageByConversation[m.conversation_id] = m;
      }
    }

    const data = await Promise.all(
      conversations.map(async (c) => {
        const other = c.user_a_id === userId ? c.userB : c.userA;
        const unreadCount = await Message.count({
          where: { conversation_id: c.id, sender_id: { [Op.ne]: userId }, is_read: false },
        });
        return {
          id: c.id,
          otherUser: other ? { id: other.id, full_name: other.full_name } : null,
          lastMessage: lastMessageByConversation[c.id]?.content || null,
          updatedAt: c.updated_at,
          unreadCount,
        };
      })
    );

    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch conversations" });
  }
}

// POST /api/messages/conversations  { participant_id }
export async function startConversation(req, res) {
  try {
    const { participant_id } = req.body;
    if (!participant_id || participant_id === req.user.sub) {
      return res.status(400).json({ success: false, message: "A valid participant_id is required" });
    }

    const other = await User.findByPk(participant_id);
    if (!other) {
      return res.status(404).json({ success: false, message: "That user doesn't exist" });
    }

    const conversation = await findOrCreateConversation(req.user.sub, participant_id);

    res.status(201).json({ success: true, data: { id: conversation.id } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to start conversation" });
  }
}

// GET /api/messages/conversations/:id
export async function getConversation(req, res) {
  try {
    const conversation = await Conversation.findByPk(req.params.id, {
      include: [
        { model: User, as: "userA", attributes: ["id", "full_name"] },
        { model: User, as: "userB", attributes: ["id", "full_name"] },
        { model: Message, as: "messages", order: [["created_at", "ASC"]] },
      ],
    });
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }
    if (![conversation.user_a_id, conversation.user_b_id].includes(req.user.sub)) {
      return res.status(403).json({ success: false, message: "Not your conversation" });
    }

    // Mark the other participant's messages as read now that this user
    // has opened the thread.
    await Message.update(
      { is_read: true },
      { where: { conversation_id: conversation.id, sender_id: { [Op.ne]: req.user.sub }, is_read: false } }
    );

    const other = conversation.user_a_id === req.user.sub ? conversation.userB : conversation.userA;
    res.json({
      success: true,
      data: {
        id: conversation.id,
        otherUser: other ? { id: other.id, full_name: other.full_name } : null,
        messages: conversation.messages,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch conversation" });
  }
}

// POST /api/messages/conversations/:id/messages  { content }
export async function sendMessage(req, res) {
  try {
    const io = req.app.get("io");
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: "Message content is required" });
    }

    const conversation = await Conversation.findByPk(req.params.id);
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }
    if (![conversation.user_a_id, conversation.user_b_id].includes(req.user.sub)) {
      return res.status(403).json({ success: false, message: "Not your conversation" });
    }

    const message = await Message.create({
      conversation_id: conversation.id,
      sender_id: req.user.sub,
      content,
    });
    conversation.updated_at = new Date();
    await conversation.save();

    // Live update for anyone with this thread open right now...
    io.to(`conversation:${conversation.id}`).emit("message:new", message);

    // ...and a notification for the other participant even if they
    // don't have the thread open.
    const recipientId = conversation.user_a_id === req.user.sub ? conversation.user_b_id : conversation.user_a_id;
    const sender = await User.findByPk(req.user.sub);
    await notify(io, recipientId, {
      type: "message_received",
      title: `New message from ${sender?.full_name || "someone"}`,
      body: content.slice(0, 140),
      link: `/messages/${conversation.id}`,
    });

    res.status(201).json({ success: true, data: message });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to send message" });
  }
}
