import { Op } from "sequelize";
import { PropertyVisit, Property } from "../models/index.js";
import { notify } from "./notify.js";

/**
 * Housekeeping that should happen by itself.
 *
 * Tours: a site tour our team has CONFIRMED completes on its own a set time
 * after it was scheduled (TOUR_AUTO_COMPLETE_HOURS, default 24; 0 turns this
 * off and leaves it entirely to the admin). Completing a tour is what lets
 * that visitor review the property, so:
 *   - only *confirmed* tours qualify - a person on the team agreed it was
 *     happening, so a self-made request can never review its way in;
 *   - the admin can still change any tour by hand at any time, before or
 *     after (e.g. set a no-show to Cancelled before the deadline passes).
 */

const HOUR_MS = 60 * 60 * 1000;

export function tourAutoCompleteHours(env = process.env) {
  const raw = env.TOUR_AUTO_COMPLETE_HOURS;
  const hours = raw === undefined || raw === "" ? 24 : Number(raw);
  return Number.isFinite(hours) && hours >= 0 ? hours : 24;
}

/** Returns how many tours were completed. Safe to call as often as you like. */
export async function completeElapsedTours(io, now = new Date()) {
  const hours = tourAutoCompleteHours();
  if (hours === 0) return 0;

  const cutoff = new Date(now.getTime() - hours * HOUR_MS);
  const due = await PropertyVisit.findAll({
    where: { status: "confirmed", preferred_date: { [Op.lt]: cutoff } },
    include: [{ model: Property, attributes: ["id", "title"] }],
  });

  for (const visit of due) {
    visit.status = "completed";
    visit.completed_at = now;
    await visit.save();
    notify(io, visit.user_id, {
      type: "review_unlocked",
      title: "How was your tour?",
      body: `You can now rate "${visit.Property?.title || "the property"}" from its page.`,
      link: `/marketplace/${visit.property_id}`,
    }).catch(() => {});
  }
  return due.length;
}

export function startMaintenance(io) {
  const tick = () =>
    completeElapsedTours(io).catch((err) => console.error("Maintenance error:", err.message));
  tick();
  return setInterval(tick, 10 * 60 * 1000).unref();
}
