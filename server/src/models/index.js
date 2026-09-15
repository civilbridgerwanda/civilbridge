import { sequelize } from "../config/sequelize.js";
import { User } from "./User.js";
import { Otp } from "./Otp.js";
import { OauthAccount } from "./OauthAccount.js";
import { Expert } from "./Expert.js";
import { Property } from "./Property.js";
import { Estimate, EstimateItem } from "./Estimate.js";
import { Plan } from "./Plan.js";
import { AiConversation, AiMessage } from "./AiConversation.js";
import { NewsletterSubscriber } from "./NewsletterSubscriber.js";
import { Notification } from "./Notification.js";
import { Conversation, Message } from "./Conversation.js";
import { Payment } from "./Payment.js";
import { NewsletterCampaign } from "./NewsletterCampaign.js";
import { PlanInquiry } from "./PlanInquiry.js";
import { ExpertReview, ExpertPortfolio } from "./ExpertReview.js";

// Cross-model associations that aren't self-contained in one model file.
User.hasOne(Expert, { foreignKey: "user_id" });
Expert.belongsTo(User, { foreignKey: "user_id" });

User.hasMany(Otp, { foreignKey: "user_id" });
Otp.belongsTo(User, { foreignKey: "user_id" });

User.hasMany(OauthAccount, { foreignKey: "user_id", as: "oauthAccounts" });
OauthAccount.belongsTo(User, { foreignKey: "user_id" });

User.hasMany(Property, { foreignKey: "owner_id", as: "properties" });
Property.belongsTo(User, { foreignKey: "owner_id", as: "owner" });

User.hasMany(Estimate, { foreignKey: "user_id", as: "estimates" });
Estimate.belongsTo(User, { foreignKey: "user_id" });
Estimate.belongsTo(Expert, { foreignKey: "reviewed_by", as: "reviewer" });
Estimate.belongsTo(Expert, { foreignKey: "assigned_expert_id", as: "assignedExpert" });
Expert.hasMany(Estimate, { foreignKey: "assigned_expert_id", as: "assignedEstimates" });

User.hasMany(Notification, { foreignKey: "user_id" });
Notification.belongsTo(User, { foreignKey: "user_id" });

User.hasMany(Conversation, { foreignKey: "user_a_id", as: "conversationsStarted" });
User.hasMany(Conversation, { foreignKey: "user_b_id", as: "conversationsReceived" });
Conversation.belongsTo(User, { foreignKey: "user_a_id", as: "userA" });
Conversation.belongsTo(User, { foreignKey: "user_b_id", as: "userB" });

User.hasMany(Message, { foreignKey: "sender_id" });
Message.belongsTo(User, { foreignKey: "sender_id", as: "sender" });

User.hasMany(Payment, { foreignKey: "payer_id", as: "payments" });
Payment.belongsTo(User, { foreignKey: "payer_id", as: "payer" });
Payment.belongsTo(Expert, { foreignKey: "recipient_id", as: "recipientExpert" });

Plan.hasMany(PlanInquiry, { foreignKey: "plan_id", as: "inquiries" });
PlanInquiry.belongsTo(Plan, { foreignKey: "plan_id" });
Expert.hasMany(PlanInquiry, { foreignKey: "assigned_expert_id", as: "assignedInquiries" });
PlanInquiry.belongsTo(Expert, { foreignKey: "assigned_expert_id", as: "assignedExpert" });

Expert.hasMany(ExpertReview, { foreignKey: "expert_id", as: "reviews" });
ExpertReview.belongsTo(Expert, { foreignKey: "expert_id" });
User.hasMany(ExpertReview, { foreignKey: "reviewer_id" });
ExpertReview.belongsTo(User, { foreignKey: "reviewer_id", as: "reviewer" });

Expert.hasMany(ExpertPortfolio, { foreignKey: "expert_id", as: "portfolio" });
ExpertPortfolio.belongsTo(Expert, { foreignKey: "expert_id" });

export {
  sequelize,
  User,
  Otp,
  OauthAccount,
  Expert,
  Property,
  Estimate,
  EstimateItem,
  Plan,
  AiConversation,
  AiMessage,
  NewsletterSubscriber,
  Notification,
  Conversation,
  Message,
  Payment,
  NewsletterCampaign,
  PlanInquiry,
  ExpertReview,
  ExpertPortfolio,
};
