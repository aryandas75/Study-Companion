import express from "express";

import { getStudyAnalytics } from "../controllers/analytics.controller.js";

import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", protect, getStudyAnalytics);

export default router;