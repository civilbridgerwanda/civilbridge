import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";
import { jsonArrayField } from "./jsonArrayField.js";

export const Plan = sequelize.define(
  "Plan",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    title: { type: DataTypes.STRING(200), allowNull: false },
    description: { type: DataTypes.TEXT },
    plan_type: { type: DataTypes.ENUM("house", "apartment", "land", "commercial"), allowNull: false },
    price: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
    currency: { type: DataTypes.STRING(10), defaultValue: "RWF" },
    city: { type: DataTypes.STRING(100) },
    bedrooms: { type: DataTypes.INTEGER },
    bathrooms: { type: DataTypes.INTEGER },
    size_sqm: { type: DataTypes.DECIMAL(10, 2) },
    rating: { type: DataTypes.DECIMAL(2, 1), defaultValue: 0.0 },
    review_count: { type: DataTypes.INTEGER, defaultValue: 0 },
    badge: { type: DataTypes.ENUM("new", "hot") },
    is_prime_location: { type: DataTypes.BOOLEAN, defaultValue: false },
    image_url: { type: DataTypes.STRING(500) },
    images: jsonArrayField("images"),
    document_url: { type: DataTypes.STRING(500) },
    video_url: { type: DataTypes.STRING(500) },
    // The actual paid deliverable - full drawing pack/CAD files/etc, zipped.
    // Distinct from document_url (a PDF preview anyone can see) and images
    // (marketing photos) - this is the file real money is changing hands
    // for, so it's only ever exposed to admins or an entitled purchaser.
    zip_url: { type: DataTypes.STRING(500) },
    license_price: { type: DataTypes.DECIMAL(14, 2) },
    view_count: { type: DataTypes.INTEGER, defaultValue: 0 },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "plans",
    timestamps: false,
  }
);
