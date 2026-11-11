

import mongoose from "mongoose";
import StudyProgress from "../models/studyProgress.model.js";

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    subject: {
      type: String,
      trim: true,
      default: "General",
    },
    status: {
      type: String,
      enum: ["running", "paused", "completed"],
      default: "running",
    },
    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    lastResumedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    accumulatedSeconds: {
      type: Number,
      min: 0,
      default: 0,
    },
    duration: {
      type: Number,
      min: 0,
      default: 0,
    },
    completed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const PomodoroSession =
  mongoose.models.PomodoroSession ||
  mongoose.model("PomodoroSession", sessionSchema);

const getElapsedSeconds = (session, now = new Date()) => {
  let totalSeconds = session.accumulatedSeconds || 0;

  if (session.status === "running" && session.lastResumedAt) {
    const runningSeconds = Math.floor(
      (now.getTime() -
        new Date(session.lastResumedAt).getTime()) /
        1000
    );

    totalSeconds += Math.max(0, runningSeconds);
  }

  return totalSeconds;
};

const validateSessionId = (id) =>
  mongoose.Types.ObjectId.isValid(id);

// START SESSION
export const startSession = async (req, res) => {
  try {
    const existingSession = await PomodoroSession.findOne({
      userId: req.userId,
      status: { $in: ["running", "paused"] },
    });

    if (existingSession) {
      return res.status(409).json({
        success: false,
        message: "You already have an active study session",
        session: existingSession,
      });
    }

    const { subject } = req.body;

    const sessionSubject =
      typeof subject === "string" && subject.trim()
        ? subject.trim()
        : "General";

    const now = new Date();

    const session = await PomodoroSession.create({
      userId: req.userId,
      subject: sessionSubject,
      status: "running",
      startedAt: now,
      lastResumedAt: now,
      accumulatedSeconds: 0,
      duration: 0,
      completed: false,
    });

    return res.status(201).json({
      success: true,
      message: "Study session started",
      session,
    });
  } catch (error) {
    console.error("Start session error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to start study session",
      error: error.message,
    });
  }
};

// PAUSE SESSION
export const pauseSession = async (req, res) => {
  try {
    const { id } = req.params;

    if (!validateSessionId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid session ID",
      });
    }

    const session = await PomodoroSession.findOne({
      _id: id,
      userId: req.userId,
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Study session not found",
      });
    }

    if (session.status !== "running") {
      return res.status(400).json({
        success: false,
        message: "Only a running session can be paused",
      });
    }

    const now = new Date();

    session.accumulatedSeconds = getElapsedSeconds(session, now);
    session.status = "paused";
    session.lastResumedAt = null;

    await session.save();

    return res.status(200).json({
      success: true,
      message: "Study session paused",
      session,
      elapsedSeconds: session.accumulatedSeconds,
    });
  } catch (error) {
    console.error("Pause session error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to pause study session",
      error: error.message,
    });
  }
};

// RESUME SESSION
export const resumeSession = async (req, res) => {
  try {
    const { id } = req.params;

    if (!validateSessionId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid session ID",
      });
    }

    const session = await PomodoroSession.findOne({
      _id: id,
      userId: req.userId,
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Study session not found",
      });
    }

    if (session.status !== "paused") {
      return res.status(400).json({
        success: false,
        message: "Only a paused session can be resumed",
      });
    }

    session.status = "running";
    session.lastResumedAt = new Date();

    await session.save();

    return res.status(200).json({
      success: true,
      message: "Study session resumed",
      session,
      elapsedSeconds: session.accumulatedSeconds,
    });
  } catch (error) {
    console.error("Resume session error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to resume study session",
      error: error.message,
    });
  }
};

// FINISH SESSION
export const finishSession = async (req, res) => {
  try {
    const { id } = req.params;

    if (!validateSessionId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid session ID",
      });
    }

    const session = await PomodoroSession.findOne({
      _id: id,
      userId: req.userId,
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Study session not found",
      });
    }

    if (session.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "This session is already completed",
      });
    }

    const now = new Date();
    const actualSeconds = getElapsedSeconds(session, now);

    if (actualSeconds < 1) {
      return res.status(400).json({
        success: false,
        message: "Study for at least one second before finishing",
      });
    }

    // Check whether a progress record already exists.
    // This prevents duplicate records if a previous request partially succeeded.
    let progress = await StudyProgress.findOne({
      user: req.userId,
      pomodoroSession: session._id,
    });

    const previousStatus = session.status;
    const previousAccumulatedSeconds = session.accumulatedSeconds;
    const previousDuration = session.duration;
    const previousCompleted = session.completed;
    const previousEndedAt = session.endedAt;
    const previousLastResumedAt = session.lastResumedAt;

    session.accumulatedSeconds = actualSeconds;
    session.duration = actualSeconds / 60;
    session.status = "completed";
    session.completed = true;
    session.endedAt = now;
    session.lastResumedAt = null;

    try {
      await session.save();

      if (!progress) {
        progress = await StudyProgress.create({
          user: req.userId,
          date: session.startedAt,
          subject: session.subject,
          topic: "Stopwatch Study Session",
          pomodoroSession: session._id,
          studyTimeSeconds: actualSeconds,
          studyTimeMinutes: actualSeconds / 60,
          quizzesAttempted: 0,
          correctAnswers: 0,
          totalQuestions: 0,
          scorePercentage: 0,
        });
      }
    } catch (saveError) {
      // Roll back the session state if progress creation fails.
      session.status = previousStatus;
      session.accumulatedSeconds = previousAccumulatedSeconds;
      session.duration = previousDuration;
      session.completed = previousCompleted;
      session.endedAt = previousEndedAt;
      session.lastResumedAt = previousLastResumedAt;

      await session.save();

      throw saveError;
    }

    return res.status(200).json({
      success: true,
      message: "Study session completed and progress updated",
      session,
      elapsedSeconds: actualSeconds,
      progress,
    });
  } catch (error) {
    console.error("Finish session error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to finish study session",
      error: error.message,
    });
  }
};

// GET SESSION HISTORY
export const getSessions = async (req, res) => {
  try {
    const sessions = await PomodoroSession.find({
      userId: req.userId,
    }).sort({ createdAt: -1 });

    const completedSessions = sessions.filter(
      (session) => session.status === "completed"
    );

    const totalSeconds = completedSessions.reduce(
      (total, session) =>
        total + (session.accumulatedSeconds || 0),
      0
    );

    return res.status(200).json({
      success: true,
      sessions,
      stats: {
        totalSessions: sessions.length,
        completedSessions: completedSessions.length,
        totalSeconds,
        totalMinutes: totalSeconds / 60,
      },
    });
  } catch (error) {
    console.error("Get sessions error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch sessions",
      error: error.message,
    });
  }
};

// DELETE COMPLETED SESSION
export const deleteSession = async (req, res) => {
  try {
    const { id } = req.params;

    if (!validateSessionId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid session ID",
      });
    }

    const session = await PomodoroSession.findOne({
      _id: id,
      userId: req.userId,
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Study session not found",
      });
    }

    if (session.status !== "completed") {
      return res.status(400).json({
        success: false,
        message: "Only completed sessions can be deleted",
      });
    }

    await StudyProgress.deleteOne({
      user: req.userId,
      pomodoroSession: session._id,
    });

    await PomodoroSession.deleteOne({
      _id: session._id,
      userId: req.userId,
    });

    return res.status(200).json({
      success: true,
      message: "Study session deleted successfully",
    });
  } catch (error) {
    console.error("Delete session error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete study session",
      error: error.message,
    });
  }
};
