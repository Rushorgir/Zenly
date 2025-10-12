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
router.post("/:id/helpful", optionalAuth, resourceHelpfulLimiter, markAsHelpful);

// Admin-only resource mutations with auth + role check + limiter
router.post("/admin/create", authMiddleware, requireRole("admin"), resourceMutationLimiter, createResource);
router.patch("/admin/:id", authMiddleware, requireRole("admin"), resourceMutationLimiter, updateResource);
router.delete("/admin/:id", authMiddleware, requireRole("admin"), resourceMutationLimiter, deleteResource);

export default router;
