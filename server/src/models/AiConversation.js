import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

export const AiConversation = sequelize.define(
  "AiConversation",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID },
    title: { type: DataTypes.STRING(200), defaultValue: "New Conversation" },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "ai_conversations",
    timestamps: false,
  }
);

export const AiMessage = sequelize.define(
  "AiMessage",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    conversation_id: { type: DataTypes.UUID, allowNull: false },
    role: { type: DataTypes.ENUM("user", "assistant"), allowNull: false },
    content: { type: DataTypes.TEXT, allowNull: false },
    created_at: { type: DataTypes.DATE(6), defaultValue: DataTypes.NOW },
  },
  {
    tableName: "ai_messages",
    timestamps: false,
  }
);

AiConversation.hasMany(AiMessage, { foreignKey: "conversation_id", as: "messages" });
AiMessage.belongsTo(AiConversation, { foreignKey: "conversation_id" });
