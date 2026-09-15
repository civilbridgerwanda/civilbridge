import bcrypt from "bcryptjs";
import { Op } from "sequelize";
import { Otp } from "../models/index.js";

const OTP_TTL_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
}

/** Creates and stores a new OTP for a user, returning the plain code to email. */
export async function createOtp(userId, purpose) {
  const code = generateCode();
  const code_hash = await bcrypt.hash(code, 10);
  const expires_at = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await Otp.create({ user_id: userId, code_hash, purpose, expires_at });
  return code;
}

/** Returns { ok, reason? } - reason is 'cooldown' if too soon to resend. */
export async function canResend(userId, purpose) {
  const latest = await Otp.findOne({
    where: { user_id: userId, purpose },
    order: [["created_at", "DESC"]],
  });
  if (!latest) return { ok: true };

  const secondsSince = (Date.now() - new Date(latest.created_at).getTime()) / 1000;
  if (secondsSince < RESEND_COOLDOWN_SECONDS) {
    return { ok: false, reason: "cooldown", retryAfter: Math.ceil(RESEND_COOLDOWN_SECONDS - secondsSince) };
  }
  return { ok: true };
}

/** Verifies a submitted code against the most recent unconsumed OTP for that purpose. */
export async function verifyOtp(userId, purpose, submittedCode) {
  const otp = await Otp.findOne({
    where: { user_id: userId, purpose, consumed_at: null, expires_at: { [Op.gt]: new Date() } },
    order: [["created_at", "DESC"]],
  });

  if (!otp) return { ok: false, reason: "expired_or_missing" };

  const valid = await bcrypt.compare(submittedCode, otp.code_hash);
  if (!valid) return { ok: false, reason: "incorrect" };

  otp.consumed_at = new Date();
  await otp.save();
  return { ok: true };
}
