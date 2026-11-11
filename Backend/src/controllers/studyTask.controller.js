import mongoose from "mongoose";
import StudyTask from "../models/studyTask.model.js";

// Helper: Validate MongoDB ObjectId
const isValidObjectId = (id) => {
  return mongoose.isValidObjectId(id);
};

// Helper: Escape special characters in search text
const escapeRegex = (text) => {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

// Helper: Validate date
const isValidDate = (date) => {
  return !Number.isNaN(new Date(date).getTime());
};

// =====================================================
// CREATE TASK
// POST /api/study-tasks
// =====================================================

export const createTask = async (req, res) => {
  try {
    const {
      title,
      description,
      subject,
      topic,
      dueDate,
      priority,
    } = req.body;

    // Validate title
    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Task title is required",
      });
    }

    // Validate subject
    if (typeof subject !== "string" || !subject.trim()) {
      return res.status(400).json({
        success: false,
        message: "Subject is required",
      });
    }

    // Validate due date
    if (!dueDate || !isValidDate(dueDate)) {
      return res.status(400).json({
        success: false,
        message: "A valid due date is required",
      });
    }

    const task = await StudyTask.create({
      title: title.trim(),
      description,
      subject: subject.trim(),
      topic,
      dueDate: new Date(dueDate),
      priority,
      userId: req.userId,
    });

    return res.status(201).json({
      success: true,
      message: "Study task created successfully",
      task,
    });
  } catch (error) {
    console.error("Create task error:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create study task",
    });
  }
};

// =====================================================
// GET ALL TASKS
// GET /api/study-tasks
// =====================================================

export const getTasks = async (req, res) => {
  try {
    const {
      status,
      subject,
      priority,
      search,
      page = 1,
      limit = 10,
      sort = "dueDate",
      order = "asc",
    } = req.query;

    const currentPage = Math.max(1, parseInt(page, 10) || 1);
    const currentLimit = Math.min(
      100,
      Math.max(1, parseInt(limit, 10) || 10)
    );

    const filter = {
      userId: req.userId,
    };

    // Filter by status
    if (status) {
      const allowedStatuses = [
        "pending",
        "in-progress",
        "completed",
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status value",
        });
      }

      filter.status = status;
    }

    // Filter by priority
    if (priority) {
      const allowedPriorities = [
        "low",
        "medium",
        "high",
      ];

      if (!allowedPriorities.includes(priority)) {
        return res.status(400).json({
          success: false,
          message: "Invalid priority value",
        });
      }

      filter.priority = priority;
    }

    // Filter by subject
    if (subject) {
      filter.subject = subject;
    }

    // Search by title, subject, or topic
    if (search && search.trim()) {
      const searchRegex = new RegExp(
        escapeRegex(search.trim()),
        "i"
      );

      filter.$or = [
        { title: searchRegex },
        { subject: searchRegex },
        { topic: searchRegex },
      ];
    }

    // Allowed sorting fields
    const allowedSortFields = [
      "dueDate",
      "createdAt",
      "updatedAt",
      "title",
      "priority",
      "status",
    ];

    const sortField = allowedSortFields.includes(sort)
      ? sort
      : "dueDate";

    const sortOrder = order === "desc" ? -1 : 1;

    const sortOptions = {
      [sortField]: sortOrder,
    };

    const skip = (currentPage - 1) * currentLimit;

    const [tasks, total] = await Promise.all([
      StudyTask.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(currentLimit),

      StudyTask.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / currentLimit);

    return res.status(200).json({
      success: true,
      tasks,
      pagination: {
        total,
        page: currentPage,
        limit: currentLimit,
        totalPages,
        hasNextPage: currentPage < totalPages,
        hasPreviousPage: currentPage > 1,
      },
    });
  } catch (error) {
    console.error("Get tasks error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch study tasks",
    });
  }
};

// =====================================================
// GET SINGLE TASK
// GET /api/study-tasks/:id
// =====================================================

export const getTaskById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID",
      });
    }

    const task = await StudyTask.findOne({
      _id: id,
      userId: req.userId,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Study task not found",
      });
    }

    return res.status(200).json({
      success: true,
      task,
    });
  } catch (error) {
    console.error("Get task error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch study task",
    });
  }
};

// =====================================================
// UPDATE TASK
// PATCH /api/study-tasks/:id
// =====================================================

