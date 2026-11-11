import mongoose from "mongoose";

const answerSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    selectedAnswer: {
      type: String,
      enum: ["A", "B", "C", "D", null],
      default: null,
    },

    correctAnswer: {
      type: String,
      enum: ["A", "B", "C", "D"],
      required: true,
    },

    isCorrect: {
      type: Boolean,
      required: true,
    },
  },
  {
    _id: false,
  }
);

const quizAttemptSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Optional because the original quiz may be deleted.
    quiz: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz",
      default: null,
      index: true,
    },

    quizTitle: {
      type: String,
      required: true,
    },

    subject: {
      type: String,
      default: "General",
    },

    topic: {
      type: String,
      required: true,
    },

    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },

    totalQuestions: {
      type: Number,
      required: true,
      min: 1,
    },

    correctAnswers: {
      type: Number,
      required: true,
      min: 0,
    },

    wrongAnswers: {
      type: Number,
      required: true,
      min: 0,
    },

    scorePercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    answers: {
      type: [answerSchema],
      default: [],
    },

    timeTakenSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

const QuizAttempt =
  mongoose.models.QuizAttempt ||
  mongoose.model("QuizAttempt", quizAttemptSchema);

export default QuizAttempt;