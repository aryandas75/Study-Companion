import mongoose from "mongoose";

const flashcardSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true,
    },

    answer: {
      type: String,
      required: true,
      trim: true,
    },

    explanation: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      enum: ["new", "known", "needs_revision"],
      default: "new",
    },

    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    lastReviewedAt: {
      type: Date,
      default: null,
    },

    nextReviewAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const flashcardDeckSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    topic: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    sourceType: {
      type: String,
      enum: ["study_material", "topic"],
      required: true,
    },

    sourceMaterial: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudyMaterial",
      default: null,
    },

    cards: {
      type: [flashcardSchema],
      validate: {
        validator: (cards) => cards.length > 0,
        message: "A flashcard deck must contain at least one card.",
      },
    },

    createdBy: {
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

flashcardDeckSchema.index({ createdBy: 1, createdAt: -1 });

const FlashcardDeck = mongoose.model(
  "FlashcardDeck",
  flashcardDeckSchema
);

export default FlashcardDeck;