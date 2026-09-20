import { NewsletterSubscriber } from "../models/index.js";
import { sendMail } from "../config/mailer.js";
import { newsletterWelcomeEmail } from "../config/emailTemplates.js";

// Shared by the public newsletter signup form (Footer) and new-account
// registration, so "subscribed" always means the same thing everywhere:
// one row in newsletter_subscribers, reactivated if they'd unsubscribed.
// `silent` skips the confirmation email - used at registration, where the
// account-welcome email already covers greeting the person, so a second
// "you're subscribed!" email right after would just be noise.
export async function subscribeEmail(email, { silent = false } = {}) {
  const [subscriber, created] = await NewsletterSubscriber.findOrCreate({
    where: { email },
    defaults: { is_active: true },
  });

  const alreadySubscribed = !created && subscriber.is_active;
  if (!created && !subscriber.is_active) {
    subscriber.is_active = true;
    await subscriber.save();
  }

  if (!alreadySubscribed && !silent) {
    await sendMail({
      to: email,
      subject: "Welcome to CivilBridge updates",
      html: newsletterWelcomeEmail(),
    });
  }

  return { alreadySubscribed };
}
