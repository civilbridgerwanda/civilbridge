import { Router } from "express";
import { attachUser, requireAuth } from "../middleware/auth.js";
import * as paymentsController from "../controllers/payments.controller.js";

const router = Router();
router.use(attachUser, requireAuth);

router.post("/", paymentsController.create);
router.get("/mine", paymentsController.mine);
router.get("/received", paymentsController.received);

export default router;
