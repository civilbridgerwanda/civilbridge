import { NewsletterSubscriber } from "../models/index.js";
import { sendMail } from "../config/mailer.js";
import { newListingEmail } from "../config/emailTemplates.js";

// Fired after a property or plan is published so active subscribers hear
// about it without anyone having to manually run a newsletter campaign.
// Runs after the response is already sent (fire-and-forget from the
// caller), so a slow or failing mail send never blocks the listing itself.
export async function broadcastNewListing({ kind, title, id }) {
  const subscribers = await NewsletterSubscriber.findAll({ where: { is_active: true } });
  if (!subscribers.length) return;

  const html = newListingEmail({ kind, title, id });
  const subject =
    kind === "plan" ? `New plan on CivilBridge: ${title}` : `New property on CivilBridge: ${title}`;

  await Promise.allSettled(
    subscribers.map((s) => sendMail({ to: s.email, subject, html }))
  );
}
