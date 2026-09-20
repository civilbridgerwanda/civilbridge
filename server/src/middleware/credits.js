import { User } from "../models/index.js";

// Freemium daily allowance. Tightened from 5 to 2 - still enough to feel
// what the AI features do, without giving away so much that upgrading
// stops feeling worth it. Tune this again once real usage data exists.
export const DAILY_FREE_CREDITS = 2;
const RESET_INTERVAL_MS = 24 * 60 * 60 * 1000;

// Resets the balance if 24h have passed since the last reset (or if this
// is the user's first time touching the counter at all).
function needsReset(user) {
  if (!user.credits_reset_at) return true;
  return Date.now() - new Date(user.credits_reset_at).getTime() >= RESET_INTERVAL_MS;
}

async function resetIfNeeded(user) {
  if (!needsReset(user)) return;
  user.credits_remaining = DAILY_FREE_CREDITS;
  user.credits_reset_at = new Date();
  await user.save();
}

// Gate for routes where the AI does real work on the user's behalf (BOQ
// generation, deep analysis) - not for browsing, casual AI Studio chat, or
// anything else. Paid plans (anything above "starter") bypass entirely,
// since the whole point of the credit wall is to make upgrading feel worth
// it, not to meter usage forever. Admins bypass unconditionally, plan
// aside - they need to test/verify gated features without burning credits
// or needing a paid plan on their own account.
export function requireCredits() {
  return async function (req, res, next) {
    try {
      const user = await User.findByPk(req.user.sub);
      if (!user) {
        return res.status(401).json({ success: false, message: "Not authenticated" });
      }

      if (user.role === "admin" || user.plan !== "starter") return next();

      await resetIfNeeded(user);

      if (user.credits_remaining <= 0) {
        return res.status(402).json({
          success: false,
          message: "You've used today's free credits. They reset in 24h, or upgrade to work without limits.",
          code: "OUT_OF_CREDITS",
          credits_reset_at: user.credits_reset_at,
        });
      }

      user.credits_remaining -= 1;
      await user.save();
      req.creditsRemaining = user.credits_remaining;
      next();
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to check credits" });
    }
  };
}

// Used by GET /api/auth/me so the frontend can show "3/5 credits left"
// without spending one - reading status should never itself cost a credit.
export async function peekCredits(user) {
  if (user.role === "admin" || user.plan !== "starter") return { unlimited: true };
  await resetIfNeeded(user);
  return {
    unlimited: false,
    remaining: user.credits_remaining,
    total: DAILY_FREE_CREDITS,
    reset_at: user.credits_reset_at,
  };
}
