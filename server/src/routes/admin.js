import { Router } from "express";
import { attachUser, requireAdmin } from "../middleware/auth.js";
import * as adminController from "../controllers/admin.controller.js";
import * as adminOps from "../controllers/adminOps.controller.js";
import * as reviews from "../controllers/reviews.controller.js";

const router = Router();
router.use(attachUser, requireAdmin);

router.get("/stats", adminController.stats);
router.get("/analytics", adminController.analytics);
router.get("/estimates", adminController.listEstimates);
router.patch("/estimates/:id/assign", adminOps.assignEstimateToExpert);
router.post("/estimates/:id/nudge", adminOps.nudgeEstimate);

router.get("/users", adminController.listUsers);
router.get("/users/:id", adminController.getUserDetail);
router.patch("/users/:id/role", adminController.updateUserRole);
router.patch("/users/:id/plan", adminController.updateUserPlan);
router.patch("/users/:id/suspend", adminController.suspendUser);
router.delete("/users/:id", adminController.deleteUser);

router.post("/properties", adminController.createProperty);
router.patch("/properties/:id", adminController.updateProperty);
router.patch("/properties/:id/approve", adminController.approveProperty);
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

// Integrations status (booleans only - never a key) and the agent queue.
router.get("/integrations", adminOps.integrations);
router.post("/agent/dispatch-queued", adminOps.dispatchQueuedJobs);

// Verifying experts (a human credentials check) drives the "verified experts" counter.
router.get("/experts", adminOps.listExperts);
router.patch("/experts/:id/verify", adminOps.setExpertVerified);

// Site-tour requests; completing one is what lets that visitor review the property.
router.get("/visits", adminOps.listVisits);
router.patch("/visits/:id", adminOps.updateVisitStatus);

// Removing an abusive review (recomputes the parent's rating).
router.delete("/reviews/:kind/:reviewId", reviews.adminRemove);

// Read-only oversight of every direct conversation on the platform -
// compliance/moderation visibility, not a participant-only view.
router.get("/conversations", adminController.listAllConversations);
router.get("/conversations/:id", adminController.getConversationDetail);

export default router;
