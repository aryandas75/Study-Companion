import express from "express";

import { protect } from "../middlewares/auth.middleware.js";

import {
  createQuiz,
  generateQuiz,
  getQuizzes,
  getQuizById,
  submitQuizAttempt,
  getQuizAttempts,
  deleteQuiz,
} from "../controllers/quiz.controller.js";

const router = express.Router();

router.use(protect);


// Generate an AI quiz.
router.post("/generate", generateQuiz);


// Get all quiz attempts.
router.get("/attempts", getQuizAttempts);


// Create a manual quiz.
router.post("/", createQuiz);


// Get all saved quizzes.
router.get("/", getQuizzes);


// Submit a quiz attempt.
router.post("/:id/attempts", submitQuizAttempt);


// Get a specific quiz.
router.get("/:id", getQuizById);


// Delete a quiz.
router.delete("/:id", deleteQuiz);

export default router;