import { Op } from "sequelize";
import { Estimate, EstimateItem, AgentJob, AgentDeliverable, User, Expert } from "../models/index.js";
import { EVENTS } from "../sockets/index.js";
import { sendMail } from "../config/mailer.js";
import { estimateStatusEmail } from "../config/emailTemplates.js";
import { notify } from "../lib/notify.js";
import { startConversationWithMessage } from "../lib/conversations.js";
import { getIntegrations, isAgentActive } from "../config/integrations.js";
import { createJob, applyEstimateResult } from "../agent/jobs.js";
import { estimateDeliverables, normalizeResult, publicJob } from "../agent/payload.js";
import { AllowanceError, priceList, withAllowance } from "../lib/allowance.js";
import { LocationError, resolveLocation } from "../lib/locations.js";
import { isStoredUpload, toPublicUploadUrl } from "../lib/planFiles.js";
import { broadcastStats } from "../lib/stats.js";
import { recomputeCompletedProjects } from "../lib/expertStats.js";
import { announceWorkReady } from "../lib/assignment.js";

const STATUSES = ["draft", "ai_generated", "under_review", "verified"];
const PROJECT_TYPES = ["house", "apartment", "commercial", "land", "renovation"];

const isReviewer = (user) => user?.role === "admin" || user?.role === "expert";

// The numbers (cost, bill of quantities, drawings) are only ever handed to
// the client once an expert has verified them. Reviewers need them to do the
// review. This is enforced here, in the API - hiding them in the UI alone
// would still leave them readable from the network tab.
function serialize(estimate, { canSeeResults, reviewerView = false }) {
  const data = estimate.toJSON ? estimate.toJSON() : { ...estimate };
  if (!canSeeResults) {
    data.estimated_cost = null;
    delete data.items;
  }
  // Who an admin picked is the team's business. The client only learns
  // *whether* an expert has been assigned (their page says so), never who.
  data.assigned = Boolean(data.assigned_expert_id);
  if (!reviewerView) {
    delete data.assigned_expert_id;
    delete data.reviewed_by;
  }
  return data;
}

// Experts only ever touch work an admin assigned to them (or that they've
// already verified). Admins can open anything.
async function reviewerMayAccess(user, estimate) {
  if (user.role === "admin") return true;
  if (user.role !== "expert") return false;
  const expert = await Expert.findOne({ where: { user_id: user.sub }, attributes: ["id"] });
  return Boolean(expert) && (estimate.assigned_expert_id === expert.id || estimate.reviewed_by === expert.id);
}

async function latestJobs(estimateIds) {
  if (!estimateIds.length) return new Map();
  const jobs = await AgentJob.findAll({
    where: { estimate_id: estimateIds },
    order: [["created_at", "DESC"]],
  });
  const byEstimate = new Map();
  for (const job of jobs) if (!byEstimate.has(job.estimate_id)) byEstimate.set(job.estimate_id, job);
  return byEstimate;
}

