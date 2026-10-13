import { Op } from "sequelize";
import { Conversation, Expert, Property, User } from "../models/index.js";
import { tierFor } from "../config/pricing.js";
import { monthWindow } from "./allowance.js";

/**
 * The other account-level limits (estimates are in allowance.js): how many new
 * expert conversations a person can open per month, and how many properties
 * they can have listed at once. The numbers live in config/pricing.js.
 */

export class LimitError extends Error {
  constructor(limit, message) {
    super(message);
    this.limit = limit;
    this.status = 402;
    this.code = "LIMIT_REACHED";
  }
}

const isStaff = (user) => user.role === "admin";

/**
 * Called before opening a NEW conversation. Talking to support, or to anyone
 * who isn't an expert, is never limited; neither is re-opening a conversation
 * that already exists (the caller only asks when there isn't one).
 */
export async function assertCanStartExpertConversation(userId, otherUserId) {
  const [user, otherIsExpert] = await Promise.all([
    User.findByPk(userId, { attributes: ["id", "role", "plan"] }),
    Expert.count({ where: { user_id: otherUserId } }),
  ]);
  if (!user || isStaff(user) || !otherIsExpert) return;

  const limit = tierFor(user.plan).expert_conversations_per_month;
  if (limit === null) return;

  // Conversations THEY opened this month, with experts (an expert reaching
  // out to them doesn't count against them).
  const opened = await Conversation.findAll({
    where: { started_by: userId, created_at: { [Op.gte]: monthWindow().start } },
    attributes: ["user_a_id", "user_b_id"],
  });
  const others = opened.map((c) => (c.user_a_id === userId ? c.user_b_id : c.user_a_id));
  const used = others.length ? await Expert.count({ where: { user_id: others } }) : 0;

  if (used >= limit) {
    throw new LimitError(
      "expert_conversations",
      `Your plan includes ${limit} new expert conversations a month and you've used them. Upgrade for unlimited messaging, or reply to experts who've already written to you.`
    );
  }
}

/** Called before a new property is listed. */
export async function assertCanListProperty(userId) {
  const user = await User.findByPk(userId, { attributes: ["id", "role", "plan"] });
  if (!user || isStaff(user)) return;

  const limit = tierFor(user.plan).active_listings;
  if (limit === null) return;

  // Sold properties don't take up a slot.
  const active = await Property.count({ where: { owner_id: userId, status: { [Op.ne]: "sold" } } });
  if (active >= limit) {
    throw new LimitError(
      "active_listings",
      `Your plan includes ${limit} active ${limit === 1 ? "listing" : "listings"}. Remove or mark one as sold, or upgrade to list more.`
    );
  }
}
