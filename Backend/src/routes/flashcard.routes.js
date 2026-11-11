import express from "express";

import {
  generateFlashcardsFromMaterial,
  generateFlashcardsFromTopic,
  getFlashcardDecks,
  getFlashcardDeckById,
  updateFlashcardStatus,
  deleteFlashcardDeck,
} from "../controllers/flashcard.controller.js";

import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Protect all flashcard routes
router.use(protect);

// Generate flashcards
router.post("/generate/material", generateFlashcardsFromMaterial);
router.post("/generate/topic", generateFlashcardsFromTopic);

// Fetch decks
router.get("/", getFlashcardDecks);
router.get("/:id", getFlashcardDeckById);

// Update card revision status
router.patch("/:deckId/cards/:cardId/status", updateFlashcardStatus);

// Delete deck
router.delete("/:id", deleteFlashcardDeck);

export default router;