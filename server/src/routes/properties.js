import { Router } from "express";
import { attachUser, requireAuth } from "../middleware/auth.js";
import * as propertiesController from "../controllers/properties.controller.js";
import * as reviews from "../controllers/reviews.controller.js";

const router = Router();

router.get("/", attachUser, propertiesController.list);
router.get("/mine", attachUser, requireAuth, propertiesController.mine);
// Detailed listing info is a freemium-gated action, not part of free
// browsing - the marketplace list/search itself stays public.
router.get("/:id", attachUser, requireAuth, propertiesController.getById);
router.get("/:id/reviews", attachUser, reviews.list("property"));
router.post("/:id/reviews", attachUser, requireAuth, reviews.submit("property"));
router.delete("/:id/reviews/mine", attachUser, requireAuth, reviews.removeMine("property"));
// Tour requests are what make a property reviewable (see lib/reviews.js).
router.post("/:id/visits", attachUser, requireAuth, propertiesController.requestVisit);
router.post("/", attachUser, requireAuth, propertiesController.create);
router.delete("/:id", attachUser, requireAuth, propertiesController.remove);

export default router;
