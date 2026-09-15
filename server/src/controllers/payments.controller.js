import { Payment, Expert, User } from "../models/index.js";
import { hasPaymentProviderConfig } from "../config/paymentProvider.js";
import { notify } from "../lib/notify.js";

const PURPOSES = ["expert_consultation", "priority_review", "listing_boost", "platform_fee"];

// POST /api/payments  { amount, purpose, recipient_expert_id?, reference_type?, reference_id? }
export async function create(req, res) {
  try {
    const { amount, purpose, recipient_expert_id, reference_type, reference_id } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: "A valid amount is required" });
    }
    if (!PURPOSES.includes(purpose)) {
      return res.status(400).json({ success: false, message: "Invalid payment purpose" });
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

    // No gateway is connected yet (see config/paymentProvider.js) - the
    // payment record is real and enters the same review workflow it would
    // with a real provider, it just starts (and stays) "pending" until an
    // admin reconciles it manually, instead of a webhook flipping it to
    // "completed" automatically.
    const payment = await Payment.create({
      payer_id: req.user.sub,
      recipient_type,
      recipient_id,
      amount,
      purpose,
      reference_type: reference_type || null,
      reference_id: reference_id || null,
      status: "pending",
    });

    res.status(201).json({
      success: true,
      data: {
        payment,
        gatewayConnected: hasPaymentProviderConfig,
        message: hasPaymentProviderConfig
          ? undefined
          : "Payment recorded as pending. No payment gateway is connected yet, so this won't actually charge anything - an admin will reconcile it manually for now.",
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
    const { status } = req.body;
    if (!["pending", "completed", "failed", "refunded"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const payment = await Payment.findByPk(req.params.id);
    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    payment.status = status;
    payment.updated_at = new Date();
    await payment.save();

    notify(req.app.get("io"), payment.payer_id, {
      type: "payment_status_changed",
      title: `Payment ${status}`,
      body: `Your ${payment.purpose.replace("_", " ")} payment of ${payment.currency} ${Number(payment.amount).toLocaleString()} is now ${status}.`,
      link: "/payments",
    }).catch(() => {});

    res.json({ success: true, data: payment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to update payment" });
  }
}
