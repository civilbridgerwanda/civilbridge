import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

// A site-tour request. Only our team marks one "completed" - that completed
// visit is what lets the visitor review the property (see lib/reviews.js).
export const PropertyVisit = sequelize.define(
  "PropertyVisit",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    property_id: { type: DataTypes.UUID, allowNull: false },
    user_id: { type: DataTypes.UUID, allowNull: false },
    status: {
      type: DataTypes.ENUM("requested", "confirmed", "completed", "cancelled"),
      allowNull: false,
      defaultValue: "requested",
    },
    preferred_date: { type: DataTypes.DATE },
    phone: { type: DataTypes.STRING(40) },
    note: { type: DataTypes.STRING(500) },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    completed_at: { type: DataTypes.DATE },
  },
  { tableName: "property_visits", timestamps: false }
);
