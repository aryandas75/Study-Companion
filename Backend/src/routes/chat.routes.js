
import express from "express";

import { protect } from "../middlewares/auth.middleware.js";

import {
  getChats,
  createChat,
  getChat,
  deleteChat,
  renameChat,
} from "../controllers/chat.controller.js";

const router = express.Router();

router.use(protect);

router.get("/", getChats);
router.post("/", createChat);
router.get("/:id", getChat);
router.patch("/:id", renameChat);
router.delete("/:id", deleteChat);

export default router;
