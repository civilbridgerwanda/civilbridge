import { User } from "../models/index.js";
import { sendMail } from "../config/mailer.js";
import { notify } from "./notify.js";

// "Something needs a person" alerts for the admin team: an in-app
// notification for every admin, plus an email so nobody has to be sitting on
// the dashboard to notice. OPS_EMAIL (one address, or several separated by
// commas) routes the email to whoever actually triages work; without it the
// email goes to the admin accounts themselves, so it works out of the box.
async function emailRecipients(admins) {
  if (process.env.OPS_EMAIL) {
    return process.env.OPS_EMAIL.split(",").map((e) => e.trim()).filter(Boolean);
  }
  return admins.map((a) => a.email).filter(Boolean);
}

/**
 * @param {object} io           Socket.IO instance (or null)
 * @param {object} alert        { type, title, body, link, emailSubject?, emailHtml? }
 *                              Leave emailHtml out to send the in-app alert only.
 */
export async function alertAdmins(io, { type, title, body, link, emailSubject, emailHtml }) {
  const admins = await User.findAll({ where: { role: "admin" }, attributes: ["id", "email"] });

  await Promise.all(admins.map((admin) => notify(io, admin.id, { type, title, body, link }).catch(() => {})));

  if (emailHtml) {
    for (const to of await emailRecipients(admins)) {
      sendMail({ to, subject: emailSubject || title, html: emailHtml }).catch(() => {});
    }
  }
}
