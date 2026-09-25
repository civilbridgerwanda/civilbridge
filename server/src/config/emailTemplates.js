import dotenv from "dotenv";
dotenv.config();

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

const wrap = (title, body) => `
  <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
    <div style="background: #03204c; padding: 24px; text-align: center;">
      <span style="color: #ffffff; font-size: 20px; font-weight: bold;">CivilBridge</span>
    </div>
    <div style="padding: 24px; color: #0f172a;">
      <h1 style="font-size: 20px; margin-top: 0;">${title}</h1>
      ${body}
    </div>
    <div style="padding: 16px 24px; color: #94a3b8; font-size: 12px; text-align: center;">
      CivilBridge - Rwanda's construction intelligence platform
    </div>
  </div>
`;

// A consistent CTA button, used anywhere an email should link the reader
// back into the app rather than just telling them to "sign in".
const button = (label, path) => `
  <p style="text-align: center; margin: 24px 0;">
    <a href="${CLIENT_URL}${path}"
       style="background: #03204c; color: #ffffff; padding: 12px 28px; border-radius: 8px;
              text-decoration: none; font-weight: bold; display: inline-block;">
      ${label}
    </a>
  </p>
`;

export function welcomeEmail(name) {
  return wrap(
    `Welcome, ${name}!`,
    `<p>Your CivilBridge account is ready. You can now estimate construction costs, browse plans and properties, and connect with verified experts across Rwanda.</p>
     ${button("Get Your First Cost Estimate", "/estimator")}`
  );
}

export function otpEmail(code) {
  return wrap(
    "Verify your email",
    `<p>Your CivilBridge verification code is:</p>
     <p style="font-size: 32px; font-weight: bold; letter-spacing: 6px; text-align: center; margin: 16px 0;">${code}</p>
     <p>This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
     ${button("Verify My Email", "/verify-email")}`
  );
}

export function passwordResetEmail(code) {
  return wrap(
    "Reset your password",
    `<p>Use this code to reset your CivilBridge password:</p>
     <p style="font-size: 32px; font-weight: bold; letter-spacing: 6px; text-align: center; margin: 16px 0;">${code}</p>
     <p>This code expires in 10 minutes. If you didn't request a password reset, you can safely ignore this email - your password won't be changed.</p>
     ${button("Reset My Password", "/forgot-password")}`
  );
}

export function estimateStatusEmail(projectName, status, nextLink = "/dashboard") {
  const label = status.replace("_", " ");
  const ctaLabel =
    status === "verified"
      ? nextLink.startsWith("/messages")
        ? "Chat With Your Reviewer"
        : "View Your Approved Estimate"
      : status === "under_review"
        ? "Track Your Estimate"
        : "View My Estimate";
  return wrap(
    "Your estimate was updated",
    `<p>The status of <strong>${projectName}</strong> is now <strong>${label}</strong>.</p>
     ${button(ctaLabel, nextLink)}`
  );
}

export function newsletterWelcomeEmail() {
  return wrap(
    "You're subscribed!",
    `<p>Thanks for subscribing to CivilBridge updates. Whenever we publish a new architectural
     plan or list a new property, you'll be among the first to hear about it - no spam, just
     the updates that matter.</p>
     <p>In the meantime, take a look at what's already on the platform:</p>
     ${button("Browse Architectural Plans", "/plans")}
     ${button("Browse Properties & Land", "/marketplace")}`
  );
}

// Sent to every active newsletter subscriber right after a new property or
// plan is published, so the list stays useful without anyone needing to
// keep checking the site manually.
export function newListingEmail({ kind, title, id }) {
  const path = kind === "plan" ? `/plans/${id}` : `/marketplace/${id}`;
  const label = kind === "plan" ? "architectural plan" : "property";
  return wrap(
    kind === "plan" ? "A new plan just went up" : "A new property just went up",
    `<p>We just published a new ${label} on CivilBridge: <strong>${title}</strong>.</p>
     ${button(`View "${title}"`, path)}`
  );
}

const METHOD_LABELS = { mobile_money: "Mobile Money", bank_transfer: "Bank transfer", card: "Card" };
const money = (currency, amount) => `${currency} ${Number(amount).toLocaleString()}`;