export const updateTask = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID",
      });
    }

    const allowedFields = [
      "title",
      "description",
      "subject",
      "topic",
      "dueDate",
      "priority",
      "status",
    ];

    const updates = {};

    // Only accept allowed fields
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided for update",
      });
    }

    // Validate title
    if (updates.title !== undefined) {
      if (
        typeof updates.title !== "string" ||
        !updates.title.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Task title cannot be empty",
        });
      }

      updates.title = updates.title.trim();
    }

    // Validate subject
    if (updates.subject !== undefined) {
      if (
        typeof updates.subject !== "string" ||
        !updates.subject.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Subject cannot be empty",
        });
      }

      updates.subject = updates.subject.trim();
    }

    // Validate due date
    if (updates.dueDate !== undefined) {
      if (!isValidDate(updates.dueDate)) {
        return res.status(400).json({
          success: false,
          message: "Invalid due date",
        });
      }

      updates.dueDate = new Date(updates.dueDate);
    }

    const task = await StudyTask.findOneAndUpdate(
      {
        _id: id,
        userId: req.userId,
      },
      updates,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Study task not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Study task updated successfully",
      task,
    });
  } catch (error) {
    console.error("Update task error:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update study task",
    });
  }
};

// =====================================================
// DELETE TASK
// DELETE /api/study-tasks/:id
// =====================================================

export const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID",
      });
    }

    const task = await StudyTask.findOneAndDelete({
      _id: id,
      userId: req.userId,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Study task not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Study task deleted successfully",
    });
  } catch (error) {
    console.error("Delete task error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete study task",
    });
  }
};

// =====================================================
// GET TASK STATISTICS
// GET /api/study-tasks/stats
// =====================================================

export const getTaskStats = async (req, res) => {
  try {
    const now = new Date();

    const [
      total,
      pending,
      inProgress,
      completed,
      overdue,
    ] = await Promise.all([
      StudyTask.countDocuments({
        userId: req.userId,
      }),

      StudyTask.countDocuments({
        userId: req.userId,
        status: "pending",
      }),

      StudyTask.countDocuments({
        userId: req.userId,
        status: "in-progress",
      }),

      StudyTask.countDocuments({
        userId: req.userId,
        status: "completed",
      }),

      StudyTask.countDocuments({
        userId: req.userId,
        status: { $ne: "completed" },
        dueDate: { $lt: now },
      }),
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        total,
        pending,
        inProgress,
        completed,
        overdue,
      },
    });
  } catch (error) {
    console.error("Task stats error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch task statistics",
    });
  }
};

// =====================================================
// GET UPCOMING TASKS
// GET /api/study-tasks/upcoming
// =====================================================

export const getUpcomingTasks = async (req, res) => {
  try {
    const now = new Date();

    const nextSevenDays = new Date();
    nextSevenDays.setDate(nextSevenDays.getDate() + 7);

    const tasks = await StudyTask.find({
      userId: req.userId,
      status: { $ne: "completed" },
      dueDate: {
        $gte: now,
        $lte: nextSevenDays,
      },
    }).sort({
      dueDate: 1,
    });

    return res.status(200).json({
      success: true,
      count: tasks.length,
      tasks,
    });
  } catch (error) {
    console.error("Upcoming tasks error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch upcoming tasks",
    });
  }
};

// =====================================================
// GET TODAY'S TASKS
// GET /api/study-tasks/today
// =====================================================

export const getTodayTasks = async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const tasks = await StudyTask.find({
      userId: req.userId,
      status: { $ne: "completed" },
      dueDate: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    }).sort({
      dueDate: 1,
    });

    return res.status(200).json({
      success: true,
      count: tasks.length,
      tasks,
    });
  } catch (error) {
    console.error("Today's tasks error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch today's tasks",
    });
  }
};

// =====================================================
// GET OVERDUE TASKS
// GET /api/study-tasks/overdue
// =====================================================

export const getOverdueTasks = async (req, res) => {
  try {
    const now = new Date();

    const tasks = await StudyTask.find({
      userId: req.userId,
      status: { $ne: "completed" },
      dueDate: {
        $lt: now,
      },
    }).sort({
      dueDate: 1,
    });

    return res.status(200).json({
      success: true,
      count: tasks.length,
      tasks,
    });
  } catch (error) {
    console.error("Overdue tasks error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch overdue tasks",
    });
  }
};