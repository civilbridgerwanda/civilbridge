import { Router } from "express";
import { attachUser, requireAuth } from "../middleware/auth.js";
import { requireCredits } from "../middleware/credits.js";
import * as estimatorController from "../controllers/estimator.controller.js";

const router = Router();

router.get("/mine", attachUser, requireAuth, estimatorController.mine);
router.get("/assigned", attachUser, requireAuth, estimatorController.assigned);
router.get("/:id", attachUser, requireAuth, estimatorController.getById);
// Generating an estimate is the platform's clearest "AI does real work"
// action - requires login and spends a freemium credit (paid plans bypass
// the credit check inside requireCredits itself).
router.post("/", attachUser, requireAuth, requireCredits(), estimatorController.create);
router.patch("/:id/status", attachUser, requireAuth, estimatorController.updateStatus);
router.patch("/:id/assign", attachUser, requireAuth, estimatorController.assignExpert);

export default router;
