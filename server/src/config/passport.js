import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { Strategy as OAuth2Strategy } from "passport-oauth2";
import dotenv from "dotenv";

dotenv.config();

const SERVER_URL = process.env.SERVER_URL || "http://localhost:5000";

export const providerStatus = { google: false, facebook: false, x: false };

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${SERVER_URL}/api/auth/google/callback`,
      },
      (accessToken, refreshToken, profile, done) => {
        done(null, {
          provider: "google",
          providerUserId: profile.id,
          email: profile.emails?.[0]?.value || null,
          fullName: profile.displayName,
        });
      }
    )
  );
  providerStatus.google = true;
}

if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
  passport.use(
    new FacebookStrategy(
      {
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: `${SERVER_URL}/api/auth/facebook/callback`,
        profileFields: ["id", "displayName", "emails"],
      },
      (accessToken, refreshToken, profile, done) => {
        done(null, {
          provider: "facebook",
          providerUserId: profile.id,
          email: profile.emails?.[0]?.value || null,
          fullName: profile.displayName,
        });
      }
    )
  );
  providerStatus.facebook = true;
}

if (process.env.X_CLIENT_ID && process.env.X_CLIENT_SECRET) {
  // X (Twitter) uses OAuth 2.0 with PKCE and has no dedicated passport
  // strategy maintained for it, so we configure the generic OAuth2
  // strategy directly against X's endpoints. Its API does NOT return an
  // email address without elevated developer access - see the README.
  const xStrategy = new OAuth2Strategy(
    {
      authorizationURL: "https://twitter.com/i/oauth2/authorize",
      tokenURL: "https://api.twitter.com/2/oauth2/token",
      clientID: process.env.X_CLIENT_ID,
      clientSecret: process.env.X_CLIENT_SECRET,
      callbackURL: `${SERVER_URL}/api/auth/x/callback`,
      state: true,
      pkce: true,
      scope: ["tweet.read", "users.read"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const res = await fetch("https://api.twitter.com/2/users/me", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(`X /users/me failed (${res.status}): ${JSON.stringify(json)}`);
        }
        done(null, {
          provider: "x",
          providerUserId: json.data?.id,
          email: null,
          fullName: json.data?.name || json.data?.username,
        });
      } catch (err) {
        done(err);
      }
    }
  );

  // X requires confidential clients ("Web App, Automated App or Bot") to
  // authenticate the token exchange with HTTP Basic Auth
  // (base64(client_id:client_secret)) rather than the client_id/secret as
  // plain POST body fields, which is what passport-oauth2 sends by
  // default. Force Basic Auth here to match what X's API expects.
  const basicAuth = Buffer.from(`${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`).toString(
    "base64"
  );
  xStrategy._oauth2._customHeaders = {
    ...xStrategy._oauth2._customHeaders,
    Authorization: `Basic ${basicAuth}`,
  };
  // The underlying oauth2 client always adds client_secret to the token
  // request body too. Per OAuth 2.0 spec, a client shouldn't authenticate
  // two ways in one request, and X's API is strict about this - blank it
  // out here so the secret is only sent via the Basic Auth header above.
  xStrategy._oauth2._clientSecret = "";

  passport.use("x", xStrategy);
  providerStatus.x = true;
}

export default passport;
