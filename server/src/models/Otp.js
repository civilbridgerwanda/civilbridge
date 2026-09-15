import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

export const Otp = sequelize.define(
  "Otp",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: false },
    code_hash: { type: DataTypes.STRING(255), allowNull: false },
    purpose: { type: DataTypes.ENUM("email_verification", "password_reset"), allowNull: false },
    expires_at: { type: DataTypes.DATE, allowNull: false },
    consumed_at: { type: DataTypes.DATE, allowNull: true },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "otps",
    timestamps: false,
  }
);
