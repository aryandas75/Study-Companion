import express from "express";

import {
  startSession,
  pauseSession,
  resumeSession,
  finishSession,
  getSessions,
  deleteSession,
} from "../controllers/pomodoro.controller.js";

import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(protect);

router.post("/start", startSession);
router.patch("/:id/pause", pauseSession);
router.patch("/:id/resume", resumeSession);
router.patch("/:id/finish", finishSession);

router.get("/", getSessions);
router.delete("/:id", deleteSession);

export default router;