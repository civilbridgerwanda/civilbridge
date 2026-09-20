import { Op } from "sequelize";
import { Property, User, PropertyReview } from "../models/index.js";
import { EVENTS } from "../sockets/index.js";
import { broadcastNewListing } from "../lib/broadcastListing.js";

// GET /api/properties?type=house&city=Kigali&search=villa&sort=price_asc
//                    &price_min=30000000&price_max=100000000
//                    &bedrooms=3&bathrooms=2&size_min=150&featured=true&limit=8
export async function list(req, res) {
  try {
    const { type, city, search, sort, price_min, price_max, bedrooms, bathrooms, size_min, featured, limit } =
      req.query;
    const where = {};

    if (type && type !== "all") where.property_type = type;
    if (city && city !== "all") where.city = city;
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { city: { [Op.like]: `%${search}%` } },
        { district: { [Op.like]: `%${search}%` } },
      ];
    }
    if (price_min || price_max) {
      where.price = {};
      if (price_min) where.price[Op.gte] = Number(price_min);
      if (price_max) where.price[Op.lte] = Number(price_max);
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
    if (featured === "true") where.is_featured = true;
    // Owner-submitted listings are hidden from public browsing until an
    // admin approves them (see create() below) - admins see everything,
    // including their own pending queue, on the same endpoint.
    if (req.user?.role !== "admin") where.is_approved = true;

    const orderMap = {
      price_asc: [["price", "ASC"]],
      price_desc: [["price", "DESC"]],
      newest: [["created_at", "DESC"]],
    };

    const rows = await Property.findAll({
      where,
      order: orderMap[sort] || [["created_at", "DESC"]],
      limit: limit ? Number(limit) : undefined,
    });

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch properties" });
  }
}

// GET /api/properties/mine  (the signed-in user's own listings)
export async function mine(req, res) {
  try {
    const rows = await Property.findAll({
      where: { owner_id: req.user.sub },
      order: [["created_at", "DESC"]],
    });
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch your listings" });
  }
}

// GET /api/properties/:id
export async function getById(req, res) {
  try {
    const property = await Property.findByPk(req.params.id, {
      include: [{ model: User, as: "owner", attributes: ["id", "full_name", "email"] }],
    });
    if (!property) {
      return res.status(404).json({ success: false, message: "Property not found" });
    }
    const isOwner = property.owner_id && property.owner_id === req.user.sub;
    if (!property.is_approved && req.user.role !== "admin" && !isOwner) {
      return res.status(404).json({ success: false, message: "Property not found" });
    }
    // Fire-and-forget - a view counter shouldn't slow down or fail the
    // actual page load if it errors for any reason.
    property.increment("view_count").catch(() => {});
    res.json({ success: true, data: property });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch property" });
  }
}

// POST /api/properties  (requires sign-in; broadcasts a live update)
// Property listing is deliberately not available to the `expert` role -
// experts have their own dedicated dashboard and shouldn't also manage
// property listings. A plain `client` who lists their first property is
// automatically upgraded to `property_owner`, mirroring how submitting
// the "Join as Expert" form upgrades a client to `expert`.
export async function create(req, res) {
  try {
    if (req.user.role === "expert") {
      return res.status(403).json({
        success: false,
        message: "Property listing isn't available on expert accounts. Contact support if you need this changed.",
      });
    }

    const {
      title,
      description,
      property_type,
      price,
      city,
      district,
      size_sqm,
      bedrooms,
      bathrooms,
      image_url,
      images,
    } = req.body;

    // Anyone hitting this self-serve endpoint starts unapproved - hidden
    // from public browsing (see list()/getById() above) until an admin
    // reviews and approves it from the dashboard. The newsletter broadcast
    // fires later, from the approval action, not here - announcing a
    // listing nobody has reviewed yet would defeat the point of moderation.
    const isAdmin = req.user.role === "admin";

    const property = await Property.create({
      owner_id: req.user.sub,
      title,
      description,
      property_type,
      price,
      city,
      district,
      size_sqm,
      bedrooms: bedrooms ?? null,
      bathrooms: bathrooms ?? null,
      image_url: image_url || images?.[0] || null,
      images: images ?? null,
      is_approved: isAdmin,
    });

    if (req.user.role === "client") {
      await User.update({ role: "property_owner" }, { where: { id: req.user.sub, role: "client" } });
    }

    if (isAdmin) {
      req.app.get("io").emit(EVENTS.PROPERTY_CREATED, property);
      broadcastNewListing({ kind: "property", title: property.title, id: property.id }).catch(() => {});
    }

    res.status(201).json({ success: true, data: property });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to create property" });
  }
}

// DELETE /api/properties/:id  (the owner removing their own listing)
export async function remove(req, res) {
  try {
    const property = await Property.findByPk(req.params.id);
    if (!property) {
      return res.status(404).json({ success: false, message: "Property not found" });
    }
    if (property.owner_id !== req.user.sub) {
      return res.status(403).json({ success: false, message: "You can only remove your own listings" });
    }

    await property.destroy();
    res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to remove property" });
  }
}

// ---------- Reviews ----------

async function recomputeRating(propertyId) {
  const reviews = await PropertyReview.findAll({ where: { property_id: propertyId }, attributes: ["rating"] });
  const review_count = reviews.length;
  const rating = review_count ? reviews.reduce((sum, r) => sum + r.rating, 0) / review_count : 0;
  await Property.update({ rating: Math.round(rating * 10) / 10, review_count }, { where: { id: propertyId } });
}

// GET /api/properties/:id/reviews
export async function listReviews(req, res) {
  try {
    const reviews = await PropertyReview.findAll({
      where: { property_id: req.params.id },
      include: [{ model: User, as: "reviewer", attributes: ["full_name"] }],
      order: [["created_at", "DESC"]],
    });
    res.json({ success: true, data: reviews });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch reviews" });
  }
}

// POST /api/properties/:id/reviews  { rating, comment }
// One review per (property, reviewer) - submitting again updates it.
export async function upsertReview(req, res) {
  try {
    const { rating, comment } = req.body;
    const ratingNum = Number(rating);
    if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });
    }

    const property = await Property.findByPk(req.params.id);
    if (!property) {
      return res.status(404).json({ success: false, message: "Property not found" });
    }
    if (property.owner_id === req.user.sub) {
      return res.status(400).json({ success: false, message: "You can't review your own listing" });
    }

    const [review] = await PropertyReview.findOrCreate({
      where: { property_id: property.id, reviewer_id: req.user.sub },
      defaults: { rating: ratingNum, comment },
    });
    review.rating = ratingNum;
    review.comment = comment;
    review.updated_at = new Date();
    await review.save();

    await recomputeRating(property.id);

    const withReviewer = await PropertyReview.findByPk(review.id, {
      include: [{ model: User, as: "reviewer", attributes: ["full_name"] }],
    });
    res.status(201).json({ success: true, data: withReviewer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to submit review" });
  }
}