// Sent to the client the moment they submit a payment, so they always have
// a written record of what they asked for and what happens next.
export function paymentReceiptEmail({ fullName, notes, amount, currency, method, reference }) {
  return wrap(
    "We've received your payment request",
    `<p>Hi ${fullName},</p>
     <p>Thanks - we've logged your payment for <strong>${notes}</strong>.</p>
     <table style="width:100%; border-collapse:collapse; margin:16px 0; font-size:14px;">
       <tr><td style="padding:6px 0; color:#64748b;">Amount</td><td style="padding:6px 0; text-align:right;"><strong>${money(currency, amount)}</strong></td></tr>
       <tr><td style="padding:6px 0; color:#64748b;">Method</td><td style="padding:6px 0; text-align:right;">${METHOD_LABELS[method] || method}</td></tr>
       ${reference ? `<tr><td style="padding:6px 0; color:#64748b;">Your reference</td><td style="padding:6px 0; text-align:right;">${reference}</td></tr>` : ""}
       <tr><td style="padding:6px 0; color:#64748b;">Status</td><td style="padding:6px 0; text-align:right;">Awaiting confirmation</td></tr>
     </table>
     <p>Our team confirms the money has arrived, and the moment they do, your access unlocks
     <strong>automatically</strong> - there's nothing more you need to do. You'll get another
     email when that happens.</p>
     ${button("View My Payments", "/payments")}`
  );
}

// Sent to whoever handles the money, so a submitted payment never sits
// unnoticed waiting for someone to happen to open the admin panel.
export function paymentAlertEmail({ payerName, payerEmail, notes, amount, currency, method, reference }) {
  return wrap(
    "New payment to verify",
    `<p><strong>${payerName}</strong> (${payerEmail}) just submitted a payment:</p>
     <table style="width:100%; border-collapse:collapse; margin:16px 0; font-size:14px;">
       <tr><td style="padding:6px 0; color:#64748b;">For</td><td style="padding:6px 0; text-align:right;"><strong>${notes}</strong></td></tr>
       <tr><td style="padding:6px 0; color:#64748b;">Amount</td><td style="padding:6px 0; text-align:right;"><strong>${money(currency, amount)}</strong></td></tr>
       <tr><td style="padding:6px 0; color:#64748b;">Method</td><td style="padding:6px 0; text-align:right;">${METHOD_LABELS[method] || method}</td></tr>
       <tr><td style="padding:6px 0; color:#64748b;">Client's reference</td><td style="padding:6px 0; text-align:right;">${reference || "not provided"}</td></tr>
     </table>
     <p>Check the money actually arrived (${METHOD_LABELS[method] || method} records), then mark it
     <strong>Completed</strong> in the Payments tab. The client's access unlocks automatically the
     moment you do - no other step needed.</p>
     ${button("Open Payments", "/admin?tab=Payments")}`
  );
}

// Sent when a payment is marked completed - the client's proof that the
// thing they paid for is now active.
export function paymentConfirmedEmail({ fullName, notes, amount, currency, purpose, planId }) {
  const isUpgrade = purpose === "plan_upgrade";
  return wrap(
    isUpgrade ? "Your plan is active" : "Your download is unlocked",
    `<p>Hi ${fullName},</p>
     <p>We've confirmed your payment of <strong>${money(currency, amount)}</strong> for
     <strong>${notes}</strong>. ${
       isUpgrade
         ? "Your new plan and its limits are active right now."
         : "You can download everything for this plan right now."
     }</p>
     ${button(isUpgrade ? "Go to My Account" : "Download My Plan", isUpgrade ? "/settings" : `/plans/${planId}`)}
     <p>Thank you for choosing CivilBridge.</p>`
  );
}

export function planInquiryConfirmationEmail(fullName, planTitle, planId) {
  return wrap(
    "We've received your request",
    `<p>Hi ${fullName},</p>
     <p>Thanks for your interest in <strong>${planTitle}</strong>. We've received your request and
     our team is already working on it - a CivilBridge expert will get back to you
     within <strong>24 hours</strong>.</p>
     <p>If you haven't heard from us within that time, please reach out to us directly
     on WhatsApp: <strong>+250 789 956 46</strong>.</p>
     ${planId ? button("View This Plan Again", `/plans/${planId}`) : ""}
     <p>Talk soon,<br>The CivilBridge Team</p>`
  );
}
