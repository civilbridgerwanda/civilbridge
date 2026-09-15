import { Router } from "express";
import * as contactController from "../controllers/contact.controller.js";

const router = Router();

router.post("/", contactController.submit);

export default router;
