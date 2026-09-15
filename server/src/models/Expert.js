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
    rating: { type: DataTypes.DECIMAL(2, 1), defaultValue: 0.0 },
    review_count: { type: DataTypes.INTEGER, defaultValue: 0 },
    completed_projects: { type: DataTypes.INTEGER, defaultValue: 0 },
    avatar_url: { type: DataTypes.STRING(500) },
    city: { type: DataTypes.STRING(100) },
    view_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  },
  {
    tableName: "experts",
    timestamps: false,
  }
);
