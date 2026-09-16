# CivilBridge

Construction intelligence platform for Rwanda. Monorepo with:

```
civilbridge/
├── client/   React + Vite frontend (Tailwind, React Router, Socket.IO client)
└── server/   Node.js + Express backend (MySQL via Sequelize, Socket.IO,
              Nodemailer, Cloudinary)
```

## 1. Prerequisites

- Node.js 18+ and npm
- A MySQL server (local, or a managed one like PlanetScale/Cloud SQL)
- A Google account with access to Search Console, Analytics, Tag Manager, and Business Profile
- (Optional but recommended) an SMTP provider for email, and a free [Cloudinary](https://cloudinary.com) account for image uploads

## 2. Database

```bash
cd server
npm install
cp .env.example .env      # fill in your DB password etc. first
npm run migrate            # creates the database, tables, and sample data
```

`npm run migrate` runs `sql/schema.sql` directly against MySQL using the
credentials in `.env` — no `mysql` CLI needed, which matters if you're on
Windows/XAMPP using phpMyAdmin and don't have `mysql` on your PATH. It's
safe to re-run.

**Important**: just starting the server (`npm run dev`) does **not** create
tables — you'll see `✅ MySQL connected` because that only tests the
connection. `npm run migrate` is the step that actually builds the schema;
run it once before your first `npm run dev`, and again any time
`sql/schema.sql` changes.

This creates the `civilbridge` database and all tables (`users`, `otps`,
`experts`, `properties`, `estimates`, `estimate_items`, `plans`,
`ai_conversations`, `ai_messages`, `newsletter_subscribers`), plus sample
data for properties, experts, and plans.

> **On primary keys**: every table uses a UUID (`CHAR(36)`) primary key,
> not an auto-increment integer — harder to guess/enumerate, and safe to
> generate on the client or across multiple servers without collisions.
> Rows created through the app get their UUID from Sequelize
> (`DataTypes.UUIDV4`); the seed rows in `schema.sql` generate one with
> MySQL's `UUID()` function. One consequence: `ai_messages.id` is no longer
> useful for ordering messages chronologically (UUIDs aren't sequential),
> so that table's `created_at` uses microsecond precision
> (`TIMESTAMP(6)`) and messages are ordered by that instead.

> Note on "mysqli": mysqli is PHP's MySQL driver. On Node.js the equivalent
> is **Sequelize** (used here) — an ORM that sits on top of the **mysql2**
> driver. Routes query through Sequelize models (`server/src/models/`)
> rather than writing raw SQL, and `schema.sql` remains the source of truth
> for table structure and seed data.

## 3. Backend setup

```bash
cd server
npm run dev                # starts on http://localhost:5000
```

(You already ran `npm install`, `cp .env.example .env`, and `npm run migrate`
in the previous step.)

**Architecture**: `server/src/routes/` files are thin — they just wire up
paths, auth middleware, and which controller function handles each one.
The actual logic (querying the database, calling Sequelize, sending
emails, emitting Socket.IO events) lives in the matching file under
`server/src/controllers/` (e.g. `routes/properties.js` →
`controllers/properties.controller.js`). Socket.IO's `io` instance is
attached to the Express app itself (`app.set("io", io)` in `index.js`) and
read via `req.app.get("io")` wherever a controller needs to emit an event —
no more passing `io` through router factory functions.

Endpoints:
- `GET /api/health`
- `GET /api/properties`, `GET /api/properties/:id`, `GET /api/properties/mine` (auth), `POST /api/properties` (auth required)
- `GET /api/experts`, `GET /api/experts/:id`, `GET /api/experts/me` (auth), `POST /api/experts` (auth required - create/update your own profile)
- `GET /api/experts/:id/reviews`, `POST /api/experts/:id/reviews` (auth, one per reviewer, upserts)
- `POST /api/experts/portfolio`, `DELETE /api/experts/portfolio/:id` (auth, your own profile only)
- `GET /api/experts/me/plan-inquiries` (auth, expert only - plan inquiries an admin assigned to you)
- `DELETE /api/properties/:id` (auth, must be the listing's owner)
- `GET /api/plans`, `GET /api/plans/:id`, `POST /api/plans/:id/inquiries`
- `POST /api/estimates`, `GET /api/estimates/:id`, `GET /api/estimates/mine` (auth), `GET /api/estimates/assigned` (auth, expert only), `PATCH /api/estimates/:id/status` (auth, expert/admin only), `PATCH /api/estimates/:id/assign` (auth, must be the estimate's own client)
- `POST /api/contact`
- `GET /api/notifications` (auth), `PATCH /api/notifications/:id/read` (auth), `PATCH /api/notifications/read-all` (auth)
- `GET /api/messages/conversations` (auth), `POST /api/messages/conversations` (auth, start/resume a thread), `GET /api/messages/conversations/:id` (auth), `POST /api/messages/conversations/:id/messages` (auth)
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `POST /api/auth/verify-email`, `POST /api/auth/resend-otp`
- `POST /api/uploads/image` (auth required, multipart `file` field → Cloudinary)
- `POST /api/newsletter/subscribe`
- `GET /api/admin/stats`, `/api/admin/analytics` (admin role required)
- `GET /api/admin/estimates`
- `GET /api/admin/users` (supports `?search=` & `?role=`), `GET /api/admin/users/:id`, `PATCH /api/admin/users/:id/role`, `PATCH /api/admin/users/:id/plan`, `PATCH /api/admin/users/:id/suspend`, `DELETE /api/admin/users/:id`
- `POST /api/admin/properties`, `PATCH /api/admin/properties/:id`, `DELETE /api/admin/properties/:id`
- `POST /api/admin/plans`, `PATCH /api/admin/plans/:id`, `DELETE /api/admin/plans/:id`
- `GET /api/admin/newsletter`, `GET /api/admin/newsletter/campaigns`, `POST /api/admin/newsletter/send`
- `GET /api/admin/plan-inquiries`, `PATCH /api/admin/plan-inquiries/:id/status`, `PATCH /api/admin/plan-inquiries/:id/assign`
- `GET /api/admin/payments`, `PATCH /api/admin/payments/:id/status`
- `POST /api/payments`, `GET /api/payments/mine`, `GET /api/payments/received` (auth required)
- `GET /api/messages/support-contact` (auth, returns an admin to start a support conversation with)
- `GET/POST /api/ai-studio/conversations`, `POST /api/ai-studio/conversations/:id/messages`
- Socket.IO events: `property:created`, `estimate:created`, `estimate:status_changed`

## 4. Frontend setup

```bash
cd client
cp .env.example .env      # fill in GTM ID and Search Console code once you have them
npm install
npm run dev                 # starts on http://localhost:5173
```

**Auth pages** (`/sign-in`, `/get-started`, `/forgot-password`, `/verify-email`) share a
two-panel layout (`components/AuthShell.jsx`): the form on one side, a brand/feature
panel on the other (hidden on small screens so mobile just gets the form). Sign In and
Sign Up each pass their own `sideTitle`/`sideHighlights`; Forgot Password and Verify
Email fall back to sensible defaults.

**Pricing page** (`/pricing`) is a real page with a monthly/annual toggle and three
tiers, but **billing isn't live** — no card details are collected, and it says so
on the page. The tiers/prices are placeholders to replace once real plans are decided;
wire them up to the `payments` table (see section 12) once a gateway is connected.

## 5. How the "no refresh" live data works

The backend uses **Socket.IO** (WebSockets with an automatic polling fallback).
Whenever a route handler writes to MySQL (e.g. a new property or estimate),
it also calls `io.emit(...)`. Every open browser tab is subscribed via
`socket.io-client` (`client/src/lib/socket.js`) and updates its React state
straight from the event — no `window.location.reload()`, no manual re-fetch
polling loop. You can see this live in the **Marketplace** page (new listings
slide in) and the **Estimator** page (status badge updates the instant an
estimate is reviewed).

If you'd rather not run a persistent socket connection, the same pattern
works with plain polling (`setInterval` + `fetch`) or Server-Sent Events —
swap `client/src/lib/socket.js` accordingly.

## 6. Email notifications (Nodemailer)

`server/src/config/mailer.js` sends emails via any SMTP provider (Gmail app
password, SendGrid, Mailgun, Amazon SES, etc.) — set `SMTP_HOST`,
`SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `FROM_EMAIL` in `server/.env`.

**If SMTP isn't configured, the app still runs fine** — emails are logged to
the console instead of failing, so you can develop and demo everything
without setting up email first, then start sending for real the moment
credentials are added.

Currently wired up:
- **Welcome email** on registration (`routes/auth.js`)
- **Estimate status update email** when an expert/admin changes an
  estimate's status (`routes/estimator.js`)
- **Newsletter welcome email** on subscribe (`routes/newsletter.js`)

Add more by writing a template in `server/src/config/emailTemplates.js` and
calling `sendMail({ to, subject, html })` from wherever the event happens.

## 7. Image uploads (Cloudinary)

Create a free account at [cloudinary.com](https://cloudinary.com), then copy
your Cloud Name, API Key, and API Secret into `server/.env`
(`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`).

`POST /api/uploads/image` accepts a multipart `file` field, requires the
caller to be signed in (`Authorization: Bearer <token>`), and returns the
resulting Cloudinary URL. It's currently wired into the **Estimator**'s
"Upload Existing Plan" flow (`client/src/pages/Estimator.jsx`) — if you're
signed in, the file is actually uploaded and its URL is saved on the
estimate; if you're signed out or Cloudinary isn't configured, it degrades
gracefully with an on-screen notice instead of pretending to work.

Use `api.uploadImage(file, token)` (`client/src/lib/api.js`) anywhere else
you need a real upload — property photos, expert avatars, etc.

## 8. Client, expert, and admin dashboards

Every dashboard route (`/dashboard`, `/expert-dashboard`, `/admin`,
`/messages`, `/settings`) shares its own **dedicated app shell**
(`client/src/components/DashboardLayout.jsx`) instead of the marketing
site's navbar/footer — a left sidebar (nav links, unread message badge,
profile card, logout) and a top bar (search, messages icon, notification
bell). `DashboardShell.jsx` computes which sidebar links and search
behavior to show based on `user.role`:

- **Client**: Dashboard, Cost Estimator, Marketplace, Building Plans, Messages, Settings. Top-bar search jumps to `/marketplace?search=...`.
- **Expert**: Dashboard, Expert Directory, Cost Estimator, Building Plans, Messages, Settings. Top-bar search jumps to `/experts?search=...`. **Deliberately no property management** — see the dedicated role below.
- **Property Owner**: Dashboard, My Properties, Cost Estimator, Marketplace, Building Plans, Messages, Settings.
- **Admin**: Overview, Analytics, Estimates, Users, Properties, Plans, Inquiries, Payments, Newsletter, Messages — these deep-link into the Admin Dashboard's tabs via `?tab=` (e.g. `/admin?tab=Users`), and top-bar search jumps straight to `/admin?tab=Users&search=...`. The Admin Dashboard reads/writes that query param with `useSearchParams`, so tabs are bookmarkable and shareable, not just local component state.

`DashboardShell` itself enforces sign-in (redirects to `/sign-in` if
logged out); `/admin` additionally wraps its content in `RequireAdmin` for
the role check, so a non-admin who navigates there directly sees their own
(client/expert/property_owner) sidebar with a 403 message in the content
area rather than being redirected away entirely.

**Property management is a dedicated role, not a feature bolted onto
client/expert**: `property_owner` is a fourth account role (alongside
`client`, `expert`, `admin`). A plain `client` is automatically upgraded to
`property_owner` the moment they successfully list their first property
(`properties.controller.js`'s `create()` — mirrors how submitting "Join as
Expert" upgrades a client to `expert`). The `expert` role is explicitly
**blocked** from listing properties at all (`403` with a clear message) —
this was a deliberate product decision, not an oversight, so don't "fix"
it by loosening that check. `/list-property` and `/my-properties`
(`pages/dashboard/PropertyOwnerDashboard.jsx` — stats plus every listing
with Remove, confirmed) both redirect an `expert` who navigates there
directly back to `/expert-dashboard`. After listing, the frontend calls
`applyToken()` to refresh the locally-held user object (role included) so
the sidebar switches to the Property Owner nav immediately — note this
doesn't reissue the JWT itself, which still bears the old role until next
login; that's fine here since nothing else in the app currently branches
authorization on `client` vs. `property_owner`. Admins can also assign
(or remove) this role directly from the Users tab, same as any other role.

Every signed-in user gets **`/dashboard`** — their own submitted estimates
(with live status updates), and the ability to assign a *specific* expert
to review one (`PATCH /api/estimates/:id/assign`, ownership-checked
server-side) instead of leaving it in the general queue for whoever picks
it up first. That expert gets a real-time notification either way.

Accounts with the `expert` role additionally get **`/expert-dashboard`**:
their expert profile (with an "Edit Profile" link back into the
`/join-as-expert` form, which upserts rather than duplicates) — including
a **Recent Work** portfolio they manage themselves and public **Reviews**
(see section 9) — a stats row (in-queue count, verified this month, total
verified), two charts (a 6-month verified-reviews trend and a queue status
breakdown — both built with [recharts](https://recharts.org), computed
client-side from data the `/assigned` endpoint already returns, no extra
backend calls), a **Plans Assigned To You** section (see section 14), and
the review queue itself with one-click "Mark Reviewing" / "Verify" actions
(`PATCH /api/estimates/:id/status` — restricted server-side to the expert's
own linked profile or an admin, never trusting a `reviewed_by` value from
the request body).

Signing up no longer asks "I am a client / expert" — every new account
starts as a plain `client` (deferred, per product decision, until roles
are introduced more deliberately later). Roles still aren't fixed after
that: submitting the "Join as Expert" form auto-upgrades a plain `client`
account to `expert`, listing a first property auto-upgrades a plain
`client` to `property_owner` (see above — and note `expert` accounts are
blocked from this path entirely), and admins can change anyone's role
(and their subscription `plan` — see section 11) from the Users tab in the
admin dashboard via `PATCH /api/admin/users/:id/role` /
`PATCH /api/admin/users/:id/plan`.

## 9. Expert reviews, recent work, and account plans

**Reviews** — any signed-in user (other than the expert themself) can leave
a 1–5 star rating + comment on an expert's profile
(`POST /api/experts/:id/reviews`). One review per (expert, reviewer) pair —
submitting again updates it rather than creating a duplicate. The expert's
aggregate `rating`/`review_count` recomputes automatically on every
submit/update (`recomputeRating` in `experts.controller.js`).

**Recent work** — experts manage their own portfolio from
`/expert-dashboard` (add/remove; `POST /api/experts/portfolio`,
`DELETE /api/experts/portfolio/:id`), shown publicly on their profile page.

**Account plans** — every user has a `plan` (`starter` / `professional` /
`business`, default `starter`), shown as a badge
(`components/PlanBadge.jsx`) in Settings and both dashboards. Anyone on
`starter` sees an "Upgrade to Pro" banner linking to `/pricing`. This is
purely a label right now — see section 12 for what's real vs. not about
billing. Admins change it from the Users tab
(`PATCH /api/admin/users/:id/plan`).

## 10. Notifications and messaging

**Notifications** — the bell icon in the navbar (`client/src/components/NotificationBell.jsx`)
shows unread count and a dropdown, updated live via Socket.IO. Currently
triggered on: a new estimate entering the review queue (notifies every
expert), an estimate's status changing (notifies its owner, alongside the
existing email), and a new message (see below). Add more triggers anywhere
in the backend with `notify(io, userId, { type, title, body, link })`
(`server/src/lib/notify.js`) — it writes the row and pushes it live in one
call.

**Messaging** — real 1:1 conversations between any two users, at
`/messages`. The "Contact Owner" / "Message {expert}" buttons on property
and expert pages (`client/src/components/MessageButton.jsx`) start or
resume a thread instead of opening a `mailto:` link. Messages arrive live
if the thread is open (`conversation:<id>` Socket.IO room); otherwise the
recipient gets a bell notification. Conversations are deduplicated per
user pair server-side, so messaging the same person twice reuses the same
thread rather than creating a new one.

**Contact Support (client/expert → admin)** — a "Contact Support" button
(`client/src/components/ContactSupportButton.jsx`, shown on both the
Client and Expert dashboards, and a "Message Support" button inside
`/messages` itself) calls `GET /api/messages/support-contact`, which
returns the longest-standing `admin` account, then starts a normal
conversation with them. From the admin's side this needs nothing special —
admins see these threads in their own `/messages` like any other
conversation, since an admin is just a user with the `admin` role.

**Admin → any user** — inside `/messages`, an admin sees a "New Message"
button instead of "Message Support". It opens a searchable directory of
every user (reusing `GET /api/admin/users`) — clicking one starts (or
resumes) a conversation with them directly, so admins aren't limited to
only the people who've already messaged them.

**Estimate approval auto-starts a chat** — when an expert or admin sets an
estimate's status to `verified`, the reviewer and the client are
automatically connected: a conversation is created (or reused) with an
opening message from the reviewer ("I've reviewed and approved your
estimate for '...' — happy to answer any questions here"), and the client
gets a live notification linking straight into it. This lives in
`server/src/lib/conversations.js` (`startConversationWithMessage`) and is
called from `estimator.controller.js`'s `updateStatus` — the same helper
is reusable anywhere else in the app that should proactively connect two
people rather than just leaving them to find each other.

Both features join their real-time channel through the same generic
`join:room` Socket.IO event already used elsewhere in the app
(`server/src/sockets/index.js`) — the client joins its own `user:<id>` room
automatically once signed in (see `AuthContext.jsx`).

## 11. Admin dashboard

Visit `/admin` while signed in as a user with the `admin` role. Non-admins
are redirected to sign in, or shown a 403 if they're signed in but not an
admin (`client/src/components/RequireAdmin.jsx`). Tabs:

- **Overview** — platform stat cards (with real week-over-week /
  month-over-month trend arrows) and the estimate-volume / user-growth charts.
- **Analytics** — cross-feature usage chart and most-viewed / top-rated leaderboards (see section 12).
- **Estimates** — inline status management.
- **Users** — search/filter, an inline role dropdown (client/expert/property_owner/admin),
  and per-row actions: **view** full profile (`UserDetailModal.jsx` — their
  properties, estimates, conversations, payments, and expert profile if
  any, via `GET /api/admin/users/:id`), **suspend/unsuspend**
  (`PATCH /api/admin/users/:id/suspend` — blocks password *and* OAuth login
  while suspended; doesn't invalidate an already-issued JWT immediately,
  since sessions here are stateless), and **delete**
  (`DELETE /api/admin/users/:id` — cascades per the FK constraints in
  `sql/schema.sql`: their expert profile, OTPs, OAuth links, notifications,
  conversations, and payments they made are deleted with them; properties/
  estimates they created are kept but detached, not deleted). All three
  guard against locking yourself out: can't delete/suspend the last admin,
  and you can't delete your own account from this screen.
- **Properties** / **Plans** — full CRUD. "Add Property"/"Add Plan" open a
  form modal (`components/admin/PropertyFormModal.jsx`,
  `PlanFormModal.jsx`); each row has Edit and Delete. This is separate from
  a regular user's own "List Property" flow — admin-created listings have
  no owner and can edit/delete *any* listing, not just their own.
- **Payments** — see section 12.
- **Newsletter** — compose-and-send a campaign (subject + body) to every
  active subscriber (`POST /api/admin/newsletter/send`), a history of past
  campaigns (`newsletter_campaigns` table), and the subscriber list.

Public sign-up only allows the `client` or `expert` roles — there's no
public path to becoming an admin (by design). To promote the *first* admin
(before you have one to do it from the UI), update the database directly:

```sql
UPDATE users SET role = 'admin' WHERE email = 'you@example.com';
```

After that, every other role change (including granting more admins) can
be done from the Users tab in `/admin` itself.

## 12. Payments (scaffolded, no gateway connected yet)

There's a real `payments` table, model, and full CRUD workflow — but **no
payment gateway is wired up**, so nothing actually charges anyone. This is
intentional groundwork: when you're ready to accept real money, see
`server/src/config/paymentProvider.js` for exactly what to change
(Flutterwave is the practical choice for Rwanda — cards + MTN/Airtel Mobile
Money).

- **`/payments`** (client & expert dashboards): shows payment history, and
  a "Make a Payment" form (amount + purpose: expert consultation, priority
  review, listing boost, platform fee). Submitting creates a real `pending`
  row — no charge happens — with an on-screen note saying so. Experts
  additionally see a "Payments Received" table (any payment where they're
  the `recipient`).
- **Admin → Payments tab**: total revenue (sum of `completed` payments),
  pending count, and every transaction with a status dropdown
  (pending/completed/failed/refunded) so an admin can manually reconcile
  a payment once money has actually changed hands elsewhere. Changing
  status notifies the payer in-app.
- **Sample data**: `sql/schema.sql` seeds two sample client users and five
  sample payments (mixed statuses/purposes) purely so the Payments
  dashboards aren't empty on a fresh install — delete them once you have
  real data.

Endpoints: `POST /api/payments`, `GET /api/payments/mine`,
`GET /api/payments/received` (experts), `GET /api/admin/payments`,
`PATCH /api/admin/payments/:id/status` (admin).

## 13. View tracking and cross-feature analytics

**Filtering** — Marketplace, Experts, and Plans all support a full set of
query params server-side (price range, bedrooms/bathrooms, min size,
min rating, min experience, verified-only, city) via `GET /api/properties`,
`GET /api/experts`, `GET /api/plans` — see each controller's leading
comment for the exact param names. Each page has a "More Filters" panel
for the less commonly used ones, matching the pattern already used on
Plans (which is where a couple of these were previously just a stubbed-out
placeholder — now real).

**Similar items** — Property, Expert, and Plan detail pages each show a
"Similar..." section at the bottom: same type/category + same city first,
widened to just the same type/category if there aren't at least 3 matches.
Pure client-side composition of the existing list endpoints (no new
backend route) — see the `loadSimilar` effect near the top of
`PropertyDetail.jsx` / `ExpertDetail.jsx` / `PlanDetail.jsx`.

Properties, experts, and building plans each have a `view_count` column,
incremented every time their detail endpoint (`GET .../:id`) is hit. This
powers:

- **"X views" on detail pages** (`PropertyDetail.jsx`, `ExpertDetail.jsx`, `PlanDetail.jsx`).
- **Admin → Analytics tab**: a bar chart of how much each of the five core
  sections is actually used (Marketplace listings, Expert profiles, Plans,
  Estimates submitted, AI Studio conversations — all real counts, no
  fabricated numbers), plus three leaderboards: Most Viewed Properties,
  Top Rated Experts (by `rating`, tie-broken by views), and Most Viewed
  Plans. All computed server-side in `GET /api/admin/analytics`
  (`server/src/controllers/admin.controller.js`).

Plans didn't previously have a detail page — `PlanDetail.jsx` /
`GET /api/plans/:id` were added specifically so plan views have something
real to track (mirroring how properties and experts already worked).

## 14. "Talk to an Expert" plan inquiries

The "Talk to an Expert" button on a plan's detail page opens a form (name,
email, WhatsApp number, optional message) — no account required. On
submit (`POST /api/plans/:id/inquiries`):

- The request is saved to the `plan_inquiries` table.
- The person gets an automatic confirmation email
  (`planInquiryConfirmationEmail` in `config/emailTemplates.js`) promising
  a reply within 24 hours, with a WhatsApp fallback number if they don't
  hear back in time. This one sends synchronously (not fire-and-forget
  like most other emails in this app) since it's an explicit promise being
  made to the person — its actual send result is returned in the API
  response as `confirmationEmailSent`.
- Every admin gets an email (to `CONTACT_EMAIL`/`SMTP_USER`) plus an
  in-app notification linking to `/admin?tab=Inquiries`.

Admins manage these from the **Inquiries** tab: every request with a
clickable WhatsApp link and a status dropdown (New/Contacted/Closed).

If you want to change the WhatsApp fallback number, it's hardcoded in two
places that need to stay in sync: `config/emailTemplates.js`
(`planInquiryConfirmationEmail`) and `components/PlanInquiryModal.jsx`.

## 15. Email verification (OTP)

On registration, a 6-digit code is generated, hashed (bcrypt) and stored in
the `otps` table, and emailed via Nodemailer. The user lands on
`/verify-email` right after signing up to enter it.

- `POST /api/auth/verify-email` `{ email, code }` — checks the code against
  the most recent unconsumed, unexpired OTP for that user (10-minute
  expiry) and marks the account verified.
- `POST /api/auth/resend-otp` `{ email }` — issues a new code, rate-limited
  to one per 60 seconds per account.
- Signed-in users who haven't verified yet see a small dismissible reminder
  banner (`client/src/components/VerifyEmailBanner.jsx`) linking back to
  `/verify-email` — it's a nudge, not a hard block; unverified users can
  still use the app.

This is currently email-only. The same `otps` table/helpers
(`server/src/lib/otp.js`) are set up so a similar SMS-based flow (phone
verification, login 2FA) could reuse the same `purpose` pattern later —
that would just need an SMS provider (e.g. Twilio/Africa's Talking) wired
in alongside Nodemailer.

## 16. Social sign-in (Google, Facebook, X)

Every provider is fully implemented (Passport.js on the backend) and
optional — leave a provider's env vars blank and its button redirects back
to sign-in with a clear "not configured" message instead of erroring.

**Set `SERVER_URL` in `server/.env` first** — it must exactly match your
backend's real address (`http://localhost:5000` locally), since every
provider's redirect URI is built from it (`{SERVER_URL}/api/auth/google/callback`,
etc.) and has to match what you register with that provider *exactly*,
including the path.

### Google
1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) →
   Create Credentials → OAuth client ID → Web application.
2. Authorized redirect URI: `http://localhost:5000/api/auth/google/callback`
   (swap the host for your production `SERVER_URL` when you deploy).
3. Copy the Client ID and Client Secret into `server/.env`:
   `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

### Facebook
1. [Meta for Developers](https://developers.facebook.com/apps) → Create App
   → type "Consumer" → add the **Facebook Login** product.
2. In Facebook Login → Settings, add this to "Valid OAuth Redirect URIs":
   `http://localhost:5000/api/auth/facebook/callback`.
3. Copy the App ID and App Secret (Settings → Basic) into `server/.env`:
   `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`.
4. The `email` permission is standard and doesn't need app review to test
   with your own account; submitting for public/live use later does need
   Meta's review.

### X (Twitter)
1. [X Developer Portal](https://developer.twitter.com/en/portal/dashboard) →
   create a Project + App → **User authentication settings** → enable
   OAuth 2.0, type "Web App", set:
   - Callback URI: `http://localhost:5000/api/auth/x/callback`
   - Website URL: your `CLIENT_URL`
2. Copy the OAuth 2.0 Client ID and Client Secret into `server/.env`:
   `X_CLIENT_ID`, `X_CLIENT_SECRET`.
3. **Important limitation**: X's API does not return an email address
   without Elevated developer access. Accounts created via X sign-in get a
   placeholder email (`x-<id>@users.civilbridge.local`) instead of a real
   one — this is called out directly in `server/src/lib/oauthUser.js`. If
   you need real emails from X users, they'd need to enter one manually
   after signing in (not currently built, since it depends on your access
   tier).

### How it works end to end
"Continue with Google/Facebook/X" is a plain link (not a JS click handler)
to `{VITE_API_URL}/auth/<provider>` — a real page navigation, since OAuth
requires redirecting the whole browser to the provider's consent screen,
not an API call. After the person approves access, the provider redirects
back to `/api/auth/<provider>/callback`, which finds-or-creates the
matching CivilBridge user (`server/src/lib/oauthUser.js` — matches by
already-linked account first, then by email, then creates a new one),
mints the same kind of JWT as a normal email/password login, and redirects
the browser to `{CLIENT_URL}/oauth-callback?token=...`. That page
(`client/src/pages/OAuthCallback.jsx`) reads the token, finishes logging in
through `AuthContext`, and sends the person home.

Signing up with Google/Facebook and later signing in with
email/password (or vice versa) works automatically if the email matches —
they're the same account, just with an additional linked provider in the
`oauth_accounts` table.

## 17. Google integrations (done mostly outside the code)

### Google Tag Manager (GTM)
1. Create a container at [tagmanager.google.com](https://tagmanager.google.com).
2. Copy the container ID (`GTM-XXXXXXX`) into `VITE_GTM_ID` in `client/.env`.
   `index.html` already has the GTM `<script>` and `<noscript>` snippets wired
   to that env var, so it activates for every page automatically.
3. Inside GTM, add a **GA4 Configuration tag** pointing at your GA4
   Measurement ID, triggered on "All Pages" (or on the custom `page_view`
   event this app already pushes to `dataLayer` on every route change — see
   `client/src/lib/usePageTracking.js`). This means you can add/adjust GA4,
   conversion tags, or ad pixels later from the GTM UI without a code change.

### Google Analytics 4 (GA4)
Create a GA4 property in [analytics.google.com](https://analytics.google.com),
then wire its Measurement ID into the GA4 tag inside GTM (previous step). Use
`trackEvent(name, params)` from `client/src/lib/analytics.js` anywhere in the
app to push custom events (button clicks, form submits, etc.) — a few example
calls are already in `Home.jsx` and `Estimator.jsx`.

### Google Search Console
1. Add your property at [search.google.com/search-console](https://search.google.com/search-console).
2. Choose the "HTML tag" verification method and copy the `content` value.
3. Paste it into `VITE_GSC_VERIFICATION` in `client/.env` — `index.html`
   already renders it as a `<meta name="google-site-verification">` tag.
4. Once verified, submit a sitemap (add a `sitemap.xml` to `client/public/`
   once you have real routes/content finalized).

### Google Business Profile
This one isn't code — it's a listing you manage directly at
[business.google.com](https://business.google.com): add your address,
hours, phone number, and photos so CivilBridge shows up in Google Maps and
local search. To help Google associate your website with that listing,
add matching `LocalBusiness` JSON-LD structured data to `index.html` once
you have a real business address/phone, e.g.:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "CivilBridge",
  "url": "https://civil-bridge.com",
  "telephone": "+250...",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Kigali",
    "addressCountry": "RW"
  }
}
</script>
```

## 18. Deploying (AlmaLinux Contabo VPS + GitHub + `civil-bridge.com`, with dev + prod)

This section is the concrete version of "deploy this somewhere" for
**AlmaLinux 9** specifically (RHEL-family: `dnf`, `firewalld`, SELinux -
notably *different* commands than Ubuntu/Debian) with **two environments
on the same server**: `dev.civil-bridge.com` to test changes on, and
`civil-bridge.com` for production, promoted to once verified. Everything
under `deploy/` (`nginx-prod.conf.example`, `nginx-dev.conf.example`,
`ecosystem.config.cjs`, `deploy.sh`) exists to support exactly this.

### 18.1. Secure the server first

Before installing anything else: a fresh internet-facing VPS gets
password-brute-forced against `root` continuously from the moment it's
online (thousands of attempts a day is completely normal, not a sign
you've been specifically targeted). Fix this before going further, not
after:

```bash
# as root
dnf update -y

# create a personal sudo user - don't keep using root day to day
adduser youruser
passwd youruser
usermod -aG wheel youruser
```

Then, from your **local machine** (generates a keypair if you don't
already have one):
```bash
ssh-keygen -t ed25519
ssh-copy-id youruser@<your-contabo-ip>
```

Back on the server, disable root login and password auth over SSH,
leaving only key-based login for your new user:
```bash
sudo nano /etc/ssh/sshd_config
# set: PermitRootLogin no
# set: PasswordAuthentication no
sudo systemctl restart sshd
```

**Test that `ssh youruser@<ip>` still works in a new terminal window
before closing your current session** - if something's misconfigured,
you want your existing session still open to fix it, not locked out.

AlmaLinux ships with `firewalld` running by default; make sure it's
allowing the ports you need:
```bash
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### 18.2. Install the stack (`dnf`, not `apt`)

```bash
# Node.js 20.x
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

# MariaDB (MySQL-compatible - what AlmaLinux ships), Nginx, Git
sudo dnf install -y mariadb-server nginx git
sudo systemctl enable --now mariadb
sudo systemctl enable --now nginx
sudo mysql_secure_installation

# PM2 - keeps the Node backend running, restarts it on crash/reboot
sudo npm install -g pm2
```

**SELinux (AlmaLinux-specific, easy to miss and easy to mistake for a
broken Nginx config)**: by default SELinux blocks Nginx from making
outbound network connections at all, which includes the `proxy_pass`
calls to your Node backend - without this, every `/api` and `/socket.io`
request 502s even though the Nginx config itself is completely correct:
```bash
sudo setsebool -P httpd_can_network_connect 1
```

### 18.3. Push the code to GitHub (one-time, from your local machine)

```bash
git init                                  # skip if already a git repo
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/civilbridge.git
git push -u origin main
```

`.gitignore` already excludes `node_modules/`, `dist/`, `.env`, and log
files - your real secrets never get pushed. Double-check `git status`
doesn't show `server/.env` or `client/.env` staged before your first
commit; if it does, `.gitignore` was added after they were already
tracked once - `git rm --cached server/.env client/.env` fixes that.

### 18.4. Clone dev AND prod as two separate checkouts

```bash
sudo mkdir -p /var/www/civilbridge-dev /var/www/civilbridge-prod
sudo chown youruser:youruser /var/www/civilbridge-dev /var/www/civilbridge-prod

git clone https://github.com/<your-username>/civilbridge.git /var/www/civilbridge-dev
git clone https://github.com/<your-username>/civilbridge.git /var/www/civilbridge-prod
```

Two independent checkouts, two independent databases, two independent
PM2 processes, two independent Nginx server blocks - nothing about them
is shared except the source repo they both pull from. This is what makes
"test on dev, then promote to prod" simple: they genuinely can't affect
each other.

**Configure each one's `server/.env`** (and `client/.env` the same way,
with matching URLs) - the values that must differ between the two:

```
# /var/www/civilbridge-dev/server/.env
PORT=5001
CLIENT_URL=https://dev.civil-bridge.com
SERVER_URL=https://dev.civil-bridge.com
DB_NAME=civilbridge_dev

# /var/www/civilbridge-prod/server/.env
PORT=5000
CLIENT_URL=https://civil-bridge.com
SERVER_URL=https://civil-bridge.com
DB_NAME=civilbridge_prod
```

Everything else (`DB_USER`/`DB_PASSWORD`, `JWT_SECRET`, `SESSION_SECRET`
- generate these with `openssl rand -hex 32`, SMTP, Cloudinary, OAuth
keys) can be the same values in both, or you can use fully separate test
vs. real credentials for things like Cloudinary/SMTP if you want dev
activity kept completely out of production services. Note `CLIENT_URL`
and `SERVER_URL` are the same domain as each other in both cases - this
setup serves frontend and API from one origin per environment via Nginx,
so there's no separate API subdomain to manage and no CORS to fight with.

In `deploy/ecosystem.config.cjs`, rename `name:` to
`"civilbridge-dev-api"` in the dev checkout (leave it as
`"civilbridge-prod-api"` in prod) - this is the only thing that needs
editing in that file between the two checkouts.

### 18.5. First deploy of each

**Note the web root is a *sibling* directory, not `client/` itself**:
Nginx serves from `/var/www/civilbridge-dev-web` (and `-prod-web`), which
is separate from the git checkout's `/var/www/civilbridge-dev/client`
(the actual source: `package.json`, `src/`, `node_modules`). This
distinction matters a lot: an earlier version of `deploy.sh` pointed the
web root at `client/` itself, and `rsync --delete` deleted the entire
source checkout in the process (it was rsync-ing `dist/` into its own
parent directory). If you ever see rsync report "file has vanished" or
your checkout's `client/` folder is suddenly missing `package.json`/`src/`,
that's this exact problem — recover with `git checkout -- client/` from
inside the checkout (everything except `client/.env`, which isn't tracked
by git and needs recreating from your own record of its values), then
`npm install` again in `client/`.

```bash
cd /var/www/civilbridge-dev && ./deploy/deploy.sh dev
cd /var/www/civilbridge-prod && ./deploy/deploy.sh prod
```

Each run installs dependencies, runs `npm run migrate` (creates that
checkout's own database and tables), builds the frontend, copies it to
where Nginx serves it from, and starts/restarts the backend under PM2.
Then make both PM2 processes and Nginx permanent:

```bash
pm2 save                  # remember both processes across reboots
pm2 startup                # prints a command - copy/paste and run it once

sudo cp /var/www/civilbridge-prod/deploy/nginx-prod.conf.example /etc/nginx/conf.d/civilbridge-prod.conf
sudo cp /var/www/civilbridge-dev/deploy/nginx-dev.conf.example /etc/nginx/conf.d/civilbridge-dev.conf
sudo nginx -t               # should say "syntax is ok" / "test is successful"
sudo systemctl reload nginx
```

(AlmaLinux's Nginx package uses `/etc/nginx/conf.d/*.conf` directly -
there's no separate `sites-available`/`sites-enabled` step like on
Ubuntu/Debian.)

### 18.6. Point both domains at the server, then get HTTPS for both

At your domain registrar, add **two A records** - `civil-bridge.com` (plus
`www.civil-bridge.com`) and `dev.civil-bridge.com` - both pointing at your
Contabo server's public IP. DNS can take anywhere from a few minutes to a
few hours to propagate; `dig civil-bridge.com` / `dig dev.civil-bridge.com`
from your own machine shows you once each resolves.

Once they resolve:
```bash
sudo dnf install -y certbot python3-certbot-nginx
sudo certbot --nginx -d civil-bridge.com -d www.civil-bridge.com
sudo certbot --nginx -d dev.civil-bridge.com
```

Certbot edits each Nginx config in place to add its HTTPS block and sets
up auto-renewal - nothing further to do here.

### 18.7. Update the things that only make sense once the domain is real

Do this against the **production** domain/credentials - dev can keep
using its own separate OAuth apps/SMTP if you want to test those flows
without touching real ones, or just skip OAuth/email testing on dev
entirely and only wire it up for prod.

- **OAuth consoles** (Google/Facebook/X - section 16): update every
  redirect URI to `https://civil-bridge.com/api/auth/.../callback`, and
  each provider's "Website URL" field to `https://civil-bridge.com`.
- **`FROM_EMAIL`** in prod's `server/.env`: point it at a real mailbox on
  `civil-bridge.com` once you control that domain's DNS (needed for
  SPF/DKIM so outgoing mail doesn't land in spam).
- Re-submit `sitemap.xml` to Google Search Console (section 16) now that
  the domain is actually live and crawlable.

### 18.8. The ongoing update workflow

This is the part you'll actually use day to day. **Locally**, make your
changes, then:

```bash
git add .
git commit -m "describe what changed"
git push origin main
```

**On the server, test on dev first:**
```bash
ssh youruser@your-contabo-ip
cd /var/www/civilbridge-dev
./deploy/deploy.sh dev
```
Click around on `dev.civil-bridge.com` and confirm it looks right.

**Once you're happy with it, promote the exact same commit to prod:**
```bash
cd /var/www/civilbridge-prod
./deploy/deploy.sh prod
```

That's the whole cycle. `deploy.sh` handles pulling the new code,
installing anything new in `package.json`, running any new database
migrations against that checkout's own database (safe to run repeatedly -
see `migrate.js`'s own comment for why), rebuilding the frontend, and
restarting the right PM2 process. Nothing to reconfigure in Nginx, PM2, or
SELinux for a normal code update - you only touch those again for
infrastructure changes (new ports, a new subdomain, etc.).

**If you'd rather not SSH in manually every time**, the natural next step
is a GitHub Actions workflow that SSHes in and runs `deploy.sh dev`
automatically on every push to `main` (using something like
[`appleboy/ssh-action`](https://github.com/appleboy/ssh-action) with your
server's SSH key stored as a GitHub secret), with promoting to prod kept
as a manual step you trigger deliberately. That's a reasonable follow-up
once the manual flow above feels solid - worth doing as its own step
rather than the very first thing, so you're not debugging both the deploy
process and the automation at once.

Beyond this specific Contabo/AlmaLinux setup, the same pieces apply
anywhere:

- **Frontend**: `npm run build` in `client/` produces static files in
  `client/dist/` - deployable to any static host, not just via Nginx.
- **Backend**: any Node host works (Render, Railway, Google Cloud Run) if
  you'd rather not manage a VPS yourself.
- **Database**: a managed MySQL instance works fine in place of
  self-hosting it on the same VPS.
- **Email/uploads**: SMTP and Cloudinary both fail gracefully (log instead
  of crash) if left unset, so it's safe to deploy without them first and
  add real credentials later.
