import express from "express";
import { optionalAuth } from "../middleware/auth.middleware.js";
import rateLimit from "express-rate-limit";
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

// Apply a strict rate limiter for resource deletion. For example: max 5 deletions per IP per hour.
const deleteResourceLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 requests per hour
  message: "Too many delete requests from this IP, please try again after an hour."
});

const router = express.Router();

router.get("/featured", getFeaturedResources);
router.get("/search", searchResources);
router.get("/all", getAllResources);
router.get("/:id", getResourceById);
router.post("/:id/view", optionalAuth, incrementViewCount);
router.post("/:id/helpful", markAsHelpful);

router.post("/admin/create", createResource);
router.patch("/admin/:id", updateResource);
router.delete("/admin/:id", deleteResourceLimiter, deleteResource);

export default router;
