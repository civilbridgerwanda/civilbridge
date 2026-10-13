import { Op } from "sequelize";
import {
  sequelize,
  AgentJob,
  AgentDeliverable,
  Estimate,
  EstimateItem,
  AiMessage,
  AiConversation,
  Expert,
} from "../models/index.js";
import { getIntegrations, isAgentActive } from "../config/integrations.js";
import { getProvider } from "./index.js";
import { normalizeResult, publicJob } from "./payload.js";
import { notify } from "../lib/notify.js";
import { announceWorkReady } from "../lib/assignment.js";
import { broadcastStats } from "../lib/stats.js";
import { EVENTS } from "../sockets/index.js";

// The job service: the only code that creates, dispatches and completes
// agent jobs. Controllers create a job and forget it; results come back
// through completeJob() whether the answer arrives from n8n's callback, a
// future proprietary model, or an expert typing results in by hand.

const MAX_ATTEMPTS = 3;
// A job the agent accepted but never reported on. Generous, because a full
// drawing set can legitimately take a long time.
const RUNNING_TIMEOUT_MS = 2 * 60 * 60 * 1000;
const SWEEP_INTERVAL_MS = 60 * 1000;

function announce(io, job) {
  if (!io || !job.user_id) return;
  io.to(`user:${job.user_id}`).emit(EVENTS.AGENT_JOB_UPDATED, publicJob(job));
}

function buildRequest(job) {
  return {
    contract_version: 1,
    job_id: job.id,
    kind: job.kind,
    callback_url: `${getIntegrations().serverUrl}/api/agent/callback`,
    submitted_at: new Date().toISOString(),
    input: job.input,
  };
}

/**
 * Records a job and, if the agent is switched on, sends it. Never waits on
 * the agent and never throws for a dispatch problem - the job simply stays
 * queued and the sweeper retries. With the agent idle the job just sits
 * "queued", which is exactly what the results page and the expert queue
 * are built to show.
 */
export async function createJob(
  { id, kind, userId = null, input, estimateId = null, conversationId = null },
  io
) {
  // `id` lets a caller record something that points at the job (the chat's
  // "working on it" message) BEFORE the job exists, so a very fast agent
  // reply can never arrive ahead of the row it needs to update.
  const job = await AgentJob.create({
    ...(id ? { id } : {}),
    kind,
    user_id: userId,
    input,
    estimate_id: estimateId,
    conversation_id: conversationId,
    status: "queued",
  });
  dispatchJob(job.id, io).catch((err) => console.error("Agent dispatch error:", err.message));
  return job;
}

export async function dispatchJob(jobId, io) {
  if (!isAgentActive()) return false;
  const provider = getProvider();
  if (!provider) return false;

  // Claim it atomically so the sweeper and the creating request can never
  // both send the same job.
  const [claimed] = await AgentJob.update(
    {
      status: "running",
      provider: provider.name,
      started_at: new Date(),
      stage: "Sent to the agent",
      error: null,
      attempts: sequelize.literal("attempts + 1"),
      updated_at: new Date(),
    },
    { where: { id: jobId, status: "queued" } }
  );
  if (!claimed) return false;

  const job = await AgentJob.findByPk(jobId);
  try {
    const { externalRef } = await provider.dispatch(buildRequest(job));
    if (externalRef) {
      job.external_ref = externalRef;
      await job.save();
    }
    announce(io, job);
    return true;
  } catch (err) {
    console.error(`Agent job ${job.id} dispatch failed (attempt ${job.attempts}):`, err.message);
    job.error = err.message.slice(0, 500);
    job.stage = null;
    job.updated_at = new Date();
    if (job.attempts >= MAX_ATTEMPTS) {
      await failJob(job, err.message, io);
    } else {
      job.status = "queued"; // the sweeper tries again
      await job.save();
      announce(io, job);
    }
    return false;
  }
}

// Sends every waiting job - used at boot, by the sweeper, and by the admin
// "send queued jobs" button the moment the agent is switched on.
export async function dispatchQueued(io) {
  if (!isAgentActive()) return { sent: 0, waiting: await AgentJob.count({ where: { status: "queued" } }) };
  const queued = await AgentJob.findAll({ where: { status: "queued" }, order: [["created_at", "ASC"]], limit: 100 });
  let sent = 0;
  for (const job of queued) {
    if (await dispatchJob(job.id, io)) sent += 1;
  }
  return { sent, waiting: await AgentJob.count({ where: { status: "queued" } }) };
}

async function failStaleJobs(io) {
  const cutoff = new Date(Date.now() - RUNNING_TIMEOUT_MS);
  const stale = await AgentJob.findAll({ where: { status: "running", started_at: { [Op.lt]: cutoff } } });
  for (const job of stale) await failJob(job, "The agent never reported back", io);
}

export function startAgentSweeper(io) {
  const tick = () =>
    dispatchQueued(io)
      .then(() => failStaleJobs(io))
      .catch((err) => console.error("Agent sweeper error:", err.message));
  tick();
  return setInterval(tick, SWEEP_INTERVAL_MS).unref();
}

/** Progress from the agent ("Drafting the floor plan", 40%). */
export async function reportProgress(job, { stage, progress }, io) {
  if (job.status === "completed" || job.status === "failed") return job;
  job.status = "running";
  if (typeof stage === "string") job.stage = stage.trim().slice(0, 120) || job.stage;
  if (Number.isFinite(Number(progress))) job.progress = Math.max(0, Math.min(99, Math.round(Number(progress))));
  job.updated_at = new Date();
  await job.save();
  announce(io, job);
  return job;
}

