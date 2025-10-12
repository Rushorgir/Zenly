import express from "express";
import authMiddleware, { optionalAuth, requireRole } from "../middleware/auth.middleware.js";
import { 
  resourceSearchLimiter, 
  resourceViewLimiter, 
  resourceHelpfulLimiter, 
  resourceMutationLimiter 
} from "../middleware/resource-rate-limiter.middleware.js";
import {
  getFeaturedResources,
  searchResources,
  getResourceById,
  incrementViewCount,
  markAsHelpful,
  createResource,
  updateResource,
  deleteResource,
  getAllResources
} from "../controllers/resource.controller.js";

const router = express.Router();

router.get("/featured", getFeaturedResources);
router.get("/search", resourceSearchLimiter, searchResources);
router.get("/all", getAllResources);
router.get("/:id", getResourceById);
router.post("/:id/view", resourceViewLimiter, optionalAuth, incrementViewCount);
router.post("/:id/helpful", resourceHelpfulLimiter, optionalAuth, markAsHelpful);

// Admin-only resource mutations with auth + role check + limiter
router.post("/admin/create", resourceMutationLimiter, authMiddleware, requireRole("admin"), createResource);
router.patch("/admin/:id", resourceMutationLimiter, authMiddleware, requireRole("admin"), updateResource);
router.delete("/admin/:id", resourceMutationLimiter, authMiddleware, requireRole("admin"), deleteResource);

export default router;
