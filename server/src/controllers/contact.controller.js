import { sendMail } from "../config/mailer.js";

// POST /api/contact  { name, email, message }
export async function submit(req, res) {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: "Name, email, and message are required" });
    }

    const to = process.env.CONTACT_EMAIL || process.env.SMTP_USER;
    if (!to) {
      return res.status(503).json({
        success: false,
        message: "Contact form isn't configured yet - set CONTACT_EMAIL in the server .env.",
      });
    }

    const result = await sendMail({
      to,
      subject: `New CivilBridge contact form message from ${name}`,
      html: `
        <p><strong>From:</strong> ${name} (${email})</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, "<br>")}</p>
      `,
    });

    if (!result.sent) {
      return res.status(503).json({ success: false, message: "Failed to send - please try again later." });
    }

    res.json({ success: true, data: { sent: true } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to send message" });
  }
}
