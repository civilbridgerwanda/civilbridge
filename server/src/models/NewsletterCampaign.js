import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

export const NewsletterCampaign = sequelize.define(
  "NewsletterCampaign",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    subject: { type: DataTypes.STRING(200), allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: false },
    sent_count: { type: DataTypes.INTEGER, defaultValue: 0 },
    sent_by: { type: DataTypes.UUID },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "newsletter_campaigns",
    timestamps: false,
  }
);
