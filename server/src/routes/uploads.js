import { Router } from "express";
import { upload, planUpload } from "../middleware/upload.js";
import { attachUser, requireAuth } from "../middleware/auth.js";
import * as uploadsController from "../controllers/uploads.controller.js";

const router = Router();

router.post("/image", attachUser, requireAuth, upload.single("file"), uploadsController.uploadImage);
router.post("/images", attachUser, requireAuth, upload.array("files", 10), uploadsController.uploadImages);
// multer reports a rejected file (wrong type, too big) as a thrown error, which
// Express would turn into an HTML page - answer with the same JSON shape as
// every other failure so the Estimator can show the reason.
function acceptPlanFile(req, res, next) {
  planUpload.single("file")(req, res, (err) => {
    if (!err) return next();
    const message = err.code === "LIMIT_FILE_SIZE" ? "That file is larger than the 50 MB limit." : err.message;
    res.status(400).json({ success: false, message });
  });
}

router.post("/plan", attachUser, requireAuth, acceptPlanFile, uploadsController.uploadPlan);

export default router;
