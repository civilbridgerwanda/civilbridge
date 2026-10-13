import { Op } from "sequelize";
import { createHash } from "crypto";
import { Expert, User, ExpertPortfolio, PlanInquiry, Plan } from "../models/index.js";
import { LocationError, resolveLocation } from "../lib/locations.js";

// Gravatar's URL scheme is just an MD5 hash of the lowercased, trimmed
// email - `d=404` makes it return a real 404 instead of a default
// silhouette when the person has no Gravatar, so the client can detect
// "no Gravatar" and fall through to the next tier in the avatar fallback
// (Gravatar -> their own uploaded avatar_url -> initials).
function gravatarUrl(email) {
  if (!email) return null;
  const hash = createHash("md5").update(email.trim().toLowerCase()).digest("hex");
  return `https://www.gravatar.com/avatar/${hash}?d=404&s=200`;
}

// Verified experts always come first; among equals, real ratings decide. An
// unreviewed expert has no rating at all, so it never outranks a reviewed one.
const orderMap = {
  rating: [
    ["is_verified", "DESC"],
    ["rating", "DESC"],
    ["review_count", "DESC"],
    ["created_at", "DESC"],
  ],
  reviews: [["review_count", "DESC"]],
  experience: [["years_experience", "DESC"]],
  projects: [["completed_projects", "DESC"]],
};

function serialize(e) {
  return {
    id: e.id,
    category: e.category,
    specialty: e.specialty,
    specialization: e.specialization,
    bio: e.bio,
    years_experience: e.years_experience,
    is_verified: e.is_verified,
    rating: e.rating,
    review_count: e.review_count,
    completed_projects: e.completed_projects,
    avatar_url: e.avatar_url,
    gravatar_url: gravatarUrl(e.User?.email),
    city: e.city,
    district: e.district,
    sector: e.sector,
    view_count: e.view_count,
    full_name: e.User?.full_name,
    email: e.User?.email,
    user_id: e.User?.id,
    portfolio: e.portfolio,
  };
}

// GET /api/experts?category=engineer&district=Gasabo&sector=Remera&search=marie&sort=rating
export async function list(req, res) {
  try {
    const { category, district, sector, search, sort, min_rating, verified_only, min_experience } = req.query;
    const where = {};

    if (category && category !== "all") where.category = category;
    if (district && district !== "all") where.district = district;
    if (sector && sector !== "all") where.sector = sector;
    if (search) {
      where[Op.or] = [
        { specialty: { [Op.like]: `%${search}%` } },
        { specialization: { [Op.like]: `%${search}%` } },
        { district: { [Op.like]: `%${search}%` } },
        { sector: { [Op.like]: `%${search}%` } },
        { "$User.full_name$": { [Op.like]: `%${search}%` } },
      ];
    }
    if (min_rating) where.rating = { [Op.gte]: Number(min_rating) };
    if (verified_only === "true") where.is_verified = true;
    if (min_experience) where.years_experience = { [Op.gte]: Number(min_experience) };

    const experts = await Expert.findAll({
      where,
      include: [{ model: User, attributes: ["id", "full_name", "email"] }],
      order: orderMap[sort] || orderMap.rating,
      subQuery: false,
    });

    res.json({ success: true, data: experts.map(serialize) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch experts" });
  }
}

// GET /api/experts/me  (the signed-in user's own expert profile, if any)
export async function me(req, res) {
  try {
    const expert = await Expert.findOne({
      where: { user_id: req.user.sub },
      include: [{ model: User, attributes: ["id", "full_name", "email"] }],
    });
    res.json({ success: true, data: expert ? serialize(expert) : null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch your expert profile" });
  }
}

// GET /api/experts/me/plan-inquiries  (plan inquiries an admin has assigned to this expert)
export async function myPlanInquiries(req, res) {
  try {
    const expert = await Expert.findOne({ where: { user_id: req.user.sub } });
    if (!expert) {
      return res.status(403).json({ success: false, message: "No expert profile found for this account" });
    }

    const inquiries = await PlanInquiry.findAll({
      where: { assigned_expert_id: expert.id },
      include: [{ model: Plan, attributes: ["id", "title"] }],
      order: [["created_at", "DESC"]],
    });
    res.json({ success: true, data: inquiries });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch assigned plan inquiries" });
  }
}

// GET /api/experts/:id
export async function getById(req, res) {
  try {
    const expert = await Expert.findByPk(req.params.id, {
      include: [
        { model: User, attributes: ["id", "full_name", "email"] },
        { model: ExpertPortfolio, as: "portfolio", attributes: ["id", "title", "description", "image_url", "created_at"] },
      ],
    });
    if (!expert) {
      return res.status(404).json({ success: false, message: "Expert not found" });
    }
    expert.increment("view_count").catch(() => {});
    res.json({ success: true, data: serialize(expert) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch expert" });
  }
}

// POST /api/experts  (create/update the signed-in user's own expert profile)
export async function upsert(req, res) {
  try {
    const { category, specialty, specialization, bio, years_experience, district, sector, avatar_url } = req.body;
    if (!category || !specialty) {
      return res.status(400).json({ success: false, message: "Category and specialty are required" });
    }
    // Where they work - a real district and one of its sectors, no exact address.
    const location = resolveLocation(district, sector, { required: true, sectorRequired: true });

    const [expert] = await Expert.findOrCreate({
      where: { user_id: req.user.sub },
      defaults: { category, specialty, specialization, bio, years_experience, ...location, avatar_url },
    });

    // If a profile already existed, update it with the latest submission.
    expert.category = category;
    expert.specialty = specialty;
    expert.specialization = specialization;
    expert.bio = bio;
    expert.years_experience = years_experience || 0;
    expert.district = location.district;
    expert.sector = location.sector;
    if (avatar_url) expert.avatar_url = avatar_url;
    await expert.save();

    // Being listed in the Expert Directory is a "client, but also does
    // professional work" role, not a replacement for their account role -
    // only promote if they're still a plain client.
    const user = await User.findByPk(req.user.sub);
    if (user && user.role === "client") {
      user.role = "expert";
      await user.save();
    }

    const withUser = await Expert.findByPk(expert.id, {
      include: [{ model: User, attributes: ["id", "full_name", "email"] }],
    });
    res.status(201).json({ success: true, data: serialize(withUser) });
  } catch (err) {
    if (err instanceof LocationError) {
      return res.status(400).json({ success: false, message: err.message });
    }
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to save expert profile" });
  }
}

// ---------- Portfolio ("recent work") ----------

// POST /api/experts/portfolio  (add to the signed-in user's own expert profile)
export async function addPortfolioItem(req, res) {
  try {
    const { title, description, image_url } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, message: "Title is required" });
    }

    const expert = await Expert.findOne({ where: { user_id: req.user.sub } });
    if (!expert) {
      return res.status(403).json({ success: false, message: "No expert profile found for this account" });
    }

    const item = await ExpertPortfolio.create({ expert_id: expert.id, title, description, image_url });
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to add portfolio item" });
  }
}

// DELETE /api/experts/portfolio/:id  (must belong to the signed-in user's own expert profile)
export async function deletePortfolioItem(req, res) {
  try {
    const expert = await Expert.findOne({ where: { user_id: req.user.sub } });
    if (!expert) {
      return res.status(403).json({ success: false, message: "No expert profile found for this account" });
    }

    const item = await ExpertPortfolio.findOne({ where: { id: req.params.id, expert_id: expert.id } });
    if (!item) {
      return res.status(404).json({ success: false, message: "Portfolio item not found" });
    }

    await item.destroy();
    res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to delete portfolio item" });
  }
}
