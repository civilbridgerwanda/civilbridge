import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

export const PropertyReview = sequelize.define(
  "PropertyReview",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    property_id: { type: DataTypes.UUID, allowNull: false },
    reviewer_id: { type: DataTypes.UUID, allowNull: false },
    rating: { type: DataTypes.TINYINT, allowNull: false },
    comment: { type: DataTypes.TEXT },
    // Why the reviewer was allowed to review: purchase | estimate | consultation | tour.
    // Set by the server at submit time, never by the client.
    basis: { type: DataTypes.STRING(30) },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "property_reviews",
    timestamps: false,
  }
);
