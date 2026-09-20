import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

export const User = sequelize.define(
  "User",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    full_name: { type: DataTypes.STRING(150), allowNull: false },
    email: { type: DataTypes.STRING(150), allowNull: false, unique: true },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    role: { type: DataTypes.ENUM("client", "expert", "property_owner", "admin"), defaultValue: "client" },
    phone: { type: DataTypes.STRING(30) },
    email_verified: { type: DataTypes.BOOLEAN, defaultValue: false },
    is_suspended: { type: DataTypes.BOOLEAN, defaultValue: false },
    plan: { type: DataTypes.ENUM("starter", "professional", "business"), defaultValue: "starter" },
    credits_remaining: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 },
    credits_reset_at: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
    requested_plan: { type: DataTypes.ENUM("professional", "business"), allowNull: true, defaultValue: null },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "users",
    timestamps: false,
  }
);
