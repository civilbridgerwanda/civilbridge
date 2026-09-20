import { Router } from "express";
import { attachUser, requireAuth } from "../middleware/auth.js";
import * as aiStudioController from "../controllers/aiStudio.controller.js";

const router = Router();

// Public and read-only, on purpose - mounted before the auth gate below so
// anyone with a share link can view the transcript without an account.
router.get("/shared/:token", aiStudioController.getSharedConversation);

// Everything else requires login - conversations are scoped to req.user.sub
// in the controller. Casual back-and-forth chat doesn't cost a credit (only
// specific "generate a document" actions elsewhere do), but it still needs
// an authenticated user so one person's conversations are never returned to
// another's session.
router.use(attachUser, requireAuth);

router.get("/conversations", aiStudioController.listConversations);
router.get("/conversations/:id", aiStudioController.getConversation);
router.post("/conversations", aiStudioController.createConversation);
router.post("/conversations/:id/messages", aiStudioController.sendMessage);
router.post("/conversations/:id/share", aiStudioController.shareConversation);

export default router;
