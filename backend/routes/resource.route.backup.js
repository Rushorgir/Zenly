import express from "express";

import {
  createResource,
  deleteResource,
  getFeaturedResources,
  incrementViewCount,
  listResources,
  markAsHelpful,
  searchResources,
  updateResource,
} from "../controllers/resource.controller.js";
import authMiddleware, { requireRole } from "../middleware/auth.middleware.js";

const router = express.Router();

// Public routes
router.get("/", listResources);
router.get("/featured", getFeaturedResources); // Get featured resources (5-6 per type)
router.get("/search", searchResources); // Search ALL resources
router.post("/:id/view", incrementViewCount); // Track views
router.post("/:id/helpful", markAsHelpful); // Track helpful count

// Admin only routes
router.post("/admin", authMiddleware, requireRole("admin"), createResource);
router.patch(
  "/admin/:id",
  authMiddleware,
  requireRole("admin"),
  updateResource,
);
router.delete(
  "/admin/:id",
  authMiddleware,
  requireRole("admin"),
  deleteResource,
);

export default router;
