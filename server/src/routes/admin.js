import { Router } from "express";
import { attachUser, requireAdmin } from "../middleware/auth.js";
import * as adminController from "../controllers/admin.controller.js";

const router = Router();
router.use(attachUser, requireAdmin);

router.get("/stats", adminController.stats);
router.get("/analytics", adminController.analytics);
router.get("/estimates", adminController.listEstimates);

router.get("/users", adminController.listUsers);
router.get("/users/:id", adminController.getUserDetail);
router.patch("/users/:id/role", adminController.updateUserRole);
router.patch("/users/:id/plan", adminController.updateUserPlan);
router.patch("/users/:id/suspend", adminController.suspendUser);
router.delete("/users/:id", adminController.deleteUser);

router.post("/properties", adminController.createProperty);
router.patch("/properties/:id", adminController.updateProperty);
router.delete("/properties/:id", adminController.deleteProperty);

router.post("/plans", adminController.createPlan);
router.patch("/plans/:id", adminController.updatePlan);
router.delete("/plans/:id", adminController.deletePlan);

router.get("/newsletter", adminController.listSubscribers);
router.get("/newsletter/campaigns", adminController.listCampaigns);
router.post("/newsletter/send", adminController.sendCampaign);

router.get("/plan-inquiries", adminController.listPlanInquiries);
router.patch("/plan-inquiries/:id/status", adminController.updatePlanInquiryStatus);
router.patch("/plan-inquiries/:id/assign", adminController.assignPlanInquiry);

router.get("/payments", adminController.listAllPayments);
router.patch("/payments/:id/status", adminController.updatePaymentStatus);

export default router;
