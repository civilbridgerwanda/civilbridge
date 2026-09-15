import { NewsletterSubscriber } from "../models/index.js";
import { sendMail } from "../config/mailer.js";
import { newsletterWelcomeEmail } from "../config/emailTemplates.js";

// POST /api/newsletter/subscribe
export async function subscribe(req, res) {
  try {
    const { email } = req.body;
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ success: false, message: "A valid email address is required" });
    }

    const [subscriber, created] = await NewsletterSubscriber.findOrCreate({
      where: { email },
      defaults: { is_active: true },
    });

    if (!created && subscriber.is_active) {
      return res.json({ success: true, data: { alreadySubscribed: true } });
    }
    if (!created && !subscriber.is_active) {
      subscriber.is_active = true;
      await subscriber.save();
    }

    await sendMail({
      to: email,
      subject: "Welcome to CivilBridge updates",
      html: newsletterWelcomeEmail(),
    });

    res.status(201).json({ success: true, data: { alreadySubscribed: false } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to subscribe" });
  }
}
