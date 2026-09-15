import { Router } from "express";
import { attachUser, requireAuth } from "../middleware/auth.js";
import * as propertiesController from "../controllers/properties.controller.js";

const router = Router();

router.get("/", propertiesController.list);
router.get("/mine", attachUser, requireAuth, propertiesController.mine);
router.get("/:id", propertiesController.getById);
router.post("/", attachUser, requireAuth, propertiesController.create);
router.delete("/:id", attachUser, requireAuth, propertiesController.remove);

export default router;
