import { Router } from "express";
import { attachUser, requireAuth } from "../middleware/auth.js";
import * as expertsController from "../controllers/experts.controller.js";

const router = Router();

router.get("/", expertsController.list);
router.get("/me", attachUser, requireAuth, expertsController.me);
router.get("/me/plan-inquiries", attachUser, requireAuth, expertsController.myPlanInquiries);
router.post("/portfolio", attachUser, requireAuth, expertsController.addPortfolioItem);
router.delete("/portfolio/:id", attachUser, requireAuth, expertsController.deletePortfolioItem);
router.get("/:id", expertsController.getById);
router.get("/:id/reviews", expertsController.listReviews);
router.post("/:id/reviews", attachUser, requireAuth, expertsController.upsertReview);
router.post("/", attachUser, requireAuth, expertsController.upsert);

export default router;
