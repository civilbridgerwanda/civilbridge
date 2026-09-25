import { Payment, Expert, User, Plan } from "../models/index.js";
import { hasPaymentProviderConfig } from "../config/paymentProvider.js";
import { PLAN_PRICES, ESTIMATE_BUNDLE_MULTIPLIER, PAYMENT_METHODS, SELF_SERVE_TIERS } from "../config/pricing.js";
import { sendMail } from "../config/mailer.js";
import { paymentReceiptEmail, paymentAlertEmail, paymentConfirmedEmail } from "../config/emailTemplates.js";
import { notify } from "../lib/notify.js";
import { hasPlanAccess, hasPendingPlanLicense, applyPaymentTransition } from "../lib/entitlements.js";

// The first four are the older free-form ledger entries; the last two are
// tied to a real purchase and drive automatic access changes when they're
// marked completed (see lib/entitlements.js).
const LEGACY_PURPOSES = ["expert_consultation", "priority_review", "listing_boost", "platform_fee"];
const PURCHASE_PURPOSES = ["plan_upgrade", "plan_license"];
const PURPOSES = [...LEGACY_PURPOSES, ...PURCHASE_PURPOSES];

// Who gets alerted that a payment needs verifying. FINANCE_EMAIL (one or
// several comma-separated addresses) lets the business route this to
// whoever actually handles money; without it, it goes to the admin
// accounts so alerts work out of the box.
async function financeRecipients() {
  if (process.env.FINANCE_EMAIL) {
    return process.env.FINANCE_EMAIL.split(",").map((e) => e.trim()).filter(Boolean);
  }
  const admins = await User.findAll({ where: { role: "admin" }, attributes: ["email"] });
  return admins.map((a) => a.email);
}

async function alertTeam(io, payment, payer) {
  const [recipients, admins] = await Promise.all([
    financeRecipients(),
    User.findAll({ where: { role: "admin" }, attributes: ["id"] }),
  ]);

  const html = paymentAlertEmail({
    payerName: payer.full_name,
    payerEmail: payer.email,
    notes: payment.notes || payment.purpose.replace("_", " "),
    amount: payment.amount,
    currency: payment.currency,
    method: payment.payment_method,
    reference: payment.provider_reference,
  });
  for (const to of recipients) {
    sendMail({ to, subject: `New payment to verify - ${payment.currency} ${Number(payment.amount).toLocaleString()} from ${payer.full_name}`, html }).catch(() => {});
  }
  for (const admin of admins) {
    notify(io, admin.id, {
      type: "payment_submitted",
      title: "New payment to verify",
      body: `${payer.full_name} - ${payment.notes || payment.purpose.replace("_", " ")} (${payment.currency} ${Number(payment.amount).toLocaleString()})`,
      link: "/admin?tab=Payments",
    }).catch(() => {});
  }
}

// Works out what a purchase-type payment actually costs and what it's for,
// entirely server-side. Returns { error } (with an HTTP status) if the
// request doesn't make sense.
async function priceThePurchase(userId, body) {
  const { purpose, target_plan, billing_period, reference_id, include_estimate } = body;

  if (purpose === "plan_upgrade") {
    if (!SELF_SERVE_TIERS.includes(target_plan)) {
      return { status: 400, error: "That plan can't be bought online - please contact us for a quote." };
    }
    const period = billing_period === "annual" ? "annual" : "monthly";
    const user = await User.findByPk(userId, { attributes: ["plan"] });
    if (user?.plan === target_plan) {
      return { status: 409, error: `You're already on the ${target_plan} plan.` };
    }
    const existing = await Payment.findOne({
      where: { payer_id: userId, purpose: "plan_upgrade", target_plan, status: "pending" },
      attributes: ["id"],
    });
    if (existing) {
      return { status: 409, error: "You already have a payment awaiting confirmation for this plan." };
    }
    return {
      amount: PLAN_PRICES[target_plan][period],
      target_plan,
      notes: `${target_plan[0].toUpperCase()}${target_plan.slice(1)} plan (${period})`,
      reference_type: "user_plan",
      reference_id: null,
    };
  }

  // plan_license
  const plan = reference_id ? await Plan.findByPk(reference_id, { attributes: ["id", "title", "license_price"] }) : null;
  if (!plan) return { status: 404, error: "Plan not found" };
  if (!plan.license_price) {
    return { status: 400, error: "This plan doesn't have an online price yet - please contact us." };
  }
  if (await hasPlanAccess(userId, plan.id)) {
    return { status: 409, error: "You already have access to this plan." };
  }
  if (await hasPendingPlanLicense(userId, plan.id)) {
    return { status: 409, error: "You already have a payment awaiting confirmation for this plan." };
  }
  const withEstimate = Boolean(include_estimate);
  const base = Number(plan.license_price);
  return {
    amount: withEstimate ? Math.round(base * ESTIMATE_BUNDLE_MULTIPLIER) : base,
    notes: `${plan.title} - ${withEstimate ? "drawing pack + cost estimate" : "drawing pack download"}`,
    reference_type: "plan",
    reference_id: plan.id,
  };
}

