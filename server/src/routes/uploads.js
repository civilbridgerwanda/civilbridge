import { Router } from "express";
import { upload } from "../middleware/upload.js";
import { attachUser, requireAuth } from "../middleware/auth.js";
import * as uploadsController from "../controllers/uploads.controller.js";

const router = Router();

router.post("/image", attachUser, requireAuth, upload.single("file"), uploadsController.uploadImage);
router.post("/images", attachUser, requireAuth, upload.array("files", 10), uploadsController.uploadImages);

export default router;
