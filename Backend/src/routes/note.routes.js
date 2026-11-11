import express from "express";

import { protect } from "../middlewares/auth.middleware.js";

import {
  createNote,
  getNotes,
  getNoteById,
  updateNote,
  deleteNote,
  toggleFavorite,
} from "../controllers/note.controller.js";

const router = express.Router();

// All note routes require authentication.
router.use(protect);

router.post("/", createNote);
router.get("/", getNotes);
router.get("/:id", getNoteById);
router.patch("/:id", updateNote);
router.delete("/:id", deleteNote);
router.patch("/:id/favorite", toggleFavorite);

export default router;