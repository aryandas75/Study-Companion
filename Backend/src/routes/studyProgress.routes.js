import express from "express";

import { protect } from "../middlewares/auth.middleware.js";

import {
  recordStudyProgress,
  getStudyProgress,
  getStudyProgressSummary,
  updateStudyProgress,
} from "../controllers/studyProgress.controller.js";

const router = express.Router();

router.use(protect);


// Record study progress.
router.post("/", recordStudyProgress);


// Get progress summary.
// Keep this before /:id.
router.get("/summary", getStudyProgressSummary);


// Get all study progress records.
router.get("/", getStudyProgress);


// Update a progress record.
router.patch("/:id", updateStudyProgress);

export default router;