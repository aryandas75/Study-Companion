
import mongoose from "mongoose";

const studyTaskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    subject: {
      type: String,
      required: [true, "Subject is required"],
      trim: true,
    },

    topic: {
      type: String,
      trim: true,
      default: "",
    },

    dueDate: {
      type: Date,
      required: [true, "Due date is required"],
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },

    status: {
      type: String,
      enum: ["pending", "in-progress", "completed"],
      default: "pending",
    },

    userId: {
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

const StudyTask = mongoose.model("StudyTask", studyTaskSchema);

export default StudyTask;

