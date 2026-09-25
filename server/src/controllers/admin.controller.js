import { Op } from "sequelize";
import {
  User,
  Property,
  Expert,
  Estimate,
  Plan,
  NewsletterSubscriber,
  NewsletterCampaign,
  AiConversation,
  Payment,
  Conversation,
  Message,
  PlanInquiry,
} from "../models/index.js";
import { listAll as listAllPayments, updateStatus as updatePaymentStatus } from "./payments.controller.js";
import { sendMail } from "../config/mailer.js";
import { notify } from "../lib/notify.js";
import { broadcastNewListing } from "../lib/broadcastListing.js";
import { EVENTS } from "../sockets/index.js";

export { listAllPayments, updatePaymentStatus };

// GET /api/admin/analytics
// Powers the Overview charts (estimate volume, user growth) and the
// cross-feature "Everything Controlled" analytics tab: how much each of
// Marketplace / Experts / Plans / Estimator / AI Studio is actually used,
// plus most-viewed and top-rated leaderboards.
export async function analytics(req, res) {
  try {
    const now = new Date();

    // Weekly estimate volume - last 4 weeks.
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 28);
    const recentEstimates = await Estimate.findAll({
      where: { created_at: { [Op.gte]: weekStart } },
      attributes: ["created_at"],
    });

    const weeklyEstimates = Array.from({ length: 4 }, (_, i) => ({ label: `Week ${i + 1}`, count: 0 }));
    recentEstimates.forEach((e) => {
      const daysAgo = Math.floor((now - new Date(e.created_at)) / (1000 * 60 * 60 * 24));
      const weekIndex = 3 - Math.floor(daysAgo / 7);
      if (weekIndex >= 0 && weekIndex < 4) weeklyEstimates[weekIndex].count += 1;
    });

    // Monthly user growth by role - last 6 months.
    const monthsBack = 6;
    const monthStart = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1);
    const recentUsers = await User.findAll({
      where: { created_at: { [Op.gte]: monthStart } },
      attributes: ["created_at", "role"],
    });

    const months = Array.from({ length: monthsBack }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1 - i), 1);
      return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString(undefined, { month: "short" }) };
    });
    const buckets = Object.fromEntries(months.map((m) => [m.key, { clients: 0, experts: 0 }]));
    recentUsers.forEach((u) => {
      const d = new Date(u.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (buckets[key] && u.role !== "admin") {
        buckets[key][u.role === "expert" ? "experts" : "clients"] += 1;
      }
    });
    const monthlyUserGrowth = months.map((m) => ({ label: m.label, ...buckets[m.key] }));

    // Feature usage across the 5 core sections of the app - "how much is
    // each part of CivilBridge actually being used".
    const [marketplaceCount, expertsCount, plansCount, estimatorCount, aiStudioCount] = await Promise.all([
      Property.count(),
      Expert.count(),
      Plan.count(),
      Estimate.count(),
      AiConversation.count(),
    ]);
    const featureUsage = [
      { label: "Marketplace", value: marketplaceCount },
      { label: "Experts", value: expertsCount },
      { label: "Plans", value: plansCount },
      { label: "Estimator", value: estimatorCount },
      { label: "AI Studio", value: aiStudioCount },
    ];

    // Leaderboards.
    const [topProperties, topExperts, topPlans] = await Promise.all([
      Property.findAll({
        attributes: ["id", "title", "city", "view_count"],
        order: [["view_count", "DESC"]],
        limit: 5,
      }),
      Expert.findAll({
        attributes: ["id", "specialty", "rating", "review_count", "view_count"],
        include: [{ model: User, attributes: ["full_name"] }],
        order: [
          ["rating", "DESC"],
          ["view_count", "DESC"],
        ],
        limit: 5,
      }),
      Plan.findAll({
        attributes: ["id", "title", "rating", "view_count"],
        order: [["view_count", "DESC"]],
        limit: 5,
      }),
    ]);

    // Payments / revenue snapshot.
    const [completedPayments, pendingPaymentsCount] = await Promise.all([
      Payment.findAll({ where: { status: "completed" }, attributes: ["amount"] }),
      Payment.count({ where: { status: "pending" } }),
    ]);
    const totalRevenue = completedPayments.reduce((sum, p) => sum + Number(p.amount), 0);

    res.json({
      success: true,
      data: {
        weeklyEstimates,
        monthlyUserGrowth,
        featureUsage,
        topProperties,
        topExperts: topExperts.map((e) => ({
          id: e.id,
          full_name: e.User?.full_name,
          specialty: e.specialty,
          rating: e.rating,
          review_count: e.review_count,
          view_count: e.view_count,
        })),
        topPlans,
        totalRevenue,
        pendingPaymentsCount,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch analytics" });
  }
}

// GET /api/admin/stats
export async function stats(req, res) {
  try {
    const [userCount, propertyCount, expertCount, planCount, subscriberCount, estimates, paymentCount] =
      await Promise.all([
        User.count(),
        Property.count(),
        Expert.count(),
        Plan.count(),
        NewsletterSubscriber.count({ where: { is_active: true } }),
        Estimate.findAll({ attributes: ["status"] }),
        Payment.count(),
      ]);

    const estimatesByStatus = estimates.reduce((acc, e) => {
      acc[e.status] = (acc[e.status] || 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        userCount,
        propertyCount,
        expertCount,
        planCount,
        subscriberCount,
        estimateCount: estimates.length,
        estimatesByStatus,
        paymentCount,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch stats" });
  }
}

// GET /api/admin/estimates?status=under_review
export async function listEstimates(req, res) {
  try {
    const { status } = req.query;
    const where = status && status !== "all" ? { status } : {};
    const estimates = await Estimate.findAll({
      where,
      include: [{ model: User, attributes: ["full_name", "email"] }],
      order: [["created_at", "DESC"]],
      limit: 100,
    });
    res.json({ success: true, data: estimates });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch estimates" });
  }
}

// ---------- Users ----------

// GET /api/admin/users?search=marie&role=expert
export async function listUsers(req, res) {
  try {
    const { search, role } = req.query;
    const where = {};
    if (role && role !== "all") where.role = role;
    if (search) {
      where[Op.or] = [
        { full_name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }

    const users = await User.findAll({
      where,
      attributes: ["id", "full_name", "email", "role", "phone", "email_verified", "is_suspended", "plan", "requested_plan"],
      order: [["id", "DESC"]],
      limit: 200,
    });
    res.json({ success: true, data: users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
}

// GET /api/admin/users/:id  (full profile + activity summary, for the
// admin's "view all information about this user" detail panel)
export async function getUserDetail(req, res) {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: ["id", "full_name", "email", "phone", "role", "email_verified", "is_suspended", "plan", "created_at"],
    });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const [expertProfile, propertyCount, estimateCount, paymentsMade, conversationsCount] = await Promise.all([
      Expert.findOne({ where: { user_id: user.id } }),
      Property.count({ where: { owner_id: user.id } }),
      Estimate.count({ where: { user_id: user.id } }),
      Payment.findAll({ where: { payer_id: user.id }, attributes: ["amount", "status"] }),
      // A user is a participant in a conversation via either side of the pair.
      Conversation.count({ where: { [Op.or]: [{ user_a_id: user.id }, { user_b_id: user.id }] } }),
    ]);

    res.json({
      success: true,
      data: {
        ...user.toJSON(),
        expertProfile,
        propertyCount,
        estimateCount,
        conversationsCount,
        paymentsTotal: paymentsMade
          .filter((p) => p.status === "completed")
          .reduce((sum, p) => sum + Number(p.amount), 0),
        paymentsCount: paymentsMade.length,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch user detail" });
  }
}

// PATCH /api/admin/users/:id/role  { role: "client" | "expert" | "property_owner" | "admin" }
export async function updateUserRole(req, res) {
  try {
    const { role } = req.body;
    if (!["client", "expert", "property_owner", "admin"].includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role" });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Guard against an admin locking themselves out by demoting the only
    // remaining admin account.
    if (user.role === "admin" && role !== "admin") {
      const adminCount = await User.count({ where: { role: "admin" } });
      if (adminCount <= 1) {
        return res.status(400).json({ success: false, message: "Can't remove the last admin account" });
      }
    }

    user.role = role;
    await user.save();

    res.json({
      success: true,
      data: { id: user.id, full_name: user.full_name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to update role" });
  }
}

// PATCH /api/admin/users/:id/plan  { plan: "starter" | "professional" | "business" }
export async function updateUserPlan(req, res) {
  try {
    const { plan } = req.body;
    if (!["starter", "professional", "business"].includes(plan)) {
      return res.status(400).json({ success: false, message: "Invalid plan" });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.plan = plan;
    // Setting the plan directly (whatever it's set to) resolves any pending
    // upgrade request - there's nothing left to approve or deny once an
    // admin has acted on it.
    user.requested_plan = null;
    await user.save();

    if (plan !== "starter") {
      notify(req.app.get("io"), user.id, {
        type: "plan_upgraded",
        title: `You're now on the ${plan[0].toUpperCase()}${plan.slice(1)} plan`,
        body: "Thanks for upgrading! Enjoy your new features.",
        link: "/settings",
      }).catch(() => {});
    }

    res.json({
      success: true,
      data: { id: user.id, full_name: user.full_name, email: user.email, plan: user.plan, requested_plan: user.requested_plan },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to update plan" });
  }
}

// PATCH /api/admin/users/:id/suspend  { suspended: true | false }
// Suspension is enforced at login (password and OAuth) - it doesn't kill
// an already-issued JWT immediately, since sessions here are stateless.
export async function suspendUser(req, res) {
  try {
    const { suspended } = req.body;
    if (typeof suspended !== "boolean") {
      return res.status(400).json({ success: false, message: "'suspended' must be true or false" });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.role === "admin" && suspended) {
      const adminCount = await User.count({ where: { role: "admin", is_suspended: false } });
      if (adminCount <= 1) {
        return res.status(400).json({ success: false, message: "Can't suspend the last active admin account" });
      }
    }

    user.is_suspended = suspended;
    await user.save();

    res.json({
      success: true,
      data: { id: user.id, full_name: user.full_name, email: user.email, is_suspended: user.is_suspended },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to update suspension status" });
  }
}

// DELETE /api/admin/users/:id
// Cascades per the FK constraints in sql/schema.sql: their expert profile,
// OTPs, OAuth links, notifications, conversations, and payments they made
// are deleted with them; their properties/estimates are kept but detached
// (owner_id/user_id set to NULL) rather than deleted.
export async function deleteUser(req, res) {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (user.id === req.user.sub) {
      return res.status(400).json({ success: false, message: "You can't delete your own account from here" });
    }
    if (user.role === "admin") {
      const adminCount = await User.count({ where: { role: "admin" } });
      if (adminCount <= 1) {
        return res.status(400).json({ success: false, message: "Can't delete the last admin account" });
      }
    }

    await user.destroy();
    res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to delete user" });
  }
}

// ---------- Properties (admin management) ----------

// POST /api/admin/properties
export async function createProperty(req, res) {
  try {
    const property = await Property.create({ ...req.body, owner_id: req.body.owner_id || null });
    broadcastNewListing({ kind: "property", title: property.title, id: property.id }).catch(() => {});
    res.status(201).json({ success: true, data: property });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to create property" });
  }
}

// PATCH /api/admin/properties/:id
export async function updateProperty(req, res) {
  try {
    const property = await Property.findByPk(req.params.id);
    if (!property) {
      return res.status(404).json({ success: false, message: "Property not found" });
    }
    const editable = [
      "title", "description", "property_type", "price", "city", "district", "size_sqm",
      "bedrooms", "bathrooms", "image_url", "images", "is_featured", "status",
    ];
    for (const field of editable) {
      if (field in req.body) property[field] = req.body[field];
    }
    await property.save();
    res.json({ success: true, data: property });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to update property" });
  }
}

// PATCH /api/admin/properties/:id/approve
// The moment an owner-submitted listing (see properties.controller.js's
// create()) actually goes live - this is where the "new listing" socket
// event and newsletter broadcast fire, not at submission time.
export async function approveProperty(req, res) {
  try {
    const property = await Property.findByPk(req.params.id);
    if (!property) {
      return res.status(404).json({ success: false, message: "Property not found" });
    }
    if (property.is_approved) {
      return res.json({ success: true, data: property });
    }
    property.is_approved = true;
    await property.save();

    req.app.get("io").emit(EVENTS.PROPERTY_CREATED, property);
    broadcastNewListing({ kind: "property", title: property.title, id: property.id }).catch(() => {});

    res.json({ success: true, data: property });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to approve property" });
  }
}

// DELETE /api/admin/properties/:id
export async function deleteProperty(req, res) {
  try {
    const property = await Property.findByPk(req.params.id);
    if (!property) {
      return res.status(404).json({ success: false, message: "Property not found" });
    }
    await property.destroy();
    res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to delete property" });
  }
}

// ---------- Plans (admin management) ----------

// POST /api/admin/plans
export async function createPlan(req, res) {
  try {
    const plan = await Plan.create(req.body);
    broadcastNewListing({ kind: "plan", title: plan.title, id: plan.id }).catch(() => {});
    res.status(201).json({ success: true, data: plan });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to create plan" });
  }
}

// PATCH /api/admin/plans/:id
export async function updatePlan(req, res) {
  try {
    const plan = await Plan.findByPk(req.params.id);
    if (!plan) {
      return res.status(404).json({ success: false, message: "Plan not found" });
    }
    const editable = [
      "title", "description", "plan_type", "price", "city", "bedrooms", "bathrooms", "size_sqm", "rating", "badge",
      "is_prime_location", "image_url", "images", "document_url", "video_url", "zip_url", "license_price",
    ];
    for (const field of editable) {
      if (field in req.body) plan[field] = req.body[field];
    }
    await plan.save();
    res.json({ success: true, data: plan });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to update plan" });
  }
}

// DELETE /api/admin/plans/:id
export async function deletePlan(req, res) {
  try {
    const plan = await Plan.findByPk(req.params.id);
    if (!plan) {
      return res.status(404).json({ success: false, message: "Plan not found" });
    }
    await plan.destroy();
    res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to delete plan" });
  }
}

// ---------- Newsletter ----------

// GET /api/admin/newsletter
export async function listSubscribers(req, res) {
  try {
    const subscribers = await NewsletterSubscriber.findAll({
      order: [["subscribed_at", "DESC"]],
      limit: 500,
    });
    res.json({ success: true, data: subscribers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch subscribers" });
  }
}

// GET /api/admin/newsletter/campaigns
export async function listCampaigns(req, res) {
  try {
    const campaigns = await NewsletterCampaign.findAll({ order: [["created_at", "DESC"]], limit: 50 });
    res.json({ success: true, data: campaigns });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch campaigns" });
  }
}

// POST /api/admin/newsletter/send  { subject, body }
// Sends to every active subscriber. Emails go out sequentially (not
// Promise.all) to avoid hammering the SMTP provider with a burst of
// simultaneous sends on a large list.
export async function sendCampaign(req, res) {
  try {
    const { subject, body } = req.body;
    if (!subject || !body) {
      return res.status(400).json({ success: false, message: "Subject and body are required" });
    }

    const subscribers = await NewsletterSubscriber.findAll({ where: { is_active: true } });

    let sentCount = 0;
    for (const sub of subscribers) {
      const result = await sendMail({
        to: sub.email,
        subject,
        html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">${body.replace(/\n/g, "<br>")}</div>`,
      });
      if (result.sent) sentCount += 1;
    }

    const campaign = await NewsletterCampaign.create({
      subject,
      body,
      sent_count: sentCount,
      sent_by: req.user.sub,
    });

    res.status(201).json({ success: true, data: campaign });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to send newsletter" });
  }
}

// ---------- Plan Inquiries ("Talk to an Expert" requests) ----------

// GET /api/admin/plan-inquiries
export async function listPlanInquiries(req, res) {
  try {
    const inquiries = await PlanInquiry.findAll({
      include: [
        { model: Plan, attributes: ["id", "title"] },
        {
          model: Expert,
          as: "assignedExpert",
          attributes: ["id"],
          include: [{ model: User, attributes: ["full_name"] }],
        },
      ],
      order: [["created_at", "DESC"]],
      limit: 200,
    });
    res.json({ success: true, data: inquiries });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch inquiries" });
  }
}

// PATCH /api/admin/plan-inquiries/:id/status  { status }
export async function updatePlanInquiryStatus(req, res) {
  try {
    const { status } = req.body;
    if (!["new", "contacted", "closed"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const inquiry = await PlanInquiry.findByPk(req.params.id);
    if (!inquiry) {
      return res.status(404).json({ success: false, message: "Inquiry not found" });
    }

    inquiry.status = status;
    await inquiry.save();

    res.json({ success: true, data: inquiry });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to update inquiry" });
  }
}

// PATCH /api/admin/plan-inquiries/:id/assign  { expert_id }  (null to unassign)
export async function assignPlanInquiry(req, res) {
  try {
    const { expert_id } = req.body;

    const inquiry = await PlanInquiry.findByPk(req.params.id, { include: [{ model: Plan, attributes: ["title"] }] });
    if (!inquiry) {
      return res.status(404).json({ success: false, message: "Inquiry not found" });
    }

    if (expert_id) {
      const expert = await Expert.findByPk(expert_id);
      if (!expert) {
        return res.status(404).json({ success: false, message: "Expert not found" });
      }
      inquiry.assigned_expert_id = expert_id;
      await inquiry.save();

      notify(req.app.get("io"), expert.user_id, {
        type: "plan_assigned",
        title: `A plan was assigned to you: "${inquiry.Plan?.title || "a plan"}"`,
        body: `${inquiry.full_name} is interested and waiting to hear from you.`,
        link: "/expert-dashboard",
      }).catch(() => {});
    } else {
      inquiry.assigned_expert_id = null;
      await inquiry.save();
    }

    res.json({ success: true, data: inquiry });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to assign inquiry" });
  }
}

// ---------- Conversation oversight (compliance/moderation) ----------
// Read-only visibility into direct messaging between other users - the
// business needs a way to check for policy violations or off-platform
// deal-making without being a participant in the conversation itself.
// Every other conversation endpoint (messages.controller.js) enforces a
// participant-only check; these two are the one deliberate exception,
// gated instead by requireAdmin at the router level.

// GET /api/admin/conversations
export async function listAllConversations(req, res) {
  try {
    const conversations = await Conversation.findAll({
      include: [
        { model: User, as: "userA", attributes: ["id", "full_name", "email", "role"] },
        { model: User, as: "userB", attributes: ["id", "full_name", "email", "role"] },
      ],
      order: [["updated_at", "DESC"]],
      limit: 200,
    });

    const conversationIds = conversations.map((c) => c.id);
    const recentMessages = conversationIds.length
      ? await Message.findAll({ where: { conversation_id: conversationIds }, order: [["created_at", "DESC"]] })
      : [];
    const lastMessageByConversation = {};
    const messageCountByConversation = {};
    for (const m of recentMessages) {
      messageCountByConversation[m.conversation_id] = (messageCountByConversation[m.conversation_id] || 0) + 1;
      if (!(m.conversation_id in lastMessageByConversation)) {
        lastMessageByConversation[m.conversation_id] = m;
      }
    }

    const data = conversations.map((c) => ({
      id: c.id,
      userA: c.userA,
      userB: c.userB,
      lastMessage: lastMessageByConversation[c.id]?.content || null,
      messageCount: messageCountByConversation[c.id] || 0,
      updatedAt: c.updated_at,
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch conversations" });
  }
}

// GET /api/admin/conversations/:id
export async function getConversationDetail(req, res) {
  try {
    const conversation = await Conversation.findByPk(req.params.id, {
      include: [
        { model: User, as: "userA", attributes: ["id", "full_name", "email", "role"] },
        { model: User, as: "userB", attributes: ["id", "full_name", "email", "role"] },
        { model: Message, as: "messages", order: [["created_at", "ASC"]] },
      ],
    });
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }
    res.json({ success: true, data: conversation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch conversation" });
  }
}
