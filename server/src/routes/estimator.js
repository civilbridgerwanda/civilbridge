import { Router } from "express";
import { attachUser, requireAuth } from "../middleware/auth.js";
import * as estimatorController from "../controllers/estimator.controller.js";

const router = Router();

router.get("/mine", attachUser, requireAuth, estimatorController.mine);
router.get("/assigned", attachUser, requireAuth, estimatorController.assigned);
router.get("/:id", estimatorController.getById);
router.post("/", attachUser, estimatorController.create);
router.patch("/:id/status", attachUser, requireAuth, estimatorController.updateStatus);
router.patch("/:id/assign", attachUser, requireAuth, estimatorController.assignExpert);

export default router;
