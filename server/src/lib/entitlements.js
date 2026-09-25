import { Payment, User, Plan } from "../models/index.js";
import { notify } from "./notify.js";

// What a client is allowed to do is derived from two things, both of which
// change automatically when a payment is completed - nobody has to flip a
// switch by hand afterwards:
//   1. their subscription tier (User.plan) - set by a completed
//      "plan_upgrade" payment
//   2. per-item purchases - a completed "plan_license" payment for a
//      specific plan is that user's licence to download it
//
// hasPlanAccess() is the one place that decides whether someone may have a
// plan's full deliverable, so the API, the UI flags, and anything added
// later all agree.

export async function hasPlanLicense(userId, planId) {
  const payment = await Payment.findOne({
    where: {
      payer_id: userId,
      purpose: "plan_license",
      reference_type: "plan",
      reference_id: planId,
      status: "completed",
    },
    attributes: ["id"],
  });
  return Boolean(payment);
}

export async function hasPendingPlanLicense(userId, planId) {
  const payment = await Payment.findOne({
    where: {
      payer_id: userId,
      purpose: "plan_license",
      reference_type: "plan",
      reference_id: planId,
      status: "pending",
    },
    attributes: ["id"],
  });
  return Boolean(payment);
}

export async function hasPlanAccess(userId, planId) {
  const user = await User.findByPk(userId, { attributes: ["id", "role", "plan"] });
  if (!user) return false;
  if (user.role === "admin") return true;
  if (user.plan !== "starter") return true;
  return hasPlanLicense(userId, planId);
}

// Called by the payments controller right after a payment's status
// changes. `previousStatus` makes it idempotent: flipping "completed" ->
// "completed" (double click, retried webhook later) grants nothing twice,
// and only a genuine transition into or out of "completed" has any effect.
export async function applyPaymentTransition(payment, previousStatus, io) {
  const wasCompleted = previousStatus === "completed";
  const isCompleted = payment.status === "completed";
  if (wasCompleted === isCompleted) return;

  if (payment.purpose === "plan_upgrade" && payment.target_plan) {
    const user = await User.findByPk(payment.payer_id);
    if (!user) return;

    if (isCompleted) {
      user.plan = payment.target_plan;
      user.requested_plan = null;
      await user.save();
      await notify(io, user.id, {
        type: "plan_upgraded",
        title: `You're now on the ${payment.target_plan} plan`,
        body: "Your payment was confirmed and your new limits are active right now.",
        link: "/settings",
      }).catch(() => {});
    } else if (user.plan === payment.target_plan) {
      // A completed upgrade later refunded/failed: drop back to the free
      // tier, but only if they're still on the tier this payment bought - if
      // an admin already moved them somewhere else, that decision stands.
      user.plan = "starter";
      await user.save();
      await notify(io, user.id, {
        type: "plan_downgraded",
        title: "Your plan was changed",
        body: "Your payment was reversed, so your account is back on the Starter plan.",
        link: "/settings",
      }).catch(() => {});
    }
  }

  if (payment.purpose === "plan_license" && payment.reference_id) {
    const plan = await Plan.findByPk(payment.reference_id, { attributes: ["title"] });
    await notify(io, payment.payer_id, {
      type: isCompleted ? "plan_license_granted" : "plan_license_revoked",
      title: isCompleted ? "Your download is unlocked" : "Your plan access was removed",
      body: isCompleted
        ? `You can now download everything for "${plan?.title || "your plan"}".`
        : `Your payment for "${plan?.title || "this plan"}" was reversed, so the download is locked again.`,
      link: `/plans/${payment.reference_id}`,
    }).catch(() => {});
  }
}