// GET /api/estimates/mine  (the signed-in user's own submitted estimates)
export async function mine(req, res) {
  try {
    const estimates = await Estimate.findAll({
      where: { user_id: req.user.sub },
      order: [["created_at", "DESC"]],
    });
    const jobs = await latestJobs(estimates.map((e) => e.id));
    res.json({
      success: true,
      data: estimates.map((e) => ({
        ...serialize(e, { canSeeResults: e.status === "verified" }),
        job: jobs.has(e.id) ? publicJob(jobs.get(e.id)) : null,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch your estimates" });
  }
}

// GET /api/estimates/assigned  (an expert's queue: only the work an admin has
// assigned to them, plus what they've already verified. Nothing else is
// visible to them - assignment is how work reaches an expert.)
export async function assigned(req, res) {
  try {
    const expert = await Expert.findOne({ where: { user_id: req.user.sub } });
    if (!expert) {
      return res.status(403).json({ success: false, message: "No expert profile found for this account" });
    }

    const estimates = await Estimate.findAll({
      where: {
        [Op.or]: [{ reviewed_by: expert.id }, { assigned_expert_id: expert.id }],
      },
      include: [{ model: User, attributes: ["full_name", "email"] }],
      order: [["created_at", "DESC"]],
      limit: 100,
    });
    const jobs = await latestJobs(estimates.map((e) => e.id));
    res.json({
      success: true,
      data: {
        expertId: expert.id,
        estimates: estimates.map((e) => ({
          ...e.toJSON(),
          job: jobs.has(e.id) ? publicJob(jobs.get(e.id)) : null,
        })),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch review queue" });
  }
}

// GET /api/estimates/:id  (the "results dashboard" - progress until it's
// verified, then the full breakdown and drawing set)
export async function getById(req, res) {
  try {
    const estimate = await Estimate.findByPk(req.params.id, {
      include: [{ model: EstimateItem, as: "items" }],
    });
    if (!estimate) {
      return res.status(404).json({ success: false, message: "Estimate not found" });
    }
    // The owner can always open their own. Admins can open anything; an
    // expert only what's assigned to them. Anyone else gets a 404.
    const isOwner = estimate.user_id && estimate.user_id === req.user.sub;
    const reviewer = await reviewerMayAccess(req.user, estimate);
    if (!isOwner && !reviewer) {
      return res.status(404).json({ success: false, message: "Estimate not found" });
    }

    const canSeeResults = reviewer || estimate.status === "verified";
    const job = (await latestJobs([estimate.id])).get(estimate.id) || null;
    const data = serialize(estimate, { canSeeResults, reviewerView: reviewer });
    data.job = job ? publicJob(job) : null;

    if (canSeeResults) {
      const deliverables = await AgentDeliverable.findAll({
        where: { estimate_id: estimate.id },
        order: [["created_at", "ASC"]],
        attributes: ["id", "kind", "format", "label", "url"],
      });
      data.deliverables = deliverables;
      const { summary, timeline, notes } = job?.result || {};
      data.analysis = { summary: summary || null, timeline: timeline || null, notes: notes || null };
    }

    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch estimate" });
  }
}

// Runs before anything is spent, so a request that can't succeed never uses up
// an allowance or a credit. This is the server-side half of the Estimator's
// upload gate: no stored file, no estimate - whatever the UI does.
export function validateEstimateRequest(req, res, next) {
  const body = req.body || {};

  if (!isStoredUpload(body.attachment_url)) {
    return res.status(400).json({
      success: false,
      code: "FILE_REQUIRED",
      message: "Upload your plan or document first - the estimator works from your file.",
    });
  }

  let location;
  try {
    location = resolveLocation(body.district, body.sector, { required: true });
  } catch (err) {
    if (err instanceof LocationError) return res.status(400).json({ success: false, message: err.message });
    throw err;
  }

  const projectType = PROJECT_TYPES.includes(body.project_type) ? body.project_type : "";
  const description = typeof body.description === "string" ? body.description.trim().slice(0, 5000) : "";
  const name = typeof body.project_name === "string" ? body.project_name.trim().slice(0, 200) : "";
  const positive = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : null);
  const upi = typeof body.details?.upi === "string" ? body.details.upi.trim().slice(0, 60) : "";

  req.estimateInput = {
    project_name: name || `${projectType ? projectType[0].toUpperCase() + projectType.slice(1) : "Building"} project`,
    project_type: projectType,
    description,
    attachment_url: body.attachment_url,
    drawings: body.drawings === true, // the paid CAD drawing add-on
    ...location,
    details: {
      budget_rwf: positive(body.details?.budget_rwf),
      land_size_sqm: positive(body.details?.land_size_sqm),
      upi: upi || null,
    },
  };
  next();
}

// POST /api/estimates  (submit an uploaded plan for analysis)
export async function create(req, res) {
  try {
    const io = req.app.get("io");
    const input = req.estimateInput;

    // The allowance check, the credit it takes and the estimate itself all
    // happen in one transaction: if creating the estimate fails, the credit
    // is given back, and two simultaneous requests can't both spend the last one.
    const estimate = await withAllowance(req.user.sub, { drawings: input.drawings }, ({ funding, priority, transaction }) =>
      Estimate.create(
        {
          // Ownership always comes from the session, never the request body.
          user_id: req.user.sub,
          project_name: input.project_name,
          project_type: input.project_type,
          description: input.description,
          district: input.district,
          sector: input.sector,
          attachment_url: input.attachment_url,
          status: "draft", // "received" - analysis hasn't produced results yet
          funding,
          priority,
          drawings_requested: input.drawings,
        },
        { transaction }
      )
    );

    const { serverUrl } = getIntegrations();
    const job = await createJob(
      {
        kind: "estimate_analysis",
        userId: req.user.sub,
        estimateId: estimate.id,
        input: {
          estimate_id: estimate.id,
          project_name: input.project_name,
          project_type: input.project_type,
          description: input.description,
          location: { country: "RW", district: input.district, sector: input.sector },
          details: input.details,
          files: [{ url: toPublicUploadUrl(input.attachment_url, serverUrl) }],
          // What we want back - the agent decides how (see docs/N8N_AGENT_INTEGRATION.md).
          requested_deliverables: estimateDeliverables({ drawings: input.drawings }),
        },
      },
      io
    );

    // The client is told once, now, that it's in good hands and they'll hear
    // when everything is done - no need to sit on the page.
    notify(io, req.user.sub, {
      type: "estimate_received",
      title: `We've received "${input.project_name}"`,
      body: "Our team will take it from here. You'll be notified as soon as everything is done.",
      link: `/estimates/${estimate.id}`,
    }).catch(() => {});

    // With the agent off nothing will analyse this automatically, so the
    // admins are alerted straight away to assign an expert. With it on, they
    // hear when the analysis lands (see agent/jobs.js applyEstimateResult).
    if (!isAgentActive()) {
      announceWorkReady(io, estimate, "needs_analysis").catch((err) => console.error("Admin alert failed:", err.message));
    }

    res.status(201).json({
      success: true,
      data: { ...serialize(estimate, { canSeeResults: false }), job: publicJob(job) },
    });
  } catch (err) {
    if (err instanceof AllowanceError) {
      // 402 with a machine-readable code and the price list, so the page can
      // offer exactly the right purchase instead of a dead end.
      return res.status(err.status).json({ success: false, code: err.code, message: err.message, prices: priceList() });
    }
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to create estimate" });
  }
}

// PUT /api/estimates/:id/results  (an expert/admin entering the analysis by
// hand - the same result shape the AI agent posts back, so a person is just
// another, slower provider. This is what keeps requests moving while the
// agent is switched off, and how an expert corrects an AI draft.)
export async function saveResults(req, res) {
  try {
    const io = req.app.get("io");
    if (!isReviewer(req.user)) {
      return res.status(403).json({ success: false, message: "Only experts or admins can enter results" });
    }
    const estimate = await Estimate.findByPk(req.params.id);
    if (!estimate) return res.status(404).json({ success: false, message: "Estimate not found" });
    if (!(await reviewerMayAccess(req.user, estimate))) {
      return res.status(403).json({ success: false, message: "This estimate hasn't been assigned to you." });
    }

    const result = normalizeResult(req.body);
    if (!result.items.length && !(result.estimated_cost > 0)) {
      return res.status(400).json({
        success: false,
        message: "Add at least one line item, or a total cost, before saving results.",
      });
    }

    // Complete the open job if there is one (so it isn't dispatched to the
    // agent afterwards); otherwise record this as its own manual job.
    let job = await AgentJob.findOne({
      where: { estimate_id: estimate.id, kind: "estimate_analysis", status: { [Op.ne]: "completed" } },
      order: [["created_at", "DESC"]],
    });
    if (!job) {
      job = await AgentJob.create({
        kind: "estimate_analysis",
        user_id: estimate.user_id,
        estimate_id: estimate.id,
        status: "running",
      });
    }
    job.provider = "manual";
    await applyEstimateResult(job, result, { source: "manual" }, io);

    const fresh = await Estimate.findByPk(estimate.id, { include: [{ model: EstimateItem, as: "items" }] });
    res.json({ success: true, data: serialize(fresh, { canSeeResults: true, reviewerView: true }) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to save results" });
  }
}

// PATCH /api/estimates/:id/status  (e.g. expert marks it "verified")
export async function updateStatus(req, res) {
  try {
    const io = req.app.get("io");
    const { status } = req.body;
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: `Status must be one of: ${STATUSES.join(", ")}` });
    }
    const estimate = await Estimate.findByPk(req.params.id);
    if (!estimate) {
      return res.status(404).json({ success: false, message: "Estimate not found" });
    }

    // Reviewer is always derived from the authenticated session, not the
    // request body - admins can set any status; experts can only review
    // via their own linked expert profile.
    let reviewedBy = estimate.reviewed_by;
    if (req.user.role === "expert") {
      const expert = await Expert.findOne({ where: { user_id: req.user.sub } });
      if (!expert) {
        return res.status(403).json({ success: false, message: "No expert profile found for this account" });
      }
      if (estimate.assigned_expert_id !== expert.id && estimate.reviewed_by !== expert.id) {
        return res.status(403).json({ success: false, message: "This estimate hasn't been assigned to you." });
      }
      reviewedBy = expert.id;
    } else if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Only experts or admins can update estimate status" });
    }

    // Approving an estimate with nothing in it would hand the client a
    // verified "RWF 0" - require real results first.
    if (status === "verified") {
      const itemCount = await EstimateItem.count({ where: { estimate_id: estimate.id } });
      if (itemCount === 0 && !(Number(estimate.estimated_cost) > 0)) {
        return res.status(400).json({
          success: false,
          message: "This estimate has no results yet. Enter the cost breakdown before verifying it.",
        });
      }
    }

    const previousReviewer = estimate.reviewed_by;
    estimate.status = status;
    estimate.reviewed_by = reviewedBy;
    estimate.updated_at = new Date();
    await estimate.save();

    // "Completed projects" on an expert's profile = estimates they verified.
    await recomputeCompletedProjects(reviewedBy);
    if (previousReviewer && previousReviewer !== reviewedBy) await recomputeCompletedProjects(previousReviewer);

    // Only the owner's own sessions hear about it, and only that something
    // changed - the numbers are fetched (and gated) through getById.
    if (estimate.user_id) {
      io.to(`user:${estimate.user_id}`).emit(EVENTS.ESTIMATE_STATUS_CHANGED, {
        id: estimate.id,
        status: estimate.status,
        updated_at: estimate.updated_at,
      });
    }
    broadcastStats(io);

    // Let the project owner know by email, if they have an account.
    if (estimate.user_id) {
      const owner = await User.findByPk(estimate.user_id);
      if (owner) {
        // Approval is the natural moment to connect reviewer and client
        // directly - start (or reuse) a conversation with a starter message
        // from the reviewer. It sends its own notification linking into that
        // conversation; the email/notification below point at the results.
        if (status === "verified" && owner.id !== req.user.sub) {
          const reviewer = await User.findByPk(req.user.sub);
          try {
            await startConversationWithMessage(io, {
              senderId: req.user.sub,
              recipientId: owner.id,
              content: `Hi ${owner.full_name.split(" ")[0]}, I've reviewed and approved your estimate for "${estimate.project_name}". Happy to answer any questions about it here.`,
              notificationTitle: `${reviewer?.full_name || "Your reviewer"} approved "${estimate.project_name}"`,
            });
          } catch (err) {
            console.error("Failed to start post-approval conversation:", err);
          }
        }

        // Verified results are read on the results page; anything else
        // just points back at the dashboard.
        const nextLink = status === "verified" ? `/estimates/${estimate.id}` : "/dashboard";

        sendMail({
          to: owner.email,
          subject: `Update on "${estimate.project_name}"`,
          html: estimateStatusEmail(estimate.project_name, status, nextLink),
        }).catch(() => {});

        notify(io, owner.id, {
          type: "estimate_status_changed",
          title: status === "verified" ? `Your results for "${estimate.project_name}" are ready` : `"${estimate.project_name}" was updated`,
          body:
            status === "verified"
              ? "An expert has verified your estimate. Open it to see the cost breakdown and drawings."
              : `Status is now ${status.replace("_", " ")}.`,
          link: nextLink,
        }).catch(() => {});
      }
    }

    res.json({ success: true, data: estimate });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to update estimate" });
  }
}
