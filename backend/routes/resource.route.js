import express from "express";
import { optionalAuth } from "../middleware/auth.middleware.js";
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
router.get("/search", searchResources);
router.get("/all", getAllResources);
router.get("/:id", getResourceById);
router.post("/:id/view", optionalAuth, incrementViewCount);
router.post("/:id/helpful", markAsHelpful);

router.post("/admin/create", createResource);
router.patch("/admin/:id", updateResource);
router.delete("/admin/:id", deleteResource);

export default router;
