import { Router } from "express";
import { createHmac, timingSafeEqual } from "crypto";
import { AgentJob } from "../models/index.js";
import { getIntegrations, isAgentActive } from "../config/integrations.js";
import { completeJob, failJob, reportProgress } from "../agent/jobs.js";

const router = Router();

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// n8n proves a callback is really from it by signing the exact request body
// with the shared N8N_CALLBACK_SECRET: header
//   X-CivilBridge-Signature: sha256=<hex HMAC-SHA256 of the raw body>
// Compared in constant time so the check can't be probed byte by byte.
function hasValidSignature(req, secret) {
  const provided = (req.get("x-civilbridge-signature") || "").replace(/^sha256=/i, "").trim();
  const expected = createHmac("sha256", secret).update(req.rawBody || Buffer.alloc(0)).digest("hex");
  const a = Buffer.from(provided, "hex");
  const b = Buffer.from(expected, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

// POST /api/agent/callback
// The one door the agent uses to report back. Deliberately not behind user
// auth (n8n has no user) - the signature is the credential.
//   { job_id, status: "running"|"completed"|"failed",
//     stage?, progress?, result?, error? }
router.post("/callback", async (req, res) => {
  try {
    if (!isAgentActive()) {
      return res.status(503).json({ success: false, message: "The agent integration is not active" });
    }
    if (!hasValidSignature(req, getIntegrations().agent.n8n.callbackSecret)) {
      return res.status(401).json({ success: false, message: "Bad signature" });
    }

    const io = req.app.get("io");
    const { job_id, status, stage, progress, result, error } = req.body || {};
    if (typeof job_id !== "string" || !UUID.test(job_id)) {
      return res.status(400).json({ success: false, message: "job_id is required" });
    }
    if (!["running", "completed", "failed"].includes(status)) {
      return res.status(400).json({ success: false, message: 'status must be "running", "completed" or "failed"' });
    }

    const job = await AgentJob.findByPk(job_id);
    if (!job) return res.status(404).json({ success: false, message: "Unknown job" });

    // Agents retry callbacks; a finished job never changes again.
    if (job.status === "completed" || job.status === "failed") {
      return res.json({ success: true, ignored: true });
    }

    if (status === "running") await reportProgress(job, { stage, progress }, io);
    else if (status === "completed") await completeJob(job, result, { source: "agent" }, io);
    else await failJob(job, error, io);

    res.json({ success: true });
  } catch (err) {
    console.error("Agent callback error:", err);
    res.status(500).json({ success: false, message: "Could not process the callback" });
  }
});

export default router;
