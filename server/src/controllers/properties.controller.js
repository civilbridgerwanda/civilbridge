import { Op } from "sequelize";
import { Property, User } from "../models/index.js";
import { EVENTS } from "../sockets/index.js";

// GET /api/properties?type=house&city=Kigali&search=villa&sort=price_asc
//                    &price_min=30000000&price_max=100000000
//                    &bedrooms=3&bathrooms=2&size_min=150
export async function list(req, res) {
  try {
    const { type, city, search, sort, price_min, price_max, bedrooms, bathrooms, size_min } = req.query;
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

    const orderMap = {
      price_asc: [["price", "ASC"]],
      price_desc: [["price", "DESC"]],
      newest: [["created_at", "DESC"]],
    };

    const rows = await Property.findAll({
      where,
      order: orderMap[sort] || [["created_at", "DESC"]],
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
    } = req.body;

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
      image_url,
    });

    if (req.user.role === "client") {
      await User.update({ role: "property_owner" }, { where: { id: req.user.sub, role: "client" } });
    }

    // Push to every connected client in real time - no refresh needed.
    req.app.get("io").emit(EVENTS.PROPERTY_CREATED, property);

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
