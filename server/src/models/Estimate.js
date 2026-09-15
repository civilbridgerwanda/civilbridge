import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

export const Estimate = sequelize.define(
  "Estimate",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID },
    project_name: { type: DataTypes.STRING(200), allowNull: false },
    project_type: { type: DataTypes.STRING(100) },
    description: { type: DataTypes.TEXT },
    estimated_cost: { type: DataTypes.DECIMAL(14, 2) },
    currency: { type: DataTypes.STRING(10), defaultValue: "RWF" },
    status: {
      type: DataTypes.ENUM("draft", "ai_generated", "under_review", "verified"),
      defaultValue: "draft",
    },
    reviewed_by: { type: DataTypes.UUID },
    assigned_expert_id: { type: DataTypes.UUID },
    attachment_url: { type: DataTypes.STRING(500) },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "estimates",
    timestamps: false,
  }
);

export const EstimateItem = sequelize.define(
  "EstimateItem",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    estimate_id: { type: DataTypes.UUID, allowNull: false },
    item_name: { type: DataTypes.STRING(200), allowNull: false },
    unit: { type: DataTypes.STRING(30) },
    quantity: { type: DataTypes.DECIMAL(12, 2) },
    unit_price: { type: DataTypes.DECIMAL(14, 2) },
    total_price: { type: DataTypes.DECIMAL(14, 2) },
  },
  {
    tableName: "estimate_items",
    timestamps: false,
  }
);

Estimate.hasMany(EstimateItem, { foreignKey: "estimate_id", as: "items" });
EstimateItem.belongsTo(Estimate, { foreignKey: "estimate_id" });
