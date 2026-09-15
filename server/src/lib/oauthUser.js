import bcrypt from "bcryptjs";
import crypto from "crypto";
import { User, OauthAccount } from "../models/index.js";

/**
 * Given a normalized profile from any provider, returns the matching
 * CivilBridge user - creating one (and/or linking the social account) as
 * needed. Matching priority:
 *   1. An oauth_accounts row already links this exact (provider, id) - use that user.
 *   2. The profile has a real email that matches an existing user - link this
 *      provider to that account (so someone who signed up with a password
 *      can also sign in with Google later, and vice versa).
 *   3. Otherwise, create a brand new user.
 */
export async function findOrCreateFromOauthProfile({ provider, providerUserId, email, fullName }) {
  const existingLink = await OauthAccount.findOne({
    where: { provider, provider_user_id: providerUserId },
  });
  if (existingLink) {
    const user = await User.findByPk(existingLink.user_id);
    if (user) return user;
  }

  let user = email ? await User.findOne({ where: { email } }) : null;

  if (!user) {
    // OAuth-created accounts don't have a usable password - fill the
    // required column with an unguessable random hash. The person can set
    // a real password later via "Forgot password" if they want one.
    const password_hash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);

    user = await User.create({
      full_name: fullName || "CivilBridge User",
      // X's OAuth2 API doesn't return an email address without elevated
      // developer access, so there may not be a real one to store.
      email: email || `${provider}-${providerUserId}@users.civilbridge.local`,
      password_hash,
      role: "client",
      email_verified: Boolean(email), // a provider-supplied email is already verified by them
    });
  }

  await OauthAccount.findOrCreate({
    where: { provider, provider_user_id: providerUserId },
    defaults: { user_id: user.id },
  });

  return user;
}
