import { Router } from "express";
import { buildCatalog } from "../lib/pricingCatalog.js";

const router = Router();

// GET /api/pricing - the plan cards and pay-as-you-go prices, generated from
// the same config the server enforces. Public: it's what the Pricing page shows.
router.get("/", (_req, res) => {
  res.json({ success: true, data: buildCatalog() });
});

export default router;
