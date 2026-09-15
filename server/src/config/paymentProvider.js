import dotenv from "dotenv";

dotenv.config();

/**
 * No real payment gateway is connected yet - this flag exists so the rest
 * of the app can check it and be honest with users instead of pretending
 * a payment went through.
 *
 * When you're ready to accept real money, the practical choice for Rwanda
 * is Flutterwave (supports Visa/Mastercard plus MTN Mobile Money and
 * Airtel Money). To wire it in:
 *   1. Create an account at flutterwave.com, get your secret key.
 *   2. Add FLUTTERWAVE_SECRET_KEY to server/.env.
 *   3. In controllers/payments.controller.js, replace the "pending"
 *      creation step with a real call to Flutterwave's payment
 *      initialization endpoint, and add a webhook route to receive their
 *      payment-completed callback and update the Payment row's status.
 * Everything else (the Payment model, the dashboard UI, admin
 * reconciliation) already works the same way either way.
 */
export const hasPaymentProviderConfig = Boolean(process.env.FLUTTERWAVE_SECRET_KEY);
