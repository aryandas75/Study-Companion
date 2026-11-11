import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true,
    },

    options: {
      type: [String],
      required: true,
      validate: {
        validator: (options) =>
          Array.isArray(options) &&
          options.length === 4 &&
          options.every(
            (option) =>
              typeof option === "string" && option.trim().length > 0
          ),
        message: "Every question must have exactly four valid options.",
      },
    },

    correctAnswer: {
      type: String,
      required: true,
      enum: ["A", "B", "C", "D"],
    },

    explanation: {
      type: String,
      default: "",
    },
  },
  { _id: true }
);

const quizSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    subject: {
      type: String,
      trim: true,
      default: "General",
    },

    topic: {
      type: String,
      required: true,
      trim: true,
    },

    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },

    questions: {
      type: [questionSchema],
      required: true,
      validate: {
        validator: (questions) =>
          Array.isArray(questions) && questions.length > 0,
        message: "A quiz must contain at least one question.",
      },
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const Quiz =
  mongoose.models.Quiz ||
  mongoose.model("Quiz", quizSchema);

export default Quiz;