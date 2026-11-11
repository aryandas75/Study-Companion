import express from "express";
import {
  askAI,
  summarizeText,
  generateQuestions,
  summarizeStudyMaterial,
} from "../controllers/ai.controller.js";

import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(protect);

router.post("/ask", askAI);
router.post("/summarize", summarizeText);
router.post("/questions", generateQuestions);
router.post("/summarize/:id", summarizeStudyMaterial);

export default router;