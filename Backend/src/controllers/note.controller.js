import mongoose from "mongoose";
import Note from "../models/note.model.js";

// CREATE A NOTE
export const createNote = async (req, res) => {
  try {
    const { title, subject, content, tags } = req.body;

    if (
      typeof title !== "string" ||
      !title.trim() ||
      typeof subject !== "string" ||
      !subject.trim() ||
      typeof content !== "string" ||
      !content.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Title, subject, and content are required",
      });
    }

    if (
      title.trim().length < 2 ||
      title.trim().length > 150 ||
      subject.trim().length > 100 ||
      content.trim().length > 50000
    ) {
      return res.status(400).json({
        success: false,
        message: "One or more fields exceed the allowed limits",
      });
    }

    if (tags !== undefined && !Array.isArray(tags)) {
      return res.status(400).json({
        success: false,
        message: "Tags must be an array of strings",
      });
    }

    if (
      tags &&
      (tags.length > 20 ||
        tags.some(
          (tag) =>
            typeof tag !== "string" ||
            !tag.trim() ||
            tag.trim().length > 30
        ))
    ) {
      return res.status(400).json({
        success: false,
        message: "Provide up to 20 valid tags, each up to 30 characters",
      });
    }

    const note = await Note.create({
      title: title.trim(),
      subject: subject.trim(),
      content: content.trim(),
      tags: tags?.map((tag) => tag.trim()) ?? [],
      user: req.userId,
    });

    return res.status(201).json({
      success: true,
      message: "Note created successfully",
      note,
    });
  } catch (error) {
    console.error("Create note error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to create note",
    });
  }
};

// GET ALL NOTES OF THE LOGGED-IN USER
export const getNotes = async (req, res) => {
  try {
    const {
      search = "",
      subject,
      page = "1",
      limit = "10",
      favorite,
    } = req.query;

    const currentPage = Number(page);
    const pageSize = Number(limit);

    if (
      !Number.isInteger(currentPage) ||
      !Number.isInteger(pageSize) ||
      currentPage < 1 ||
      pageSize < 1 ||
      pageSize > 50
    ) {
      return res.status(400).json({
        success: false,
        message: "Page must be positive and limit must be between 1 and 50",
      });
    }

    if (
      typeof search !== "string" ||
      (subject !== undefined && typeof subject !== "string") ||
      (favorite !== undefined &&
        !["true", "false"].includes(favorite))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid search, subject, or favorite parameter",
      });
    }

    const filter = {
      user: req.userId,
    };

    const escapedSearch = search.trim().replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    if (escapedSearch) {
      filter.$or = [
        { title: { $regex: escapedSearch, $options: "i" } },
        { subject: { $regex: escapedSearch, $options: "i" } },
        { content: { $regex: escapedSearch, $options: "i" } },
        { tags: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    if (subject?.trim()) {
      const escapedSubject = subject.trim().replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      filter.subject = {
        $regex: escapedSubject,
        $options: "i",
      };
    }

    if (favorite !== undefined) {
      filter.isFavorite = favorite === "true";
    }

    const [notes, total] = await Promise.all([
      Note.find(filter)
        .sort({ updatedAt: -1 })
        .skip((currentPage - 1) * pageSize)
        .limit(pageSize),

      Note.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      notes,
      pagination: {
        total,
        page: currentPage,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("Get notes error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch notes",
    });
  }
};

// GET A SINGLE NOTE
export const getNoteById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid note ID",
      });
    }

    const note = await Note.findOne({
      _id: id,
      user: req.userId,
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found",
      });
    }

    return res.status(200).json({
      success: true,
      note,
    });
  } catch (error) {
    console.error("Get note error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch note",
    });
  }
};

// UPDATE A NOTE
export const updateNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, subject, content, tags, isFavorite } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid note ID",
      });
    }

    const note = await Note.findOne({
      _id: id,
      user: req.userId,
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found",
      });
    }

    if (
      title !== undefined &&
      (typeof title !== "string" ||
        title.trim().length < 2 ||
        title.trim().length > 150)
    ) {
      return res.status(400).json({
        success: false,
        message: "Title must be between 2 and 150 characters",
      });
    }

    if (
      subject !== undefined &&
      (typeof subject !== "string" ||
        !subject.trim() ||
        subject.trim().length > 100)
    ) {
      return res.status(400).json({
        success: false,
        message: "Subject must be between 1 and 100 characters",
      });
    }

    if (
      content !== undefined &&
      (typeof content !== "string" ||
        !content.trim() ||
        content.trim().length > 50000)
    ) {
      return res.status(400).json({
        success: false,
        message: "Content must be between 1 and 50000 characters",
      });
    }

    if (tags !== undefined) {
      if (
        !Array.isArray(tags) ||
        tags.length > 20 ||
        tags.some(
          (tag) =>
            typeof tag !== "string" ||
            !tag.trim() ||
            tag.trim().length > 30
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Provide up to 20 valid tags, each up to 30 characters",
        });
      }

      note.tags = tags.map((tag) => tag.trim());
    }

    if (
      isFavorite !== undefined &&
      typeof isFavorite !== "boolean"
    ) {
      return res.status(400).json({
        success: false,
        message: "isFavorite must be true or false",
      });
    }

    if (title !== undefined) note.title = title.trim();
    if (subject !== undefined) note.subject = subject.trim();
    if (content !== undefined) note.content = content.trim();

    if (isFavorite !== undefined) {
      note.isFavorite = isFavorite;
    }

    await note.save();

    return res.status(200).json({
      success: true,
      message: "Note updated successfully",
      note,
    });
  } catch (error) {
    console.error("Update note error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to update note",
    });
  }
};

// DELETE A NOTE
export const deleteNote = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid note ID",
      });
    }

    const note = await Note.findOneAndDelete({
      _id: id,
      user: req.userId,
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Note deleted successfully",
    });
  } catch (error) {
    console.error("Delete note error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to delete note",
    });
  }
};

// TOGGLE NOTE FAVORITE STATUS
export const toggleFavorite = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid note ID",
      });
    }

    const note = await Note.findOne({
      _id: id,
      user: req.userId,
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found",
      });
    }

    note.isFavorite = !note.isFavorite;

    await note.save();

    return res.status(200).json({
      success: true,
      message: note.isFavorite
        ? "Note added to favorites"
        : "Note removed from favorites",
      note,
    });
  } catch (error) {
    console.error("Toggle favorite error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to update favorite status",
    });
  }
};