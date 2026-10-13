import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

export const Expert = sequelize.define(
  "Expert",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: false },
    category: {
      type: DataTypes.ENUM("engineer", "architect", "contractor", "surveyor", "interior_designer"),
      allowNull: false,
    },
    specialty: { type: DataTypes.STRING(120), allowNull: false },
    specialization: { type: DataTypes.STRING(150) },
    bio: { type: DataTypes.TEXT },
    years_experience: { type: DataTypes.INTEGER, defaultValue: 0 },
    is_verified: { type: DataTypes.BOOLEAN, defaultValue: false },
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
    completed_projects: { type: DataTypes.INTEGER, defaultValue: 0 },
    avatar_url: { type: DataTypes.STRING(500) },
    city: { type: DataTypes.STRING(100) }, // legacy - see district/sector
    district: { type: DataTypes.STRING(100) },
    sector: { type: DataTypes.STRING(100) },
    view_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  },
  {
    tableName: "experts",
    timestamps: false,
  }
);
