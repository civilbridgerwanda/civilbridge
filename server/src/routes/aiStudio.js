import { Router } from "express";
import * as aiStudioController from "../controllers/aiStudio.controller.js";

const router = Router();

router.get("/conversations", aiStudioController.listConversations);
router.get("/conversations/:id", aiStudioController.getConversation);
router.post("/conversations", aiStudioController.createConversation);
router.post("/conversations/:id/messages", aiStudioController.sendMessage);

export default router;
