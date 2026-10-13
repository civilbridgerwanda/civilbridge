import { Op } from "sequelize";
import { AgentJob, Estimate, Expert, Property, PropertyVisit, User } from "../models/index.js";
import { AssignmentError, assignEstimate, nudgeAssignedExpert } from "../lib/assignment.js";
import * as presence from "../lib/presence.js";
import { integrationStatus } from "../config/integrations.js";
import { dispatchQueued } from "../agent/jobs.js";
import { notify } from "../lib/notify.js";
import { broadcastStats } from "../lib/stats.js";

// GET /api/admin/integrations
// What's wired up and whether it's live - booleans and names only, never a
// key or URL. Plus how much work is waiting on the agent.
export async function integrations(req, res) {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [queued, running, failed, completedToday] = await Promise.all([
      AgentJob.count({ where: { status: "queued" } }),
      AgentJob.count({ where: { status: "running" } }),
      AgentJob.count({ where: { status: "failed", completed_at: { [Op.gte]: since } } }),
      AgentJob.count({ where: { status: "completed", completed_at: { [Op.gte]: since } } }),
    ]);
    res.json({
      success: true,
      data: { integrations: integrationStatus(), jobs: { queued, running, failed_24h: failed, completed_24h: completedToday } },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to load integration status" });
  }
}

// POST /api/admin/agent/dispatch-queued - send everything waiting to the agent
// (the button to press right after switching AGENT_ENABLED on).
export async function dispatchQueuedJobs(req, res) {
  try {
    res.json({ success: true, data: await dispatchQueued(req.app.get("io")) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to send queued jobs" });
  }
}

// ---------- Assigning estimates to experts ----------

// PATCH /api/admin/estimates/:id/assign  { expert_id: string | null }
// The team hands each estimate to an expert (null takes it back). Only that
// expert can then see and work on it; the client just waits to be notified.
export async function assignEstimateToExpert(req, res) {
  try {
    const estimate = await Estimate.findByPk(req.params.id);
    if (!estimate) return res.status(404).json({ success: false, message: "Estimate not found" });
    const expertId = req.body?.expert_id || null;
    const { expert } = await assignEstimate(req.app.get("io"), estimate, expertId);
    res.json({ success: true, data: { id: estimate.id, assigned_expert_id: expert ? expert.id : null } });
  } catch (err) {
    if (err instanceof AssignmentError) return res.status(err.status).json({ success: false, message: err.message });
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to assign the estimate" });
  }
}

// POST /api/admin/estimates/:id/nudge - follow up with the assigned expert.
export async function nudgeEstimate(req, res) {
  try {
    const estimate = await Estimate.findByPk(req.params.id);
    if (!estimate) return res.status(404).json({ success: false, message: "Estimate not found" });
    res.json({ success: true, data: await nudgeAssignedExpert(req.app.get("io"), estimate) });
  } catch (err) {
    if (err instanceof AssignmentError) return res.status(err.status).json({ success: false, message: err.message });
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to send the reminder" });
  }
}

// ---------- Expert verification ----------

// GET /api/admin/experts
export async function listExperts(req, res) {
  try {
    const experts = await Expert.findAll({
      include: [{ model: User, attributes: ["id", "full_name", "email", "is_suspended", "last_seen_at"] }],
      order: [
        ["is_verified", "ASC"], // unverified first - that's the queue that needs attention
        ["created_at", "DESC"],
      ],
    });

    // Each expert's open work: assigned to them and not yet verified.
    const open = experts.length
      ? await Estimate.findAll({
          where: { assigned_expert_id: experts.map((e) => e.id), status: { [Op.ne]: "verified" } },
          attributes: ["assigned_expert_id", "assigned_at", "updated_at"],
        })
      : [];
    const workload = new Map();
    for (const job of open) {
      const w = workload.get(job.assigned_expert_id) || { count: 0, oldest: null };
      w.count += 1;
      const since = job.assigned_at || job.updated_at;
      if (!w.oldest || new Date(since) < new Date(w.oldest)) w.oldest = since;
      workload.set(job.assigned_expert_id, w);
    }
    res.json({
      success: true,
      data: experts.map((e) => ({
        id: e.id,
        user_id: e.User?.id,
        full_name: e.User?.full_name,
        email: e.User?.email,
        is_suspended: Boolean(e.User?.is_suspended),
        presence: e.User ? presence.statusOf(e.User.id) : "offline", // online | away | offline
        last_seen_at: e.User?.last_seen_at || null,
        open_tasks: workload.get(e.id)?.count || 0,
        oldest_task_at: workload.get(e.id)?.oldest || null,
        category: e.category,
        specialty: e.specialty,
        years_experience: e.years_experience,
        district: e.district,
        sector: e.sector,
        is_verified: Boolean(e.is_verified),
        rating: e.rating,
        review_count: e.review_count,
        completed_projects: e.completed_projects,
        created_at: e.created_at,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch experts" });
  }
}

// PATCH /api/admin/experts/:id/verify  { is_verified: boolean }
// Verification is a human check (credentials, licence) - there's no
// automatic path to it. It's what the homepage "verified experts" counter
// and the directory's "verified first" ordering are built on.
export async function setExpertVerified(req, res) {
  try {
    if (typeof req.body?.is_verified !== "boolean") {
      return res.status(400).json({ success: false, message: "is_verified must be true or false" });
    }
    const expert = await Expert.findByPk(req.params.id);
    if (!expert) return res.status(404).json({ success: false, message: "Expert not found" });

    const wasVerified = Boolean(expert.is_verified);
    expert.is_verified = req.body.is_verified;
    await expert.save();

    if (expert.is_verified && !wasVerified) {
      notify(req.app.get("io"), expert.user_id, {
        type: "expert_verified",
        title: "You're now a verified expert",
        body: "Your profile now shows the verified badge and appears first in the directory.",
        link: "/expert-dashboard",
      }).catch(() => {});
    }
    broadcastStats(req.app.get("io"));
    res.json({ success: true, data: { id: expert.id, is_verified: expert.is_verified } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to update verification" });
  }
}

// ---------- Site-tour visits ----------

// GET /api/admin/visits?status=requested
export async function listVisits(req, res) {
  try {
    const { status } = req.query;
    const where = status && status !== "all" ? { status } : {};
    const visits = await PropertyVisit.findAll({
      where,
      include: [
        { model: Property, attributes: ["id", "title", "district", "sector"] },
        { model: User, as: "visitor", attributes: ["id", "full_name", "email"] },
      ],
      order: [["created_at", "DESC"]],
      limit: 200,
    });
    res.json({ success: true, data: visits });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch tour requests" });
  }
}

const VISIT_STATUSES = ["requested", "confirmed", "completed", "cancelled"];

// PATCH /api/admin/visits/:id  { status }
// Only staff can mark a tour completed - that is what opens up reviewing the
// property, so it must not be something the owner or visitor can do for
// themselves.
export async function updateVisitStatus(req, res) {
  try {
    const { status } = req.body || {};
    if (!VISIT_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: `Status must be one of: ${VISIT_STATUSES.join(", ")}` });
    }
    const visit = await PropertyVisit.findByPk(req.params.id, { include: [{ model: Property, attributes: ["id", "title"] }] });
    if (!visit) return res.status(404).json({ success: false, message: "Tour request not found" });

    visit.status = status;
    visit.completed_at = status === "completed" ? new Date() : null;
    await visit.save();

    const io = req.app.get("io");
    if (status === "completed") {
      notify(io, visit.user_id, {
        type: "review_unlocked",
        title: "How was your tour?",
        body: `You can now rate "${visit.Property?.title || "the property"}" from its page.`,
        link: `/marketplace/${visit.property_id}`,
      }).catch(() => {});
    } else if (status === "confirmed") {
      notify(io, visit.user_id, {
        type: "tour_confirmed",
        title: "Your tour is confirmed",
        body: `Your visit to "${visit.Property?.title || "the property"}" has been confirmed by our team.`,
        link: "/dashboard",
      }).catch(() => {});
    }
    res.json({ success: true, data: visit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to update the tour request" });
  }
}
