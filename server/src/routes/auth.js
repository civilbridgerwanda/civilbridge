import { Router } from "express";
import { attachUser, requireAuth } from "../middleware/auth.js";
import * as authController from "../controllers/auth.controller.js";

const router = Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.get("/me", attachUser, requireAuth, authController.me);
router.post("/verify-email", authController.verifyEmail);
router.post("/resend-otp", authController.resendOtp);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

export default router;
