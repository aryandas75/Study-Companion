
import mongoose from "mongoose";
import Chat from "../models/chat.model.js";

// GET ALL CHATS FOR THE LOGGED-IN USER
export const getChats = async (req, res) => {
  try {
    const chats = await Chat.find({
      userId: req.userId,
    })
      .select("title createdAt updatedAt messages")
      .sort({ updatedAt: -1 })
      .lean();

    // Return message counts without sending every message in the sidebar.
    const chatList = chats.map((chat) => ({
      _id: chat._id,
      title: chat.title,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      messageCount: chat.messages.length,
    }));

    return res.status(200).json({
      success: true,
      chats: chatList,
    });
  } catch (error) {
    console.error("Get chats error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch chat history",
    });
  }
};

// CREATE A NEW CHAT
export const createChat = async (req, res) => {
  try {
    const chat = await Chat.create({
      userId: req.userId,
      title: "New conversation",
      messages: [],
    });

    return res.status(201).json({
      success: true,
      chat,
    });
  } catch (error) {
    console.error("Create chat error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to create conversation",
    });
  }
};

// GET ONE CHAT
export const getChat = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid chat ID",
      });
    }

    const chat = await Chat.findOne({
      _id: id,
      userId: req.userId,
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    return res.status(200).json({
      success: true,
      chat,
    });
  } catch (error) {
    console.error("Get chat error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch conversation",
    });
  }
};

// DELETE A CHAT
export const deleteChat = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid chat ID",
      });
    }

    const chat = await Chat.findOneAndDelete({
      _id: id,
      userId: req.userId,
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Conversation deleted successfully",
    });
  } catch (error) {
    console.error("Delete chat error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to delete conversation",
    });
  }
};

// RENAME A CHAT
export const renameChat = async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid chat ID",
      });
    }

    if (
      typeof title !== "string" ||
      !title.trim() ||
      title.trim().length > 150
    ) {
      return res.status(400).json({
        success: false,
        message: "Title must contain 1 to 150 characters",
      });
    }

    const chat = await Chat.findOneAndUpdate(
      {
        _id: id,
        userId: req.userId,
      },
      {
        $set: { title: title.trim() },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    return res.status(200).json({
      success: true,
      chat,
    });
  } catch (error) {
    console.error("Rename chat error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to rename conversation",
    });
  }
};
