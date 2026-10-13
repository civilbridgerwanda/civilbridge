import { Router } from "express";
import { buildFeed } from "../lib/feeds.js";

const router = Router();

const TYPES = ["all", "properties", "plans"];

// GET /api/feeds/pinterest.xml[?type=properties|plans]
// Public RSS 2.0 feed Pinterest reads to auto-publish new listings as pins.
// Separate feeds per type let each go to its own Pinterest board.
router.get("/pinterest.xml", async (req, res) => {
  try {
    const type = TYPES.includes(req.query.type) ? req.query.type : "all";
    const body = await buildFeed(type);
    res.set({
      "Content-Type": "application/rss+xml; charset=utf-8",
      // A short cache keeps a busy crawler from hammering the database while
      // still showing new listings within minutes.
      "Cache-Control": "public, max-age=600",
    });
    res.send(body);
  } catch (err) {
    console.error("Feed error:", err);
    res.status(500).type("text/plain").send("Feed unavailable");
  }
});

export default router;
