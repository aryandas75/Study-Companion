import express from "express";

import {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  getTaskStats,
  getUpcomingTasks,
  getTodayTasks,
  getOverdueTasks,
} from "../controllers/studyTask.controller.js";

import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Protect all study task routes
router.use(protect);

// Statistics
router.get("/stats", getTaskStats);

// Today's tasks
router.get("/today", getTodayTasks);

// Upcoming tasks
router.get("/upcoming", getUpcomingTasks);

// Overdue tasks
router.get("/overdue", getOverdueTasks);

// Create a task
router.post("/", createTask);

// Get all tasks
router.get("/", getTasks);

// Get, update, and delete a task by ID
router.get("/:id", getTaskById);
router.patch("/:id", updateTask);
router.delete("/:id", deleteTask);

export default router;