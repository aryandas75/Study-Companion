
import mongoose from "mongoose";
import StudyProgress from "../models/studyProgress.model.js";

const isValidNonNegativeNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number) && number >= 0;
};

const calculateAccuracy = (correctAnswers, totalQuestions) => {
  if (!totalQuestions) return 0;

  return Number(
    ((correctAnswers / totalQuestions) * 100).toFixed(2)
  );
};

// RECORD STUDY PROGRESS
export const recordStudyProgress = async (req, res) => {
  try {
    const {
      subject,
      topic,
      studyTimeMinutes = 0,
      studyTimeSeconds = 0,
      quizzesAttempted = 0,
      correctAnswers = 0,
      totalQuestions = 0,
      date,
    } = req.body;

    if (
      typeof subject !== "string" ||
      !subject.trim() ||
      typeof topic !== "string" ||
      !topic.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Subject and topic are required",
      });
    }

    const values = {
      studyTimeMinutes,
      studyTimeSeconds,
      quizzesAttempted,
      correctAnswers,
      totalQuestions,
    };

    for (const [field, value] of Object.entries(values)) {
      if (!isValidNonNegativeNumber(value)) {
        return res.status(400).json({
          success: false,
          message: `${field} must be a valid non-negative number`,
        });
      }
    }

    const minutes = Number(studyTimeMinutes);
    const seconds = Number(studyTimeSeconds);
    const attempted = Number(quizzesAttempted);
    const correct = Number(correctAnswers);
    const total = Number(totalQuestions);

    if (
      !Number.isInteger(attempted) ||
      !Number.isInteger(correct) ||
      !Number.isInteger(total)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Quiz attempts, correct answers and total questions must be whole numbers",
      });
    }

    if (correct > total) {
      return res.status(400).json({
        success: false,
        message: "Correct answers cannot exceed total questions",
      });
    }

    const progressDate = date ? new Date(date) : new Date();

    if (Number.isNaN(progressDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid progress date",
      });
    }

    const progress = await StudyProgress.create({
      user: req.userId,
      date: progressDate,
      subject: subject.trim(),
      topic: topic.trim(),
      studyTimeMinutes: minutes,
      studyTimeSeconds: seconds,
      quizzesAttempted: attempted,
      correctAnswers: correct,
      totalQuestions: total,
      scorePercentage: calculateAccuracy(correct, total),
    });

    return res.status(201).json({
      success: true,
      message: "Study progress recorded successfully",
      progress,
    });
  } catch (error) {
    console.error("Record Study Progress Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to record study progress",
      error: error.message,
    });
  }
};

// GET ALL STUDY PROGRESS
export const getStudyProgress = async (req, res) => {
  try {
    const progress = await StudyProgress.find({
      user: req.userId,
    })
      .sort({ date: -1 })
      .populate("quizAttempt", "scorePercentage totalQuestions");

    return res.status(200).json({
      success: true,
      count: progress.length,
      progress,
    });
  } catch (error) {
    console.error("Get Study Progress Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch study progress",
      error: error.message,
    });
  }
};

// GET STUDY PROGRESS SUMMARY
export const getStudyProgressSummary = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const userObjectId = new mongoose.Types.ObjectId(req.userId);

    const result = await StudyProgress.aggregate([
      {
        $match: {
          user: userObjectId,
        },
      },
      {
        $addFields: {
          calculatedStudySeconds: {
            $cond: [
              {
                $gt: [
                  { $ifNull: ["$studyTimeSeconds", 0] },
                  0,
                ],
              },
              { $ifNull: ["$studyTimeSeconds", 0] },
              {
                $multiply: [
                  { $ifNull: ["$studyTimeMinutes", 0] },
                  60,
                ],
              },
            ],
          },
        },
      },
      {
        $group: {
          _id: null,

          totalStudySeconds: {
            $sum: "$calculatedStudySeconds",
          },

          totalQuizzesAttempted: {
            $sum: { $ifNull: ["$quizzesAttempted", 0] },
          },

          totalCorrectAnswers: {
            $sum: { $ifNull: ["$correctAnswers", 0] },
          },

          totalQuestions: {
            $sum: { $ifNull: ["$totalQuestions", 0] },
          },

          studySessions: {
            $sum: {
              $cond: [
                {
                  $ne: [
                    { $ifNull: ["$pomodoroSession", null] },
                    null,
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    const data = result[0] || {
      totalStudySeconds: 0,
      totalQuizzesAttempted: 0,
      totalCorrectAnswers: 0,
      totalQuestions: 0,
      studySessions: 0,
    };

    const totalStudyMinutes = data.totalStudySeconds / 60;

    return res.status(200).json({
      success: true,
      summary: {
        totalStudySeconds: data.totalStudySeconds,
        totalStudyMinutes,
        totalStudyHours: Number(
          (data.totalStudySeconds / 3600).toFixed(2)
        ),
        totalQuizzesAttempted: data.totalQuizzesAttempted,
        totalCorrectAnswers: data.totalCorrectAnswers,
        totalQuestions: data.totalQuestions,
        studySessions: data.studySessions,
        overallAccuracy: calculateAccuracy(
          data.totalCorrectAnswers,
          data.totalQuestions
        ),
      },
    });
  } catch (error) {
    console.error("Get Study Progress Summary Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch study progress summary",
      error: error.message,
    });
  }
};

// UPDATE STUDY PROGRESS
export const updateStudyProgress = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid progress ID",
      });
    }

    const allowedFields = [
      "studyTimeMinutes",
      "studyTimeSeconds",
      "quizzesAttempted",
      "correctAnswers",
      "totalQuestions",
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (!isValidNonNegativeNumber(req.body[field])) {
          return res.status(400).json({
            success: false,
            message: `${field} must be a valid non-negative number`,
          });
        }

        updates[field] = Number(req.body[field]);
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided for update",
      });
    }

    for (const field of [
      "quizzesAttempted",
      "correctAnswers",
      "totalQuestions",
    ]) {
      if (
        updates[field] !== undefined &&
        !Number.isInteger(updates[field])
      ) {
        return res.status(400).json({
          success: false,
          message: `${field} must be a whole number`,
        });
      }
    }

    const progress = await StudyProgress.findOne({
      _id: id,
      user: req.userId,
    });

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: "Study progress record not found",
      });
    }

    const correctAnswers =
      updates.correctAnswers ?? progress.correctAnswers;

    const totalQuestions =
      updates.totalQuestions ?? progress.totalQuestions;

    if (correctAnswers > totalQuestions) {
      return res.status(400).json({
        success: false,
        message: "Correct answers cannot exceed total questions",
      });
    }

    Object.assign(progress, updates);

    progress.scorePercentage = calculateAccuracy(
      correctAnswers,
      totalQuestions
    );

    await progress.save();

    return res.status(200).json({
      success: true,
      message: "Study progress updated successfully",
      progress,
    });
  } catch (error) {
    console.error("Update Study Progress Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update study progress",
      error: error.message,
    });
  }
};
