import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";
import { jsonArrayField } from "./jsonArrayField.js";

export const Property = sequelize.define(
  "Property",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    owner_id: { type: DataTypes.UUID },
    title: { type: DataTypes.STRING(200), allowNull: false },
    description: { type: DataTypes.TEXT },
    property_type: { type: DataTypes.ENUM("house", "apartment", "land", "commercial"), allowNull: false },
    price: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
    currency: { type: DataTypes.STRING(10), defaultValue: "RWF" },
    city: { type: DataTypes.STRING(100) }, // legacy - see district/sector
    district: { type: DataTypes.STRING(100) },
    sector: { type: DataTypes.STRING(100) },
    size_sqm: { type: DataTypes.DECIMAL(10, 2) },
    bedrooms: { type: DataTypes.INTEGER },
    bathrooms: { type: DataTypes.INTEGER },
    image_url: { type: DataTypes.STRING(500) },
    images: jsonArrayField("images"),
    is_featured: { type: DataTypes.BOOLEAN, defaultValue: false },
    is_approved: { type: DataTypes.BOOLEAN, defaultValue: true },
    status: { type: DataTypes.ENUM("available", "pending", "sold"), defaultValue: "available" },
    // A listing with no reviews has NO rating - never a stored 0 or a leftover
    // default. Every place that serialises this model (lists, detail pages,
    // the admin views) therefore gets null until a real review exists.
    rating: {
      type: DataTypes.DECIMAL(2, 1),
      defaultValue: 0.0,
      get() {
        const count = this.getDataValue("review_count");
        const raw = this.getDataValue("rating");
        if (raw == null) return null;
        return count === undefined || count > 0 ? Number(raw) : null;
      },
    },
    review_count: { type: DataTypes.INTEGER, defaultValue: 0 },
    view_count: { type: DataTypes.INTEGER, defaultValue: 0 },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "properties",
    timestamps: false,
  }
);
