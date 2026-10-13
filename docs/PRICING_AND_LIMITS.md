# Pricing and limits

Everything about what things cost and what each account level may do lives in
**one file: [`server/src/config/pricing.js`](../server/src/config/pricing.js)**.
Change a number there and it changes everywhere at once - what the server
enforces, what a payment request is charged, and what the Pricing page says
(the page is generated from this file by `GET /api/pricing`, so it can't promise
more or less than the system does).

All RWF figures are placeholders until pricing is finalised.

## What's set today

| | Starter | Professional | Business |
|---|---|---|---|
| Price | Free | RWF 15,000 / month (150,000 / year) | Custom |
| Cost estimates | **1 free per month** | Unlimited | Unlimited |
| Priority in the assignment queue | - | Yes | Yes |
| Building plan downloads | Pay per plan | All included | All included |
| New expert conversations | 3 per month | Unlimited | Unlimited |
| Active property listings | 1 | 10 | Unlimited |

Pay-as-you-go (for anyone, any level):

| | Price |
|---|---|
| Cost estimate | RWF 20,000 |
| Estimate + CAD drawings | RWF 50,000 |
| CAD drawings add-on (on any estimate) | RWF 30,000 (= the difference) |
| Building plan | that plan's own licence price |
| Building plan + cost estimate | licence price + RWF 20,000 |

Drawings are always a paid extra - including on a free or subscription estimate.
Professional is deliberately **not** capped: the admin team assigns every
estimate by hand, so they control the pace of work.

## How each limit is enforced

- **Estimates** - `server/src/lib/allowance.js`. Each estimate is covered by the
  monthly allowance, a purchased credit, or (for admins) neither. The check, the
  credit it takes and the estimate itself happen in **one database transaction**
  with the user row locked: a failure gives the credit back, and two requests at
  the same instant can't both spend the last one. "Per month" is the calendar month.
- **Expert conversations and listings** - `server/src/lib/limits.js`. Only a
  conversation the person *starts* with an *expert* counts (support, non-experts,
  re-opening an existing conversation, and experts contacting them are free). Sold
  properties don't use a listing slot.
- **Purchases** - `server/src/controllers/payments.controller.js` prices every
  purchase itself (the client's amount is ignored). When the team marks a payment
  completed, `server/src/lib/entitlements.js` adds the credits or unlocks the plan
  automatically; reversing it takes unspent credits back (never below zero).

## Purchases and what they grant

| Purchase (`purpose`) | Options | Grants on confirmation |
|---|---|---|
| `estimate_purchase` | `estimate`, `estimate_drawings` | 1 estimate credit (+1 drawing credit) |
| `drawings_addon` | - | 1 drawing credit |
| `plan_license` | plan only / plan + estimate (`include_estimate`) | access to the plan (+1 estimate credit) |
| `plan_upgrade` | `professional` monthly / annual | the account level |

## Changing things

- **A price or limit** - edit `pricing.js`. `null` means unlimited.
- **A new limit** - add it to `TIERS`, enforce it in `lib/limits.js`, and add a
  line for it in `server/src/lib/pricingCatalog.js` (which reads the limit, so the
  wording follows the number).
- **Payment details (MoMo code, bank account, card link)** - `client/src/lib/paymentMethods.js`.
  Until they're filled in, the payment screen tells the client the team will send them.

## Not built yet (deliberately)

- A cap on how many plan downloads a Professional account can make.
- Giving a credit back automatically when an estimate is cancelled (there's no
  cancel action yet).
- Storage quotas per account.
