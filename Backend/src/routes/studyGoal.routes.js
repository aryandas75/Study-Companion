import express from "express";

import {
  getStudyGoals,
  updateStudyGoal,
} from "../controllers/studyGoal.controller.js";

import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(protect);

router.get("/", getStudyGoals);
router.put("/", updateStudyGoal);

export default router;