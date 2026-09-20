import { Router } from "express";
import { attachUser, requireAuth } from "../middleware/auth.js";
import * as plansController from "../controllers/plans.controller.js";

const router = Router();

router.get("/", plansController.list);
// Opening a specific plan's detail page is a freemium-gated action - the
// plans library list/browse itself stays public.
router.get("/:id", attachUser, requireAuth, plansController.getById);
router.get("/:id/reviews", attachUser, requireAuth, plansController.listReviews);
router.post("/:id/reviews", attachUser, requireAuth, plansController.upsertReview);
router.post("/:id/inquiries", attachUser, requireAuth, plansController.createInquiry);

export default router;
