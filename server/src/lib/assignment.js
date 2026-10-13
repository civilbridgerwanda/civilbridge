import { Expert, User } from "../models/index.js";
import { alertAdmins } from "./adminAlerts.js";
import { notify } from "./notify.js";
import { workReadyAlertEmail } from "../config/emailTemplates.js";
import { EVENTS } from "../sockets/index.js";
import { sendMail } from "../config/mailer.js";
import { workReminderEmail } from "../config/emailTemplates.js";
import * as presence from "./presence.js";

/**
 * Who works on an estimate.
 *
 * Today the admin team assigns every piece of work by hand: when an estimate
 * needs a person (a new request while the agent is off, or an analysis that
 * has just finished or failed), the admins are alerted, pick an expert, and
 * only that expert can see and work on it. The client is simply told to wait
 * and is notified once everything is done.
 *
 * Everything that decides "who hears about new work" and "how it gets an
 * owner" lives in this file on purpose. As volume grows, the next step is to
 * alert every *capable* expert instead of the admins and let the first to
 * accept claim it (a single conditional UPDATE on assigned_expert_id) - that
 * change belongs here, in announceWorkReady() plus one claim function, and
 * nothing else in the app needs to know.
 */

const EMAIL_NOTES = {
  needs_analysis:
    "A client has uploaded a plan and nothing will analyse it automatically, so it needs an expert to do the analysis. Assign one from the Estimates tab.",
  analysis_ready:
    "The automatic analysis has finished. Assign an expert from the Estimates tab to check it and verify the results - the client is waiting.",
  analysis_failed:
    "The automatic analysis failed, so this needs an expert to do it by hand. Assign one from the Estimates tab.",
};

const TITLES = {
  needs_analysis: "New estimate needs an expert",
  analysis_ready: "Analysis finished - assign an expert",
  analysis_failed: "Analysis failed - assign an expert",
};

/**
 * Tells the admin team a piece of work is ready to be handed to an expert.
 * `reason`: "needs_analysis" | "analysis_ready" | "analysis_failed"
 */
export async function announceWorkReady(io, estimate, reason) {
  // Professional/Business clients are flagged so they're handled first.
  const title = `${estimate.priority ? "Priority: " : ""}${TITLES[reason]}`;
  const link = "/admin?tab=Estimates";
  await alertAdmins(io, {
    type: "work_ready",
    title,
    body: estimate.project_name,
    link,
    emailSubject: `${title}: ${estimate.project_name}`,
    emailHtml: workReadyAlertEmail({ title, projectName: estimate.project_name, note: EMAIL_NOTES[reason], link }),
  });
}

export class AssignmentError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

/**
 * Hands an estimate to an expert (or, with expertId = null, takes it back).
 * Only verified experts can be assigned - verification is the credentials
 * check, so it's the natural definition of "capable" for now. Once an
 * estimate is verified it's locked to whoever verified it.
 */
export async function assignEstimate(io, estimate, expertId) {
  if (estimate.status === "verified") {
    throw new AssignmentError("This estimate is already verified, so it can't be reassigned.", 409);
  }

  let expert = null;
  if (expertId) {
    expert = await Expert.findByPk(expertId);
    if (!expert) throw new AssignmentError("Expert not found", 404);
    if (!expert.is_verified) {
      throw new AssignmentError("Verify this expert first (Admin > Experts) - only verified experts can be assigned work.", 409);
    }
  }

  const previousExpertId = estimate.assigned_expert_id;
  estimate.assigned_expert_id = expert ? expert.id : null;
  if ((expert ? expert.id : null) !== previousExpertId) {
    // A new assignee starts a fresh clock and a fresh follow-up allowance.
    estimate.assigned_at = expert ? new Date() : null;
    estimate.last_nudged_at = null;
  }
  estimate.updated_at = new Date();
  await estimate.save();

  if (expert && expert.id !== previousExpertId) {
    const client = estimate.user_id ? await User.findByPk(estimate.user_id, { attributes: ["full_name"] }) : null;
    notify(io, expert.user_id, {
      type: "estimate_assigned",
      title: `New work assigned: "${estimate.project_name}"`,
      body: `${client?.full_name ? `From ${client.full_name}. ` : ""}Open your dashboard to review it.`,
      link: "/expert-dashboard",
    }).catch(() => {});
  }

  // Refresh the client's open results page ("waiting for an expert" -> "an
  // expert has been assigned"). Status-only payload, as everywhere else.
  if (io && estimate.user_id) {
    io.to(`user:${estimate.user_id}`).emit(EVENTS.ESTIMATE_STATUS_CHANGED, {
      id: estimate.id,
      status: estimate.status,
      updated_at: estimate.updated_at,
    });
  }
  return { estimate, expert };
}

// One reminder per estimate per half hour - enough to chase someone up, not
// enough to spam them.
export const NUDGE_COOLDOWN_MS = 30 * 60 * 1000;

function since(date) {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(date).getTime()) / 60000));
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.round(minutes / 60);
  return hours < 48 ? `${hours} hour${hours === 1 ? "" : "s"}` : `${Math.round(hours / 24)} days`;
}

/**
 * The team following up on assigned work. Sends the expert an in-app reminder
 * and, if they're not on the site right now, an email as well. Returns what
 * happened so the admin can see whether the expert was even online.
 */
export async function nudgeAssignedExpert(io, estimate) {
  if (!estimate.assigned_expert_id) throw new AssignmentError("Assign an expert first.", 409);
  if (estimate.status === "verified") throw new AssignmentError("This estimate is already verified.", 409);

  if (estimate.last_nudged_at) {
    const wait = NUDGE_COOLDOWN_MS - (Date.now() - new Date(estimate.last_nudged_at).getTime());
    if (wait > 0) {
      throw new AssignmentError(`You already followed up recently - try again in ${Math.ceil(wait / 60000)} minutes.`, 429);
    }
  }

  const expert = await Expert.findByPk(estimate.assigned_expert_id, { include: [{ model: User, attributes: ["id", "email"] }] });
  if (!expert?.User) throw new AssignmentError("That expert no longer exists.", 404);

  const waiting = since(estimate.assigned_at || estimate.updated_at);
  notify(io, expert.User.id, {
    type: "work_reminder",
    title: `Reminder: "${estimate.project_name}" is waiting`,
    body: `Assigned ${waiting} ago - the client is waiting on it.`,
    link: "/expert-dashboard",
  }).catch(() => {});

  const status = presence.statusOf(expert.User.id);
  const emailed = status === "offline";
  if (emailed) {
    sendMail({
      to: expert.User.email,
      subject: `Reminder: "${estimate.project_name}" is waiting for you`,
      html: workReminderEmail({ projectName: estimate.project_name, waiting }),
    }).catch(() => {});
  }

  estimate.last_nudged_at = new Date();
  await estimate.save();
  return { presence: status, emailed, last_nudged_at: estimate.last_nudged_at };
}
