import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import multer from "multer";

// Import routes
import authRoutes from "./routes/auth.routes.js";
import studyMaterialRoutes from "./routes/studyMaterial.routes.js";
import noteRoutes from "./routes/note.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import quizRoutes from "./routes/quiz.routes.js";
import studyProgressRoutes from "./routes/studyProgress.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import studyTaskRoutes from "./routes/studyTask.routes.js";
import pomodoroRoutes from "./routes/pomodoro.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import studyGoalRoutes from "./routes/studyGoal.routes.js";
import flashcardRoutes from "./routes/flashcard.routes.js";
const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// Register routes
app.use("/api/auth", authRoutes);
app.use("/api/study-materials", studyMaterialRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/study-progress", studyProgressRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/study-tasks", studyTaskRoutes);
app.use("/api/pomodoro", pomodoroRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/study-goals", studyGoalRoutes);
app.use("/api/flashcards", flashcardRoutes);
// Error handler
app.use((err, req, res, next) => { 
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message:
        err.code === "LIMIT_FILE_SIZE"
          ? "File size must not exceed 10 MB"
          : "File upload failed",
    });
  }

  if (
    err.message ===
    "Only PDF, TXT, and DOCX files are allowed"
  ) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  console.error("Server error:", err);

  return res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

export default app;