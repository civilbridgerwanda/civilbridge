import { Op } from "sequelize";
import { sequelize, User, Estimate } from "../models/index.js";
import { DRAWINGS_ADDON_PRICE, ESTIMATE_PRICES, tierFor } from "../config/pricing.js";

/**
 * Who may submit an estimate, and how it's paid for.
 *
 * Each estimate is covered by exactly one of:
 *   quota  - the account level's monthly allowance (unlimited for Professional
 *            and Business, so it never blocks them)
 *   paid   - one of the estimate credits the person bought pay-as-you-go
 *   admin  - staff, who are never limited
 * Drawings are always a paid extra (one drawing credit per estimate that asks
 * for them), whatever the account level.
 *
 * withAllowance() does the check, takes the credit and runs the caller's
 * "create the estimate" step inside ONE database transaction, with the user
 * row locked. That's what makes it safe: a failure while creating the
 * estimate rolls the credit back, and two requests arriving at the same
 * instant can't both spend the last one.
 */

export class AllowanceError extends Error {
  constructor(code, message, status = 402) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export const priceList = () => ({
  currency: "RWF",
  estimate: ESTIMATE_PRICES.estimate,
  estimate_with_drawings: ESTIMATE_PRICES.estimate_with_drawings,
  drawings_addon: DRAWINGS_ADDON_PRICE,
});

/** The current calendar month: what "per month" means everywhere. */
export function monthWindow(now = new Date()) {
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
  };
}

async function usedThisMonth(userId, transaction) {
  return Estimate.count({
    where: { user_id: userId, funding: "quota", created_at: { [Op.gte]: monthWindow().start } },
    transaction,
  });
}

/** A read-only summary for the UI (GET /auth/me). Spends nothing. */
export async function getAllowance(user) {
  const tier = tierFor(user.plan);
  const unlimited = user.role === "admin" || tier.estimates_per_month === null;
  const used = unlimited ? null : await usedThisMonth(user.id);
  return {
    plan: user.plan,
    unlimited,
    monthly_limit: unlimited ? null : tier.estimates_per_month,
    used,
    remaining: unlimited ? null : Math.max(0, tier.estimates_per_month - used),
    resets_at: monthWindow().end,
    paid_credits: user.estimate_credits,
    drawing_credits: user.drawing_credits,
    priority: tier.priority_review,
    prices: priceList(),
  };
}

/**
 * @param work async ({ user, funding, priority, transaction }) => result - creates
 *             the estimate. Anything it throws rolls back the credit it took.
 */
export async function withAllowance(userId, { drawings = false } = {}, work) {
  return sequelize.transaction(async (transaction) => {
    const user = await User.findByPk(userId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!user) throw new AllowanceError("ACCOUNT_NOT_FOUND", "Account not found", 404);

    const tier = tierFor(user.plan);
    const isAdmin = user.role === "admin";

    if (drawings && !isAdmin && user.drawing_credits < 1) {
      throw new AllowanceError(
        "NEEDS_DRAWINGS_CREDIT",
        `The CAD drawing set is a paid add-on (RWF ${DRAWINGS_ADDON_PRICE.toLocaleString()}). Add it, then submit again - or submit without drawings.`
      );
    }

    let funding;
    if (isAdmin) {
      funding = "admin";
    } else if (tier.estimates_per_month === null) {
      funding = "quota";
    } else if ((await usedThisMonth(user.id, transaction)) < tier.estimates_per_month) {
      funding = "quota";
    } else if (user.estimate_credits > 0) {
      user.estimate_credits -= 1;
      funding = "paid";
    } else {
      throw new AllowanceError(
        "OUT_OF_ESTIMATES",
        `You've used this month's ${tier.estimates_per_month === 1 ? "free estimate" : `${tier.estimates_per_month} free estimates`}. Buy an estimate to continue, or upgrade for more.`
      );
    }

    if (drawings && !isAdmin) user.drawing_credits -= 1;
    if (funding === "paid" || (drawings && !isAdmin)) await user.save({ transaction });

    return work({ user, funding, priority: !isAdmin && tier.priority_review, transaction });
  });
}
