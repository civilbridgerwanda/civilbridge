import { Conversation, Message } from "../models/index.js";
import { notify } from "./notify.js";

// Always stores/looks up the pair in a consistent order so (A,B) and (B,A)
// never create two separate conversations for the same two people.
function orderedPair(a, b) {
  return a < b ? [a, b] : [b, a];
}

export async function findOrCreateConversation(userIdA, userIdB) {
  const [user_a_id, user_b_id] = orderedPair(userIdA, userIdB);
  const [conversation] = await Conversation.findOrCreate({ where: { user_a_id, user_b_id } });
  return conversation;
}

/**
 * Starts (or reuses) a conversation between two users and drops an
 * opening message into it from `senderId`, notifying `recipientId` with a
 * live socket push + in-app notification. Used anywhere the app wants to
 * proactively connect two people - e.g. an expert/admin approving a
 * client's estimate.
 */
export async function startConversationWithMessage(io, { senderId, recipientId, content, notificationTitle }) {
  const conversation = await findOrCreateConversation(senderId, recipientId);

  const message = await Message.create({
    conversation_id: conversation.id,
    sender_id: senderId,
    content,
  });
  conversation.updated_at = new Date();
  await conversation.save();

  if (io) io.to(`conversation:${conversation.id}`).emit("message:new", message);

  await notify(io, recipientId, {
    type: "message_received",
    title: notificationTitle,
    body: content.slice(0, 140),
    link: `/messages/${conversation.id}`,
  });

  return conversation;
}
