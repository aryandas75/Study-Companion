import mongoose from "mongoose";

const studyProgressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    date: {
      type: Date,
      required: true,
      default: Date.now,
    },

    subject: {
      type: String,
      required: true,
      trim: true,
    },

    topic: {
      type: String,
      required: true,
      trim: true,
    },

    pomodoroSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PomodoroSession",
      default: null,
    },

    quizAttempt: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "QuizAttempt",
      default: null,
    },

    studyTimeSeconds: {
      type: Number,
      min: 0,
      default: 0,
    },

    studyTimeMinutes: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    quizzesAttempted: {
      type: Number,
      min: 0,
      default: 0,
    },

    correctAnswers: {
      type: Number,
      min: 0,
      default: 0,
    },

    totalQuestions: {
      type: Number,
      min: 0,
      default: 0,
    },

    scorePercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const StudyProgress =
  mongoose.models.StudyProgress ||
  mongoose.model("StudyProgress", studyProgressSchema);

export default StudyProgress;