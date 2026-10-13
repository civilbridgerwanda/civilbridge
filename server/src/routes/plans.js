import { Router } from "express";
import { attachUser, requireAuth } from "../middleware/auth.js";
import * as plansController from "../controllers/plans.controller.js";
import * as reviews from "../controllers/reviews.controller.js";

const router = Router();

router.get("/", plansController.list);
// Opening a specific plan's detail page is a freemium-gated action - the
// plans library list/browse itself stays public.
router.get("/:id", attachUser, requireAuth, plansController.getById);
router.get("/:id/reviews", attachUser, reviews.list("plan"));
router.post("/:id/reviews", attachUser, requireAuth, reviews.submit("plan"));
router.delete("/:id/reviews/mine", attachUser, requireAuth, reviews.removeMine("plan"));
router.post("/:id/inquiries", attachUser, requireAuth, plansController.createInquiry);

export default router;
