import { Router } from "express";
import { attachUser, requireAuth } from "../middleware/auth.js";
import * as estimatorController from "../controllers/estimator.controller.js";

const router = Router();

router.get("/mine", attachUser, requireAuth, estimatorController.mine);
router.get("/assigned", attachUser, requireAuth, estimatorController.assigned);
router.get("/:id", attachUser, requireAuth, estimatorController.getById);
// Generating an estimate is the platform's clearest "AI does real work"
// action - it needs login and is covered by the account's monthly allowance or
// a purchased credit (lib/allowance.js, taken inside create()).
// validateEstimateRequest is first on purpose: a request without an uploaded
// file (the Estimator's gate) is refused before anything is spent.
router.post(
  "/",
  attachUser,
  requireAuth,
  estimatorController.validateEstimateRequest,
  estimatorController.create
);
router.put("/:id/results", attachUser, requireAuth, estimatorController.saveResults);
router.patch("/:id/status", attachUser, requireAuth, estimatorController.updateStatus);

export default router;