// POST /api/payments
//   legacy:   { amount, purpose, recipient_expert_id?, payment_method? }
//   purchase: { purpose: "plan_upgrade", target_plan, billing_period, payment_method, provider_reference? }
//             { purpose: "plan_license", reference_id (plan id), include_estimate?, payment_method, provider_reference? }
export async function create(req, res) {
  try {
    const io = req.app.get("io");
    const { amount, purpose, recipient_expert_id, payment_method, provider_reference } = req.body;

    if (!PURPOSES.includes(purpose)) {
      return res.status(400).json({ success: false, message: "Invalid payment purpose" });
    }
    if (payment_method && !PAYMENT_METHODS.includes(payment_method)) {
      return res.status(400).json({ success: false, message: "Invalid payment method" });
    }

    let values;
    if (PURCHASE_PURPOSES.includes(purpose)) {
      if (!payment_method) {
        return res.status(400).json({ success: false, message: "Please choose how you're paying" });
      }
      const priced = await priceThePurchase(req.user.sub, req.body);
      if (priced.error) {
        return res.status(priced.status).json({ success: false, message: priced.error });
      }
      values = { recipient_type: "platform", recipient_id: null, ...priced };
    } else {
      if (!amount || Number(amount) <= 0) {
        return res.status(400).json({ success: false, message: "A valid amount is required" });
      }
      let recipient_type = "platform";
      let recipient_id = null;
      if (recipient_expert_id) {
        const expert = await Expert.findByPk(recipient_expert_id);
        if (!expert) {
          return res.status(404).json({ success: false, message: "Recipient expert not found" });
        }
        recipient_type = "expert";
        recipient_id = expert.id;
      }
      values = { amount, recipient_type, recipient_id, reference_type: null, reference_id: null };
    }

    // No gateway is connected yet (see config/paymentProvider.js) - the
    // payment record is real and enters the same review workflow it would
    // with a real provider: it starts "pending", the team is alerted, and
    // once they mark it completed the client's access changes by itself.
    // A connected gateway's webhook would just do that last step instead.
    const payment = await Payment.create({
      payer_id: req.user.sub,
      purpose,
      payment_method: payment_method || null,
      provider_reference: provider_reference ? String(provider_reference).slice(0, 255) : null,
      status: "pending",
      ...values,
    });

    if (purpose === "plan_upgrade") {
      await User.update({ requested_plan: values.target_plan }, { where: { id: req.user.sub } });
    }

    if (PURCHASE_PURPOSES.includes(purpose)) {
      const payer = await User.findByPk(req.user.sub, { attributes: ["id", "full_name", "email"] });
      sendMail({
        to: payer.email,
        subject: "We've received your payment request",
        html: paymentReceiptEmail({
          fullName: payer.full_name.split(" ")[0],
          notes: payment.notes,
          amount: payment.amount,
          currency: payment.currency,
          method: payment.payment_method,
          reference: payment.provider_reference,
        }),
      }).catch(() => {});
      alertTeam(io, payment, payer).catch((err) => console.error("Failed to alert team about payment:", err));
    }

    res.status(201).json({
      success: true,
      data: {
        payment,
        gatewayConnected: hasPaymentProviderConfig,
        message: hasPaymentProviderConfig
          ? undefined
          : "Payment recorded as pending. Our team will confirm it and your access will unlock automatically.",
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to create payment" });
  }
}

// GET /api/payments/mine
export async function mine(req, res) {
  try {
    const payments = await Payment.findAll({
      where: { payer_id: req.user.sub },
      order: [["created_at", "DESC"]],
    });
    res.json({ success: true, data: payments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch your payments" });
  }
}

// GET /api/payments/received  (for experts: payments where they're the recipient)
export async function received(req, res) {
  try {
    const expert = await Expert.findOne({ where: { user_id: req.user.sub } });
    if (!expert) {
      return res.status(403).json({ success: false, message: "No expert profile found for this account" });
    }
    const payments = await Payment.findAll({
      where: { recipient_type: "expert", recipient_id: expert.id },
      include: [{ model: User, as: "payer", attributes: ["full_name", "email"] }],
      order: [["created_at", "DESC"]],
    });
    res.json({ success: true, data: payments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch received payments" });
  }
}

// GET /api/admin/payments
export async function listAll(req, res) {
  try {
    const { status } = req.query;
    const where = status && status !== "all" ? { status } : {};
    const payments = await Payment.findAll({
      where,
      include: [{ model: User, as: "payer", attributes: ["full_name", "email"] }],
      order: [["created_at", "DESC"]],
      limit: 200,
    });
    res.json({ success: true, data: payments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch payments" });
  }
}

// PATCH /api/admin/payments/:id/status  { status }
export async function updateStatus(req, res) {
  try {
    const io = req.app.get("io");
    const { status } = req.body;
    if (!["pending", "completed", "failed", "refunded"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const payment = await Payment.findByPk(req.params.id);
    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    const previousStatus = payment.status;
    payment.status = status;
    payment.updated_at = new Date();
    await payment.save();

    // The automatic part: flipping to "completed" (or reversing it) changes
    // what the payer is allowed to do, with no second manual step.
    await applyPaymentTransition(payment, previousStatus, io);

    notify(io, payment.payer_id, {
      type: "payment_status_changed",
      title: `Payment ${status}`,
      body: `Your ${(payment.notes || payment.purpose.replace("_", " "))} payment of ${payment.currency} ${Number(payment.amount).toLocaleString()} is now ${status}.`,
      link: "/payments",
    }).catch(() => {});

    if (status === "completed" && previousStatus !== "completed" && PURCHASE_PURPOSES.includes(payment.purpose)) {
      const payer = await User.findByPk(payment.payer_id, { attributes: ["full_name", "email"] });
      if (payer) {
        sendMail({
          to: payer.email,
          subject: payment.purpose === "plan_upgrade" ? "Your plan is active" : "Your download is unlocked",
          html: paymentConfirmedEmail({
            fullName: payer.full_name.split(" ")[0],
            notes: payment.notes,
            amount: payment.amount,
            currency: payment.currency,
            purpose: payment.purpose,
            planId: payment.reference_id,
          }),
        }).catch(() => {});
      }
    }

    res.json({ success: true, data: payment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to update payment" });
  }
}
