import { Op } from "sequelize";
import { Plan, PlanInquiry, User } from "../models/index.js";
import { sendMail } from "../config/mailer.js";
import { planInquiryConfirmationEmail } from "../config/emailTemplates.js";
import { notify } from "../lib/notify.js";
import { hasPlanAccess, hasPendingPlanLicense } from "../lib/entitlements.js";

const orderMap = {
  featured: [
    ["rating", "DESC"],
    ["created_at", "DESC"],
  ],
  newest: [["created_at", "DESC"]],
  price_asc: [["price", "ASC"]],
  price_desc: [["price", "DESC"]],
  rating: [
    ["rating", "DESC"],
    ["review_count", "DESC"],
    ["created_at", "DESC"],
  ],
};

// GET /api/plans?type=house&district=Gasabo&sector=Remera&search=villa&bedrooms=3
//               &bathrooms=2&size_min=150
//               &price_min=30000000&price_max=100000000
//               &pill=newly_listed|best_value|prime_locations
//               &sort=featured
export async function list(req, res) {
  try {
    const { type, district, sector, search, bedrooms, bathrooms, size_min, price_min, price_max, pill, sort } = req.query;
    const where = {};

    if (type && type !== "all") where.plan_type = type;
    if (district && district !== "all") where.district = district;
    if (sector && sector !== "all") where.sector = sector;
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { city: { [Op.like]: `%${search}%` } },
        { district: { [Op.like]: `%${search}%` } },
        { sector: { [Op.like]: `%${search}%` } },
      ];
    }
    if (bedrooms && bedrooms !== "any") {
      where.bedrooms = bedrooms === "5+" ? { [Op.gte]: 5 } : Number(bedrooms);
    }
    if (bathrooms && bathrooms !== "any") {
      where.bathrooms = bathrooms === "4+" ? { [Op.gte]: 4 } : Number(bathrooms);
    }
    if (size_min) {
      where.size_sqm = { [Op.gte]: Number(size_min) };
    }
    if (price_min || price_max) {
      where.price = {};
      if (price_min) where.price[Op.gte] = Number(price_min);
      if (price_max) where.price[Op.lte] = Number(price_max);
    }

    let order = orderMap[sort] || orderMap.featured;
    if (pill === "newly_listed") order = orderMap.newest;
    if (pill === "best_value") order = orderMap.price_asc;
    if (pill === "prime_locations") where.is_prime_location = true;

    // This listing endpoint is public (no auth) - zip_url is the paid
    // deliverable, never appropriate to hand out here regardless of role.
    const rows = await Plan.findAll({ where, order, attributes: { exclude: ["zip_url"] } });
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch plans" });
  }
}

// GET /api/plans/:id
export async function getById(req, res) {
  try {
    const plan = await Plan.findByPk(req.params.id);
    if (!plan) {
      return res.status(404).json({ success: false, message: "Plan not found" });
    }
    plan.increment("view_count").catch(() => {});

    // zip_url is the actual paid deliverable, not a preview - it's only
    // included for someone entitled to it (an admin, a Professional/Business
    // subscriber, or a client with a completed payment for this exact plan;
    // see lib/entitlements.js). Everyone else gets `entitled: false` and no
    // link, plus whether a payment of theirs is already waiting on
    // confirmation so the page can say so instead of offering to pay twice.
    const data = plan.toJSON();
    data.entitled = await hasPlanAccess(req.user.sub, plan.id);
    if (!data.entitled) {
      delete data.zip_url;
      data.pending_payment = await hasPendingPlanLicense(req.user.sub, plan.id);
    }

    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch plan" });
  }
}

// POST /api/plans/:id/inquiries  { full_name, email, whatsapp, message }
// The "Talk to an Expert" form on a plan's detail page. Public - no
// account required, since the whole point is a low-friction way for a
// visitor to reach a real person.
export async function createInquiry(req, res) {
  try {
    const plan = await Plan.findByPk(req.params.id);
    if (!plan) {
      return res.status(404).json({ success: false, message: "Plan not found" });
    }

    const { full_name, email, whatsapp, message, preferred_date } = req.body;
    if (!full_name || !email || !whatsapp) {
      return res.status(400).json({ success: false, message: "Name, email, and WhatsApp number are required" });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ success: false, message: "Please enter a valid email address" });
    }

    const inquiry = await PlanInquiry.create({
      plan_id: plan.id,
      full_name,
      email,
      whatsapp,
      message: message || null,
      preferred_date: preferred_date || null,
    });

    // Confirmation to the person who asked - this is the actual promise
    // being made ("we'll get back to you within 24 hours"), so it must
    // send reliably, not silently swallow a failure like most other
    // "fire and forget" emails in this app.
    const result = await sendMail({
      to: email,
      subject: "We've received your request - CivilBridge",
      html: planInquiryConfirmationEmail(full_name, plan.title, plan.id),
    });

    // Let the team know - email plus an in-app notification for every admin.
    const to = process.env.CONTACT_EMAIL || process.env.SMTP_USER;
    if (to) {
      sendMail({
        to,
        subject: preferred_date ? `New site tour request: ${plan.title}` : `New plan inquiry: ${plan.title}`,
        html: `
          <p><strong>Plan:</strong> ${plan.title}</p>
          <p><strong>From:</strong> ${full_name} (${email})</p>
          <p><strong>WhatsApp:</strong> ${whatsapp}</p>
          ${preferred_date ? `<p><strong>Preferred date/time:</strong> ${new Date(preferred_date).toLocaleString()}</p>` : ""}
          ${message ? `<p><strong>Message:</strong> ${message.replace(/\n/g, "<br>")}</p>` : ""}
        `,
      }).catch(() => {});
    }

    const io = req.app.get("io");
    const admins = await User.findAll({ where: { role: "admin" }, attributes: ["id"] });
    for (const admin of admins) {
      notify(io, admin.id, {
        type: "plan_inquiry",
        title: `New ${preferred_date ? "site tour request" : "inquiry"} for "${plan.title}"`,
        body: preferred_date
          ? `${full_name} wants to book a site tour on ${new Date(preferred_date).toLocaleString()}.`
          : `${full_name} wants to talk to an expert about this plan.`,
        link: "/admin?tab=Inquiries",
      }).catch(() => {});
    }

    res.status(201).json({
      success: true,
      data: {
        inquiry,
        confirmationEmailSent: result.sent,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to submit your request" });
  }
}
