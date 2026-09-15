import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

export const NewsletterSubscriber = sequelize.define(
  "NewsletterSubscriber",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    email: { type: DataTypes.STRING(150), allowNull: false, unique: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    subscribed_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "newsletter_subscribers",
    timestamps: false,
  }
);
