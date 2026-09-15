import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

export const PlanInquiry = sequelize.define(
  "PlanInquiry",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    plan_id: { type: DataTypes.UUID, allowNull: false },
    full_name: { type: DataTypes.STRING(150), allowNull: false },
    email: { type: DataTypes.STRING(150), allowNull: false },
    whatsapp: { type: DataTypes.STRING(30), allowNull: false },
    message: { type: DataTypes.TEXT },
    status: { type: DataTypes.ENUM("new", "contacted", "closed"), defaultValue: "new" },
    assigned_expert_id: { type: DataTypes.UUID },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "plan_inquiries",
    timestamps: false,
  }
);
