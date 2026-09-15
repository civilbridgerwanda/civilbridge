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
    `<p>Thanks for subscribing to CivilBridge updates. We'll send you news on new plans, market insights, and platform features - no spam.</p>
     ${button("See the Latest Plans", "/plans")}`
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
