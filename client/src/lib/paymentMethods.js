// The ways a client can say they're paying. Mirrors PAYMENT_METHODS in
// server/src/config/pricing.js - a value not listed there is rejected by
// the API.
//
// No payment gateway is connected yet, so every method works the same way
// today: the client picks one, submits, and the team verifies the money
// arrived before marking it completed (which unlocks access automatically).
//
// WHEN YOU DECIDE HOW MONEY IS COLLECTED: fill in `details` below with the
// real MoMo code / bank account / card-payment link and it shows up in the
// modal immediately. Leave it null and the modal tells the client the team
// will send the details right after they submit - so nothing here is
// fabricated in the meantime.
export const PAYMENT_METHODS = [
  {
    value: "mobile_money",
    label: "Mobile Money",
    hint: "MTN or Airtel",
    details: null, // e.g. "Dial *182*8*1# and pay to code 123456 (CivilBridge Ltd)"
  },
  {
    value: "bank_transfer",
    label: "Bank transfer",
    hint: "Any Rwandan bank",
    details: null, // e.g. "Bank of Kigali - Acct 000-0000000-00 - CivilBridge Ltd"
  },
  {
    value: "card",
    label: "Card",
    hint: "Visa / Mastercard",
    details: null, // e.g. a hosted payment-link URL once a card processor is chosen
  },
];

// Keep in step with ESTIMATE_BUNDLE_MULTIPLIER in server/src/config/pricing.js.
// The server always recomputes the real amount; this only drives what the
// modal displays before submitting.
export const ESTIMATE_BUNDLE_MULTIPLIER = 1.15;
