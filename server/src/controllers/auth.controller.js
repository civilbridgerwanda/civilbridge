import bcrypt from "bcryptjs";
import { User } from "../models/index.js";
import { signToken } from "../middleware/auth.js";
import { sendMail } from "../config/mailer.js";
import { welcomeEmail, otpEmail, passwordResetEmail } from "../config/emailTemplates.js";
import { createOtp, canResend, verifyOtp } from "../lib/otp.js";

// Accounts created via a provider that doesn't supply a real email (X,
// currently) get a placeholder like x-12345@users.civilbridge.local so the
// NOT NULL/UNIQUE email column is still satisfied. There's nothing real to
// verify or send mail to at that address, so anything email-related needs
// to recognize and skip these.
function hasVerifiableEmail(email) {
  return !email.endsWith("@users.civilbridge.local");
}

function publicUser(user) {
  return {
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    role: user.role,
    plan: user.plan,
    email_verified: user.email_verified,
    has_verifiable_email: hasVerifiableEmail(user.email),
  };
}

export async function register(req, res) {
  try {
    const { full_name, email, password, role } = req.body;
    if (!full_name || !email || !password) {
      return res.status(400).json({ success: false, message: "Name, email, and password are required" });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
    }
    // Only self-service roles are allowed here; "admin" is granted manually.
    const safeRole = ["client", "expert"].includes(role) ? role : "client";

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ success: false, message: "An account with that email already exists" });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const user = await User.create({ full_name, email, password_hash, role: safeRole });

    sendMail({ to: email, subject: "Welcome to CivilBridge", html: welcomeEmail(full_name) }).catch(() => {});

    // Send a verification OTP right away so the person can confirm their
    // email without an extra step.
    const code = await createOtp(user.id, "email_verification");
    sendMail({ to: email, subject: "Verify your CivilBridge email", html: otpEmail(code) }).catch(() => {});

    res.status(201).json({ success: true, data: { token: signToken(user), user: publicUser(user) } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to create account" });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ success: false, message: "Incorrect email or password" });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, message: "Incorrect email or password" });
    }
    if (user.is_suspended) {
      return res.status(403).json({ success: false, message: "This account has been suspended. Contact support if you believe this is a mistake." });
    }

    res.json({ success: true, data: { token: signToken(user), user: publicUser(user) } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to sign in" });
  }
}

export async function me(req, res) {
  try {
    const user = await User.findByPk(req.user.sub);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, data: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch account" });
  }
}

export async function verifyEmail(req, res) {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ success: false, message: "Email and code are required" });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ success: false, message: "Account not found" });
    }
    if (user.email_verified) {
      return res.json({ success: true, data: { user: publicUser(user) } });
    }
    if (!hasVerifiableEmail(user.email)) {
      return res.status(400).json({
        success: false,
        message: "This account doesn't have a real email on file, so there's nothing to verify.",
      });
    }

    const result = await verifyOtp(user.id, "email_verification", code);
    if (!result.ok) {
      const message =
        result.reason === "incorrect"
          ? "That code is incorrect."
          : "That code has expired - request a new one.";
      return res.status(400).json({ success: false, message });
    }

    user.email_verified = true;
    await user.save();

    res.json({ success: true, data: { user: publicUser(user) } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to verify email" });
  }
}

export async function resendOtp(req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ success: false, message: "Account not found" });
    }
    if (user.email_verified) {
      return res.json({ success: true, data: { alreadyVerified: true } });
    }
    if (!hasVerifiableEmail(user.email)) {
      return res.status(400).json({
        success: false,
        message:
          "This account doesn't have a real email on file (it was created via a sign-in provider that doesn't share one), so there's nothing to verify.",
      });
    }

    const resendCheck = await canResend(user.id, "email_verification");
    if (!resendCheck.ok) {
      return res.status(429).json({
        success: false,
        message: `Please wait ${resendCheck.retryAfter}s before requesting another code.`,
      });
    }

    const code = await createOtp(user.id, "email_verification");
    await sendMail({ to: email, subject: "Your new CivilBridge verification code", html: otpEmail(code) });

    res.json({ success: true, data: { alreadyVerified: false } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to resend code" });
  }
}

// Always responds success (whether or not the email exists) so this
// endpoint can't be used to check which addresses have an account.
export async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const user = await User.findOne({ where: { email } });
    if (user) {
      const resendCheck = await canResend(user.id, "password_reset");
      if (resendCheck.ok) {
        const code = await createOtp(user.id, "password_reset");
        sendMail({
          to: email,
          subject: "Reset your CivilBridge password",
          html: passwordResetEmail(code),
        }).catch(() => {});
      }
      // If resendCheck fails (cooldown), stay silent about it too - the
      // person already has a valid code in their inbox from moments ago.
    }

    res.json({ success: true, data: { message: "If that email has an account, a reset code is on its way." } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to process request" });
  }
}

export async function resetPassword(req, res) {
  try {
    const { email, code, new_password } = req.body;
    if (!email || !code || !new_password) {
      return res.status(400).json({ success: false, message: "Email, code, and new password are required" });
    }
    if (new_password.length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      // Generic message - don't reveal whether the account exists.
      return res.status(400).json({ success: false, message: "That code is incorrect or has expired." });
    }

    const result = await verifyOtp(user.id, "password_reset", code);
    if (!result.ok) {
      const message =
        result.reason === "incorrect"
          ? "That code is incorrect."
          : "That code has expired - request a new one.";
      return res.status(400).json({ success: false, message });
    }

    user.password_hash = await bcrypt.hash(new_password, 10);
    await user.save();

    res.json({ success: true, data: { token: signToken(user), user: publicUser(user) } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to reset password" });
  }
}
