import passport, { providerStatus } from "../config/passport.js";
import { signToken } from "../middleware/auth.js";
import { findOrCreateFromOauthProfile } from "../lib/oauthUser.js";

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// Kicks off the OAuth flow (full-page redirect to the provider).
// Returns an Express handler bound to one provider's name/scope.
export function startOauth(name, scope) {
  return (req, res, next) => {
    if (!providerStatus[name]) {
      return res.redirect(`${CLIENT_URL}/sign-in?oauth_error=${name}_not_configured`);
    }
    const options = { session: false, ...(scope ? { scope } : {}) };
    passport.authenticate(name, options)(req, res, next);
  };
}

// Where the provider redirects back to after the person approves access.
// Returns an Express handler bound to one provider's name.
export function oauthCallback(name) {
  return (req, res, next) => {
    if (!providerStatus[name]) {
      return res.redirect(`${CLIENT_URL}/sign-in?oauth_error=${name}_not_configured`);
    }
    passport.authenticate(
      name,
      { session: false, failureRedirect: `${CLIENT_URL}/sign-in?oauth_error=${name}_failed` },
      async (err, profile) => {
        try {
          if (err || !profile) {
            console.error(`OAuth (${name}) authentication failed:`, err || "no profile returned");
            return res.redirect(`${CLIENT_URL}/sign-in?oauth_error=${name}_failed`);
          }

          const user = await findOrCreateFromOauthProfile(profile);
          if (user.is_suspended) {
            return res.redirect(`${CLIENT_URL}/sign-in?oauth_error=${name}_suspended`);
          }
          const token = signToken(user);
          res.redirect(`${CLIENT_URL}/oauth-callback?token=${token}`);
        } catch (e) {
          console.error(`OAuth (${name}) callback error:`, e);
          res.redirect(`${CLIENT_URL}/sign-in?oauth_error=${name}_failed`);
        }
      }
    )(req, res, next);
  };
}
