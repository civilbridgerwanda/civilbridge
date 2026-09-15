import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

export const Notification = sequelize.define(
  "Notification",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: false },
    type: { type: DataTypes.STRING(50), allowNull: false },
    title: { type: DataTypes.STRING(200), allowNull: false },
    body: { type: DataTypes.TEXT },
    link: { type: DataTypes.STRING(255) },
    is_read: { type: DataTypes.BOOLEAN, defaultValue: false },
    created_at: { type: DataTypes.DATE(6), defaultValue: DataTypes.NOW },
  },
  {
    tableName: "notifications",
    timestamps: false,
  }
);
