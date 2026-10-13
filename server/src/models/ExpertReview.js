import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

export const ExpertReview = sequelize.define(
  "ExpertReview",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    expert_id: { type: DataTypes.UUID, allowNull: false },
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
    tableName: "expert_reviews",
    timestamps: false,
  }
);

export const ExpertPortfolio = sequelize.define(
  "ExpertPortfolio",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    expert_id: { type: DataTypes.UUID, allowNull: false },
    title: { type: DataTypes.STRING(200), allowNull: false },
    description: { type: DataTypes.TEXT },
    image_url: { type: DataTypes.STRING(500) },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "expert_portfolio",
    timestamps: false,
  }
);
