import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

export const OauthAccount = sequelize.define(
  "OauthAccount",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: false },
    provider: { type: DataTypes.ENUM("google", "facebook", "x"), allowNull: false },
    provider_user_id: { type: DataTypes.STRING(255), allowNull: false },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "oauth_accounts",
    timestamps: false,
  }
);
