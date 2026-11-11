
import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },

    content: {
      type: String,
      required: true,
      trim: true,
    },

    tool: {
      type: String,
      enum: ["ask", "summarize", "questions"],
      default: "ask",
    },
  },
  {
    timestamps: true,
  }
);

const chatSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      default: "New conversation",
      trim: true,
      maxlength: 150,
    },

    messages: {
      type: [messageSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

chatSchema.index({ userId: 1, updatedAt: -1 });

const Chat = mongoose.model("Chat", chatSchema);

export default Chat;
