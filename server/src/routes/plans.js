import { Router } from "express";
import * as plansController from "../controllers/plans.controller.js";

const router = Router();

router.get("/", plansController.list);
router.get("/:id", plansController.getById);
router.post("/:id/inquiries", plansController.createInquiry);

export default router;
