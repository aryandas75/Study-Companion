import mongoose from "mongoose";

const studyGoalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    dailyGoalMinutes: {
      type: Number,
      required: true,
      default: 180,
      min: 1,
      max: 1440,
    },
  },
  {
    timestamps: true,
  }
);

const StudyGoal =
  mongoose.models.StudyGoal ||
  mongoose.model("StudyGoal", studyGoalSchema);

export default StudyGoal;