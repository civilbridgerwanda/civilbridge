import { Router } from "express";
import { attachUser, requireAuth } from "../middleware/auth.js";
import * as notificationsController from "../controllers/notifications.controller.js";

const router = Router();
router.use(attachUser, requireAuth);

router.get("/", notificationsController.list);
router.patch("/:id/read", notificationsController.markRead);
router.patch("/read-all", notificationsController.markAllRead);

export default router;
