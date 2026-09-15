import { Op } from "sequelize";
import { Expert, User, ExpertReview, ExpertPortfolio, PlanInquiry, Plan } from "../models/index.js";

const orderMap = {
  rating: [
    ["rating", "DESC"],
    ["review_count", "DESC"],
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
    city: e.city,
    view_count: e.view_count,
    full_name: e.User?.full_name,
    email: e.User?.email,
    user_id: e.User?.id,
    portfolio: e.portfolio,
  };
}

// GET /api/experts?category=engineer&city=Kigali&search=marie&sort=rating
export async function list(req, res) {
  try {
    const { category, city, search, sort, min_rating, verified_only, min_experience } = req.query;
    const where = {};

    if (category && category !== "all") where.category = category;
    if (city && city !== "all") where.city = city;
    if (search) {
      where[Op.or] = [
        { specialty: { [Op.like]: `%${search}%` } },
        { specialization: { [Op.like]: `%${search}%` } },
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
    const { category, specialty, specialization, bio, years_experience, city, avatar_url } = req.body;
    if (!category || !specialty) {
      return res.status(400).json({ success: false, message: "Category and specialty are required" });
    }

    const [expert] = await Expert.findOrCreate({
      where: { user_id: req.user.sub },
      defaults: { category, specialty, specialization, bio, years_experience, city, avatar_url },
    });

    // If a profile already existed, update it with the latest submission.
    expert.category = category;
    expert.specialty = specialty;
    expert.specialization = specialization;
    expert.bio = bio;
    expert.years_experience = years_experience || 0;
    expert.city = city;
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
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to save expert profile" });
  }
}

// ---------- Reviews ----------

async function recomputeRating(expertId) {
  const reviews = await ExpertReview.findAll({ where: { expert_id: expertId }, attributes: ["rating"] });
  const review_count = reviews.length;
  const rating = review_count ? reviews.reduce((sum, r) => sum + r.rating, 0) / review_count : 0;
  await Expert.update({ rating: Math.round(rating * 10) / 10, review_count }, { where: { id: expertId } });
}

// GET /api/experts/:id/reviews
export async function listReviews(req, res) {
  try {
    const reviews = await ExpertReview.findAll({
      where: { expert_id: req.params.id },
      include: [{ model: User, as: "reviewer", attributes: ["full_name"] }],
      order: [["created_at", "DESC"]],
    });
    res.json({ success: true, data: reviews });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch reviews" });
  }
}

// POST /api/experts/:id/reviews  { rating, comment }
// One review per (expert, reviewer) - submitting again updates it.
export async function upsertReview(req, res) {
  try {
    const { rating, comment } = req.body;
    const ratingNum = Number(rating);
    if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });
    }

    const expert = await Expert.findByPk(req.params.id);
    if (!expert) {
      return res.status(404).json({ success: false, message: "Expert not found" });
    }
    if (expert.user_id === req.user.sub) {
      return res.status(400).json({ success: false, message: "You can't review your own profile" });
    }

    const [review] = await ExpertReview.findOrCreate({
      where: { expert_id: expert.id, reviewer_id: req.user.sub },
      defaults: { rating: ratingNum, comment },
    });
    review.rating = ratingNum;
    review.comment = comment;
    review.updated_at = new Date();
    await review.save();

    await recomputeRating(expert.id);

    const withReviewer = await ExpertReview.findByPk(review.id, {
      include: [{ model: User, as: "reviewer", attributes: ["full_name"] }],
    });
    res.status(201).json({ success: true, data: withReviewer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to submit review" });
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
