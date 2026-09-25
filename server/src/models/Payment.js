import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

export const Payment = sequelize.define(
  "Payment",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    payer_id: { type: DataTypes.UUID, allowNull: false },
    recipient_type: { type: DataTypes.ENUM("platform", "expert"), defaultValue: "platform" },
    recipient_id: { type: DataTypes.UUID },
    amount: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
    currency: { type: DataTypes.STRING(10), defaultValue: "RWF" },
    purpose: { type: DataTypes.STRING(150), allowNull: false },
    reference_type: { type: DataTypes.STRING(50) },
    reference_id: { type: DataTypes.UUID },
    status: { type: DataTypes.ENUM("pending", "completed", "failed", "refunded"), defaultValue: "pending" },
    // How the payer says they paid: mobile_money | bank_transfer | card.
    // Tells whoever reconciles the payment where to verify it (MoMo
    // statement vs bank statement vs card processor).
    payment_method: { type: DataTypes.STRING(30) },
    // For purpose "plan_upgrade": which tier this payment buys
    // (professional | business). reference_id is a UUID column so it can't
    // hold a tier name.
    target_plan: { type: DataTypes.STRING(30) },
    // Human-readable description of exactly what was bought, set
    // server-side, so the reconciler never has to guess from ids.
    notes: { type: DataTypes.STRING(500) },
    provider: { type: DataTypes.STRING(50) },
    // Transaction/receipt reference entered by the payer (MoMo transaction
    // id, bank slip number...) - or, once a gateway is connected, the
    // gateway's own reference.
    provider_reference: { type: DataTypes.STRING(255) },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "payments",
    timestamps: false,
  }
);
