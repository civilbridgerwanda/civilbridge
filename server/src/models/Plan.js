import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

export const Plan = sequelize.define(
  "Plan",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    title: { type: DataTypes.STRING(200), allowNull: false },
    plan_type: { type: DataTypes.ENUM("house", "apartment", "land", "commercial"), allowNull: false },
    price: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
    currency: { type: DataTypes.STRING(10), defaultValue: "RWF" },
    city: { type: DataTypes.STRING(100) },
    bedrooms: { type: DataTypes.INTEGER },
    bathrooms: { type: DataTypes.INTEGER },
    size_sqm: { type: DataTypes.DECIMAL(10, 2) },
    rating: { type: DataTypes.DECIMAL(2, 1), defaultValue: 0.0 },
    badge: { type: DataTypes.ENUM("new", "hot") },
    is_prime_location: { type: DataTypes.BOOLEAN, defaultValue: false },
    image_url: { type: DataTypes.STRING(500) },
    view_count: { type: DataTypes.INTEGER, defaultValue: 0 },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "plans",
    timestamps: false,
  }
);