export async function completeJob(job, rawResult, { source = "agent" } = {}, io) {
  if (job.status === "completed") return job; // idempotent - agents retry callbacks
  const result = normalizeResult(rawResult);
  if (job.kind === "estimate_analysis") await applyEstimateResult(job, result, { source }, io);
  else if (job.kind === "chat_task") await applyChatResult(job, result, io);
  else await markCompleted(job, { summary: result.summary, source });
  return job;
}

async function markCompleted(job, resultSummary, transaction) {
  job.status = "completed";
  job.result = resultSummary;
  job.stage = "Done";
  job.progress = 100;
  job.error = null;
  job.completed_at = new Date();
  job.updated_at = new Date();
  await job.save({ transaction });
}

export async function failJob(job, message, io) {
  job.status = "failed";
  job.error = String(message || "Agent failed").slice(0, 500);
  job.stage = null;
  job.completed_at = new Date();
  job.updated_at = new Date();
  await job.save();
  announce(io, job);

  try {
    if (job.kind === "chat_task") {
      await AiMessage.update(
        {
          content:
            "I couldn't finish that one automatically. Please try again in a moment, or start it from the Estimator or with one of our experts.",
        },
        { where: { job_id: job.id } }
      );
    } else if (job.kind === "estimate_analysis" && job.estimate_id) {
      // The estimate stays "draft" - so a failed automatic analysis falls
      // back to a person, never to nothing: the admins are told to assign an
      // expert to do it by hand.
      const estimate = await Estimate.findByPk(job.estimate_id);
      if (estimate) await announceWorkReady(io, estimate, "analysis_failed");
    }
  } catch (err) {
    console.error("Agent failure follow-up error:", err.message);
  }
}

/**
 * Lands an estimate result: replaces the bill of quantities and drawings,
 * fills in the cost, and moves the estimate on to expert verification.
 * `source` is "agent" or "manual" - a person entering results uses the exact
 * same path, so a human is just another (slower) provider.
 */
export async function applyEstimateResult(job, result, { source = "agent" } = {}, io) {
  const estimate = await Estimate.findByPk(job.estimate_id);
  if (!estimate) {
    await failJob(job, "The estimate this job belongs to no longer exists", io);
    return;
  }

  await sequelize.transaction(async (transaction) => {
    await EstimateItem.destroy({ where: { estimate_id: estimate.id }, transaction });
    if (result.items.length) {
      await EstimateItem.bulkCreate(
        result.items.map((item) => ({ ...item, estimate_id: estimate.id })),
        { transaction }
      );
    }

    if (result.estimated_cost != null) estimate.estimated_cost = result.estimated_cost;
    estimate.currency = result.currency;
    // Never move an estimate backwards - a person may already be reviewing it.
    if (estimate.status === "draft") estimate.status = "ai_generated";
    estimate.updated_at = new Date();
    await estimate.save({ transaction });

    // A new result replaces the previous drawing set entirely.
    await AgentDeliverable.destroy({ where: { estimate_id: estimate.id }, transaction });
    if (result.deliverables.length) {
      await AgentDeliverable.bulkCreate(
        result.deliverables.map((d) => ({ ...d, job_id: job.id, estimate_id: estimate.id })),
        { transaction }
      );
    }

    await markCompleted(
      job,
      { summary: result.summary, timeline: result.timeline, notes: result.notes, currency: result.currency, source },
      transaction
    );
  });

  announce(io, job);
  if (io && estimate.user_id) {
    io.to(`user:${estimate.user_id}`).emit(EVENTS.ESTIMATE_STATUS_CHANGED, {
      id: estimate.id,
      status: estimate.status,
      updated_at: estimate.updated_at,
    });
  }
  broadcastStats(io); // "projects estimated" just went up

  // The client is NOT pinged here: they've been told to wait and hear once,
  // when everything is done. The people who need to act are the team - the
  // admins are alerted to assign an expert (or, if one was already assigned
  // while the engine was still working, that expert hears the analysis has
  // landed). The numbers stay locked until an expert verifies (see
  // estimator.controller getById).
  if (source === "agent") {
    if (estimate.assigned_expert_id) {
      const assigned = await Expert.findByPk(estimate.assigned_expert_id, { attributes: ["user_id"] });
      if (assigned) {
        notify(io, assigned.user_id, {
          type: "estimate_created",
          title: "Analysis ready for your review",
          body: estimate.project_name,
          link: "/expert-dashboard",
        }).catch(() => {});
      }
    } else {
      announceWorkReady(io, estimate, "analysis_ready").catch((err) => console.error("Admin alert failed:", err.message));
    }
  }
}

/** Layer 2 chat answer: rewrite the "working on it" bubble in place. */
async function applyChatResult(job, result, io) {
  const content =
    result.reply || result.summary || "That's done - see the files attached to this message.";
  await sequelize.transaction(async (transaction) => {
    await AiMessage.update({ content }, { where: { job_id: job.id }, transaction });
    await AgentDeliverable.destroy({ where: { job_id: job.id }, transaction });
    if (result.deliverables.length) {
      await AgentDeliverable.bulkCreate(
        result.deliverables.map((d) => ({ ...d, job_id: job.id })),
        { transaction }
      );
    }
    if (job.conversation_id) {
      await AiConversation.update({ updated_at: new Date() }, { where: { id: job.conversation_id }, transaction });
    }
    await markCompleted(job, { summary: result.summary, source: "agent" }, transaction);
  });

  announce(io, job);
  if (job.user_id) {
    notify(io, job.user_id, {
      type: "ai_task_ready",
      title: "Your AI Studio request is ready",
      body: result.summary || "The answer is waiting in your conversation.",
      link: "/ai-studio",
    }).catch(() => {});
  }
}
