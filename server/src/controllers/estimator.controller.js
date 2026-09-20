import { Op } from "sequelize";
import { Estimate, EstimateItem, User, Expert } from "../models/index.js";
import { EVENTS } from "../sockets/index.js";
import { sendMail } from "../config/mailer.js";
import { estimateStatusEmail } from "../config/emailTemplates.js";
import { notify } from "../lib/notify.js";
import { startConversationWithMessage } from "../lib/conversations.js";

// GET /api/estimates/mine  (the signed-in user's own submitted estimates)
export async function mine(req, res) {
  try {
    const estimates = await Estimate.findAll({
      where: { user_id: req.user.sub },
      order: [["created_at", "DESC"]],
    });
    res.json({ success: true, data: estimates });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch your estimates" });
  }
}

// GET /api/estimates/assigned  (queue for an expert: unreviewed estimates,
// plus ones they've already reviewed)
export async function assigned(req, res) {
  try {
    const expert = await Expert.findOne({ where: { user_id: req.user.sub } });
    if (!expert) {
      return res.status(403).json({ success: false, message: "No expert profile found for this account" });
    }

    const estimates = await Estimate.findAll({
      where: {
        [Op.or]: [
          { status: ["ai_generated", "under_review"] },
          { reviewed_by: expert.id },
          { assigned_expert_id: expert.id },
        ],
      },
      include: [{ model: User, attributes: ["full_name", "email"] }],
      order: [["created_at", "DESC"]],
      limit: 100,
    });
    res.json({ success: true, data: { expertId: expert.id, estimates } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch review queue" });
  }
}

// GET /api/estimates/:id  (with line items)
export async function getById(req, res) {
  try {
    const estimate = await Estimate.findByPk(req.params.id, {
      include: [{ model: EstimateItem, as: "items" }],
    });
    if (!estimate) {
      return res.status(404).json({ success: false, message: "Estimate not found" });
    }
    // Experts/admins review estimates they don't own, so they can view any
    // record; anyone else (the client role) may only view their own - this
    // was missing entirely before, letting any signed-in user view any
    // other user's estimate just by guessing/knowing its id.
    const isOwner = estimate.user_id && estimate.user_id === req.user.sub;
    const canReview = req.user.role === "admin" || req.user.role === "expert";
    if (!isOwner && !canReview) {
      return res.status(404).json({ success: false, message: "Estimate not found" });
    }
    res.json({ success: true, data: estimate });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch estimate" });
  }
}

// POST /api/estimates  (create a draft/AI-generated estimate)
export async function create(req, res) {
  try {
    const io = req.app.get("io");
    const { project_name, project_type, description, estimated_cost, attachment_url, items = [] } = req.body;

    const estimate = await Estimate.create({
      // Trust the authenticated session for ownership, if signed in -
      // never trust a user_id sent in the request body directly.
      user_id: req.user?.sub || null,
      project_name,
      project_type,
      description,
      estimated_cost,
      attachment_url: attachment_url || null,
      status: "ai_generated",
    });

    if (items.length) {
      await EstimateItem.bulkCreate(items.map((item) => ({ ...item, estimate_id: estimate.id })));
    }

    io.emit(EVENTS.ESTIMATE_CREATED, estimate);

    // Let every expert know there's something new to review.
    const experts = await Expert.findAll({ attributes: ["user_id"] });
    for (const expert of experts) {
      notify(io, expert.user_id, {
        type: "estimate_created",
        title: "New estimate needs review",
        body: project_name,
        link: "/expert-dashboard",
      }).catch(() => {});
    }

    res.status(201).json({ success: true, data: estimate });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to create estimate" });
  }
}

// PATCH /api/estimates/:id/assign  { expert_id }  (the estimate's own client
// requesting a specific expert review it, instead of leaving it in the
// general queue for whoever picks it up first)
export async function assignExpert(req, res) {
  try {
    const io = req.app.get("io");
    const { expert_id } = req.body;

    const estimate = await Estimate.findByPk(req.params.id);
    if (!estimate) {
      return res.status(404).json({ success: false, message: "Estimate not found" });
    }
    if (estimate.user_id !== req.user.sub) {
      return res.status(403).json({ success: false, message: "You can only assign your own estimates" });
    }

    const expert = await Expert.findByPk(expert_id, { include: [{ model: User, attributes: ["full_name"] }] });
    if (!expert) {
      return res.status(404).json({ success: false, message: "Expert not found" });
    }

    estimate.assigned_expert_id = expert.id;
    await estimate.save();

    const client = await User.findByPk(req.user.sub);
    notify(io, expert.user_id, {
      type: "estimate_assigned",
      title: `${client?.full_name || "A client"} requested you for "${estimate.project_name}"`,
      body: "They'd like you specifically to review this estimate.",
      link: "/expert-dashboard",
    }).catch(() => {});

    res.json({ success: true, data: estimate });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to assign expert" });
  }
}

// PATCH /api/estimates/:id/status  (e.g. expert marks it "verified")
export async function updateStatus(req, res) {
  try {
    const io = req.app.get("io");
    const { status } = req.body;
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
      reviewedBy = expert.id;
    } else if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Only experts or admins can update estimate status" });
    }

    estimate.status = status;
    estimate.reviewed_by = reviewedBy;
    estimate.updated_at = new Date();
    await estimate.save();

    // Anyone watching this estimate's room gets the update live.
    io.to(`estimate:${req.params.id}`).emit(EVENTS.ESTIMATE_STATUS_CHANGED, estimate);
    io.emit(EVENTS.ESTIMATE_STATUS_CHANGED, estimate);

    // Let the project owner know by email, if they have an account.
    if (estimate.user_id) {
      const owner = await User.findByPk(estimate.user_id);
      if (owner) {
        // Approval is the natural moment to connect reviewer and client
        // directly - start (or reuse) a conversation with a starter message
        // from the reviewer *before* building the email/notification below,
        // so both can link straight into that conversation instead of a
        // generic dashboard - the actual "what's next" action after approval
        // is "talk to your reviewer", not "go look at a list".
        let conversationId = null;
        if (status === "verified" && owner.id !== req.user.sub) {
          const reviewer = await User.findByPk(req.user.sub);
          try {
            const conversation = await startConversationWithMessage(io, {
              senderId: req.user.sub,
              recipientId: owner.id,
              content: `Hi ${owner.full_name.split(" ")[0]}, I've reviewed and approved your estimate for "${estimate.project_name}". Happy to answer any questions about it here.`,
              notificationTitle: `${reviewer?.full_name || "Your reviewer"} approved "${estimate.project_name}"`,
            });
            conversationId = conversation.id;
          } catch (err) {
            console.error("Failed to start post-approval conversation:", err);
          }
        }

        const nextLink = conversationId ? `/messages/${conversationId}` : "/dashboard";

        sendMail({
          to: owner.email,
          subject: `Update on "${estimate.project_name}"`,
          html: estimateStatusEmail(estimate.project_name, status, nextLink),
        }).catch(() => {});

        notify(io, owner.id, {
          type: "estimate_status_changed",
          title: `"${estimate.project_name}" was updated`,
          body: `Status is now ${status.replace("_", " ")}.`,
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
