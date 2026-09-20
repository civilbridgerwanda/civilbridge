import { subscribeEmail } from "../lib/newsletterService.js";

// POST /api/newsletter/subscribe
export async function subscribe(req, res) {
  try {
    const { email } = req.body;
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ success: false, message: "A valid email address is required" });
    }

    const { alreadySubscribed } = await subscribeEmail(email);
    res.status(alreadySubscribed ? 200 : 201).json({ success: true, data: { alreadySubscribed } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to subscribe" });
  }
}
