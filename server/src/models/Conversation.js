import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

export const Conversation = sequelize.define(
  "Conversation",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_a_id: { type: DataTypes.UUID, allowNull: false },
    user_b_id: { type: DataTypes.UUID, allowNull: false },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "conversations",
    timestamps: false,
  }
);

export const Message = sequelize.define(
  "Message",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    conversation_id: { type: DataTypes.UUID, allowNull: false },
    sender_id: { type: DataTypes.UUID, allowNull: false },
    content: { type: DataTypes.TEXT, allowNull: false },
    is_read: { type: DataTypes.BOOLEAN, defaultValue: false },
    created_at: { type: DataTypes.DATE(6), defaultValue: DataTypes.NOW },
  },
  {
    tableName: "messages",
    timestamps: false,
  }
);

Conversation.hasMany(Message, { foreignKey: "conversation_id", as: "messages" });
Message.belongsTo(Conversation, { foreignKey: "conversation_id" });
