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
    provider: { type: DataTypes.STRING(50) },
    provider_reference: { type: DataTypes.STRING(255) },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "payments",
    timestamps: false,
  }
);
