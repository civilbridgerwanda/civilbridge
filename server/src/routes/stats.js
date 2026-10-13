import { Router } from "express";
import { getPublicStats } from "../lib/stats.js";
import { isAgentActive } from "../config/integrations.js";

const router = Router();

// GET /api/stats/public - homepage counters. Public on purpose: aggregate
// counts only, nothing about any individual user or project.
router.get("/public", async (_req, res) => {
  try {
    const stats = await getPublicStats();
    res.json({
      success: true,
      data: {
        ...stats,
        // Whether the drawing-set agent is live - so pages only promise CAD
        // drawings when something can actually produce them. Read fresh (not
        // cached with the counters): switching the agent on shouldn't wait.
        drawings_enabled: isAgentActive(),
      },
    });
  } catch (err) {
    console.error("Stats error:", err);
    res.status(500).json({ success: false, message: "Failed to load statistics" });
  }
});

export default router;
