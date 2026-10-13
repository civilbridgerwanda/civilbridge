import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";
import { jsonObjectField } from "./jsonArrayField.js";

// One unit of work handed to the backend AI agent. The agent layer
// (server/src/agent) is deliberately the only thing that knows *which*
// agent (n8n today, a proprietary model later) does the work - everything
// else just creates a job and reacts when it finishes.
export const AgentJob = sequelize.define(
  "AgentJob",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID },
    // "estimate_analysis" (Estimator upload) | "chat_task" (AI Studio handoff)
    kind: { type: DataTypes.STRING(40), allowNull: false },
    status: {
      type: DataTypes.ENUM("queued", "running", "completed", "failed"),
      allowNull: false,
      defaultValue: "queued",
    },
    provider: { type: DataTypes.STRING(40) },
    input: jsonObjectField("input"),
    result: jsonObjectField("result"),
    // Human-readable step + 0-100 progress, if the agent reports them.
    stage: { type: DataTypes.STRING(120) },
    progress: { type: DataTypes.INTEGER },
    error: { type: DataTypes.STRING(500) },
    external_ref: { type: DataTypes.STRING(120) },
    attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    estimate_id: { type: DataTypes.UUID },
    conversation_id: { type: DataTypes.UUID },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    started_at: { type: DataTypes.DATE },
    completed_at: { type: DataTypes.DATE },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { tableName: "agent_jobs", timestamps: false }
);

// A file the agent produced - a link, never the bytes.
export const AgentDeliverable = sequelize.define(
  "AgentDeliverable",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    job_id: { type: DataTypes.UUID, allowNull: false },
    estimate_id: { type: DataTypes.UUID },
    // floor_plan | elevation | section | roof_plan | foundation_plan |
    // site_plan | render_2d | render_3d | boq | report | other
    kind: { type: DataTypes.STRING(40), allowNull: false, defaultValue: "other" },
    // dwg | dxf | ifc | pdf | png | jpg | svg | xlsx | glb ...
    format: { type: DataTypes.STRING(20) },
    label: { type: DataTypes.STRING(200), allowNull: false },
    url: { type: DataTypes.STRING(500), allowNull: false },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { tableName: "agent_deliverables", timestamps: false }
);

AgentJob.hasMany(AgentDeliverable, { foreignKey: "job_id", as: "deliverables" });
AgentDeliverable.belongsTo(AgentJob, { foreignKey: "job_id" });
