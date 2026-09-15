import { Router } from "express";
import { attachUser, requireAuth } from "../middleware/auth.js";
import * as messagesController from "../controllers/messages.controller.js";

const router = Router();
router.use(attachUser, requireAuth);

router.get("/support-contact", messagesController.getSupportContact);
router.get("/conversations", messagesController.listConversations);
router.post("/conversations", messagesController.startConversation);
router.get("/conversations/:id", messagesController.getConversation);
router.post("/conversations/:id/messages", messagesController.sendMessage);

export default router;
