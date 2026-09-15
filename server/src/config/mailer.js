import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const hasSmtpConfig = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD;

// Common copy-paste mistake: SMTP_HOST=smtp instead of smtp.gmail.com (or
// whatever the real hostname is). A bare word with no dot is never a valid
// hostname, so warn loudly at startup instead of failing silently later.
if (hasSmtpConfig && !process.env.SMTP_HOST.includes(".")) {
  console.warn(
    `⚠️  SMTP_HOST="${process.env.SMTP_HOST}" doesn't look like a real hostname (e.g. smtp.gmail.com). ` +
      "Emails will fail until this is fixed in server/.env."
  );
}

export const transporter = hasSmtpConfig
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        // Gmail displays app passwords with spaces for readability
        // ("abcd efgh ijkl mnop") but the actual credential has none -
        // strip them so a copy-paste-as-shown value still works.
        pass: process.env.SMTP_PASSWORD.replace(/\s+/g, ""),
      },
    })
  : null;

/**
 * Sends an email if SMTP is configured; otherwise logs it to the console
 * instead of failing. This means the app runs and demos fully with zero
 * email setup, and starts actually sending the moment real SMTP
 * credentials are added to .env - no code changes needed either way.
 */
export async function sendMail({ to, subject, html, text }) {
  if (!transporter) {
    console.log(`✉️  [email not sent - SMTP not configured] To: ${to} | Subject: ${subject}`);
    return { sent: false, reason: "smtp_not_configured" };
  }

  try {
    await transporter.sendMail({
      from: process.env.FROM_EMAIL || "CivilBridge <no-reply@civil-bridge.com>",
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, ""),
    });
    return { sent: true };
  } catch (err) {
    console.error("Failed to send email:", err.message);
    if (err.code === "ENOTFOUND" || err.code === "EDNS") {
      console.error(`   → SMTP_HOST="${process.env.SMTP_HOST}" isn't a resolvable address - check server/.env.`);
    } else if (err.responseCode === 535 || /invalid login|username and password/i.test(err.message)) {
      console.error(
        "   → Login rejected. For Gmail, this must be an App Password (not your regular " +
          "password), which requires 2-Step Verification to be enabled on the account first: " +
          "https://myaccount.google.com/apppasswords"
      );
    }
    return { sent: false, reason: err.message };
  }
}
