import { Op } from "sequelize";
import { Property, PropertyVisit, User } from "../models/index.js";
import { EVENTS } from "../sockets/index.js";
import { broadcastNewListing } from "../lib/broadcastListing.js";
import { LocationError, resolveLocation } from "../lib/locations.js";
import { startConversationWithMessage } from "../lib/conversations.js";
import { assertCanListProperty, LimitError } from "../lib/limits.js";

// GET /api/properties?type=house&district=Gasabo&sector=Kimironko&search=villa&sort=price_asc
//                    &price_min=30000000&price_max=100000000
//                    &bedrooms=3&bathrooms=2&size_min=150&featured=true&limit=8
export async function list(req, res) {
  try {
    const { type, district, sector, search, sort, price_min, price_max, bedrooms, bathrooms, size_min, featured, limit } =
      req.query;
    const where = {};

    if (type && type !== "all") where.property_type = type;
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

    const { title, description, property_type, price, district, sector, size_sqm, bedrooms, bathrooms, image_url, images } =
      req.body;

    // District and sector must both be real, matching Rwandan administrative
    // areas - see lib/locations.js.
    const location = resolveLocation(district, sector, { required: true, sectorRequired: true });
    await assertCanListProperty(req.user.sub); // the plan's active-listing cap

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
      ...location,
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
    if (err instanceof LocationError) {
      return res.status(400).json({ success: false, message: err.message });
    }
    if (err instanceof LimitError) {
      return res.status(err.status).json({ success: false, code: err.code, limit: err.limit, message: err.message });
    }
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

// POST /api/properties/:id/visits
//   { mode: "tour" | "details", phone, preferred_date?, message?, full_name?, email? }
//
// Gatekeeping: every tour request and enquiry goes to CivilBridge support
// first, never straight to the listing's owner - the team is the single point
// of contact and relays it on. A *tour* additionally leaves a property_visits
// record, which is the proof that later lets this person review the property
// (once the team marks the visit completed - see lib/reviews.js).
export async function requestVisit(req, res) {
  try {
    const io = req.app.get("io");
    const property = await Property.findByPk(req.params.id, {
      include: [{ model: User, as: "owner", attributes: ["id", "full_name"] }],
    });
    if (!property || (!property.is_approved && req.user.role !== "admin")) {
      return res.status(404).json({ success: false, message: "Property not found" });
    }
    if (property.owner_id && property.owner_id === req.user.sub) {
      return res.status(400).json({ success: false, message: "That's your own listing." });
    }

    const { mode, phone, preferred_date, message, full_name, email } = req.body || {};
    const isTour = mode === "tour";
    const cleanPhone = typeof phone === "string" ? phone.trim().slice(0, 40) : "";
    if (cleanPhone.replace(/\D/g, "").length < 7) {
      return res.status(400).json({ success: false, message: "Please enter a phone or WhatsApp number we can reach you on." });
    }

    let visitDate = null;
    if (isTour) {
      visitDate = preferred_date ? new Date(preferred_date) : null;
      if (!visitDate || Number.isNaN(visitDate.getTime())) {
        return res.status(400).json({ success: false, message: "Please choose a preferred date and time for the tour." });
      }
    }
    const note = typeof message === "string" ? message.trim().slice(0, 500) : "";

    let visit = null;
    if (isTour) {
      // One open request per person per property - asking again updates it.
      visit = await PropertyVisit.findOne({
        where: { property_id: property.id, user_id: req.user.sub, status: { [Op.in]: ["requested", "confirmed"] } },
      });
      if (visit) {
        visit.preferred_date = visitDate;
        visit.phone = cleanPhone;
        visit.note = note || null;
        await visit.save();
      } else {
        visit = await PropertyVisit.create({
          property_id: property.id,
          user_id: req.user.sub,
          preferred_date: visitDate,
          phone: cleanPhone,
          note: note || null,
        });
      }
    }

    const requester = await User.findByPk(req.user.sub, { attributes: ["full_name", "email"] });
    const support = await User.findOne({ where: { role: "admin" }, attributes: ["id"], order: [["created_at", "ASC"]] });
    let conversationId = null;
    if (support && support.id !== req.user.sub) {
      const lines = [
        isTour ? `Site tour request for "${property.title}"` : `Enquiry about "${property.title}"`,
        property.owner && `Listing owner: ${property.owner.full_name} (${property.owner.id})`,
        visitDate && `Preferred date/time: ${visitDate.toLocaleString()}`,
        `Contact: ${full_name || requester?.full_name} / ${email || requester?.email} / ${cleanPhone}`,
        "",
        note || (isTour ? "I'd like to schedule a visit to see this property." : "I'd like more information about this listing."),
      ];
      const conversation = await startConversationWithMessage(io, {
        senderId: req.user.sub,
        recipientId: support.id,
        content: lines.filter((l) => l !== null && l !== undefined && l !== false).join("\n"),
        notificationTitle: `${requester?.full_name || "A client"} sent a ${isTour ? "tour request" : "property enquiry"}`,
      });
      conversationId = conversation.id;
    }

    res.status(201).json({ success: true, data: { visit, conversation_id: conversationId } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to send your request" });
  }
}
