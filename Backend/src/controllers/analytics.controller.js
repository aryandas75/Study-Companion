
import mongoose from "mongoose";

import StudyProgress from "../models/studyProgress.model.js";
import StudyTask from "../models/studyTask.model.js";
import Quiz from "../models/quiz.model.js";
import StudyGoal from "../models/studyGoal.model.js";

const TIMEZONE = "Asia/Kolkata";

// Get the start of a calendar day in the specified timezone.
// Returns a UTC Date representing midnight in that timezone.
const getStartOfDay = (date, timeZone = TIMEZONE) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = Number(part.value);
    }
  }

  // IST is UTC+05:30.
  // Convert midnight IST into its equivalent UTC timestamp.
  return new Date(
    Date.UTC(
      values.year,
      values.month - 1,
      values.day
    ) - 330 * 60 * 1000
  );
};

// Get the next calendar day in IST.
const getNextDay = (date) => {
  return new Date(date.getTime() + 24 * 60 * 60 * 1000);
};

// Calculate accurate study seconds.
// Prefer studyTimeSeconds when available.
// For older records, fall back to studyTimeMinutes.
const getStudySecondsExpression = {
  $cond: [
    { $gt: [{ $ifNull: ["$studyTimeSeconds", 0] }, 0] },
    { $ifNull: ["$studyTimeSeconds", 0] },
    {
      $multiply: [
        { $ifNull: ["$studyTimeMinutes", 0] },
        60,
      ],
    },
  ],
};

export const getStudyAnalytics = async (req, res) => {
  try {
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const now = new Date();

    // All date boundaries are based on Kolkata time.
    const todayStart = getStartOfDay(now);
    const tomorrowStart = getNextDay(todayStart);

    const sevenDaysAgo = new Date(
      todayStart.getTime() - 6 * 24 * 60 * 60 * 1000
    );

    // 1. Overall study analytics
    const studyTimeResult = await StudyProgress.aggregate([
      {
        $match: {
          user: userObjectId,
        },
      },
      {
        $addFields: {
          calculatedStudySeconds: getStudySecondsExpression,
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

          // Only actual stopwatch sessions count as study sessions.
          studySessions: {
            $sum: {
              $cond: [
                { $ne: ["$pomodoroSession", null] },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    const studySummary = studyTimeResult[0] || {
      totalStudySeconds: 0,
      totalQuizzesAttempted: 0,
      totalCorrectAnswers: 0,
      totalQuestions: 0,
      studySessions: 0,
    };

    const totalStudyMinutes =
      studySummary.totalStudySeconds / 60;

    // 2. Today's study time (IST)
    const todayStudyResult = await StudyProgress.aggregate([
      {
        $match: {
          user: userObjectId,
          date: {
            $gte: todayStart,
            $lt: tomorrowStart,
          },
        },
      },
      {
        $addFields: {
          calculatedStudySeconds: getStudySecondsExpression,
        },
      },
      {
        $group: {
          _id: null,
          studySeconds: {
            $sum: "$calculatedStudySeconds",
          },
        },
      },
    ]);

    const todayStudySeconds =
      todayStudyResult[0]?.studySeconds || 0;

    const todayStudyMinutes = todayStudySeconds / 60;

    // 3. Weekly study activity (last 7 days, IST)
    const weeklyStudyActivity = await StudyProgress.aggregate([
      {
        $match: {
          user: userObjectId,
          date: {
            $gte: sevenDaysAgo,
            $lt: tomorrowStart,
          },
        },
      },
      {
        $addFields: {
          calculatedStudySeconds: getStudySecondsExpression,
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$date",
              timezone: TIMEZONE,
            },
          },

          studySeconds: {
            $sum: "$calculatedStudySeconds",
          },
        },
      },
      {
        $project: {
          _id: 1,
          studySeconds: 1,
          studyMinutes: {
            $divide: ["$studySeconds", 60],
          },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ]);

    // 4. Subject-wise study time
    const subjectAnalytics = await StudyProgress.aggregate([
      {
        $match: {
          user: userObjectId,
        },
      },
      {
        $addFields: {
          calculatedStudySeconds: getStudySecondsExpression,
        },
      },
      {
        $group: {
          _id: "$subject",

          studySeconds: {
            $sum: "$calculatedStudySeconds",
          },

          topicsCovered: {
            $addToSet: "$topic",
          },
        },
      },
      {
        $project: {
          _id: 0,
          subject: "$_id",
          studySeconds: 1,

          studyMinutes: {
            $divide: ["$studySeconds", 60],
          },

          topicsCovered: {
            $size: "$topicsCovered",
          },
        },
      },
      {
        $sort: {
          studySeconds: -1,
        },
      },
    ]);

    // 5. Task analytics
    const taskAnalytics = await StudyTask.aggregate([
      {
        $match: {
          userId: userObjectId,
        },
      },
      {
        $group: {
          _id: null,

          totalTasks: {
            $sum: 1,
          },

          completedTasks: {
            $sum: {
              $cond: [
                { $eq: ["$status", "completed"] },
                1,
                0,
              ],
            },
          },

          pendingTasks: {
            $sum: {
              $cond: [
                { $eq: ["$status", "pending"] },
                1,
                0,
              ],
            },
          },

          inProgressTasks: {
            $sum: {
              $cond: [
                { $eq: ["$status", "in-progress"] },
                1,
                0,
              ],
            },
          },

          overdueTasks: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$status", "completed"] },
                    { $lt: ["$dueDate", now] },
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

    const tasks = taskAnalytics[0] || {
      totalTasks: 0,
      completedTasks: 0,
      pendingTasks: 0,
      inProgressTasks: 0,
      overdueTasks: 0,
    };

    const completionPercentage =
      tasks.totalTasks > 0
        ? Number(
            (
              (tasks.completedTasks / tasks.totalTasks) *
              100
            ).toFixed(2)
          )
        : 0;

    // 6. Quiz analytics
    const totalQuizzes = await Quiz.countDocuments({
      user: userObjectId,
    });

    const quizAccuracy =
      studySummary.totalQuestions > 0
        ? Number(
            (
              (studySummary.totalCorrectAnswers /
                studySummary.totalQuestions) *
              100
            ).toFixed(2)
          )
        : 0;

    // 7. Study goal
    let studyGoal = await StudyGoal.findOne({
      user: userObjectId,
    });

    if (!studyGoal) {
      studyGoal = await StudyGoal.create({
        user: userObjectId,
        dailyGoalMinutes: 180,
      });
    }

    const goalAchievedToday =
      todayStudyMinutes >= studyGoal.dailyGoalMinutes;

    const remainingMinutes = Math.max(
      studyGoal.dailyGoalMinutes - todayStudyMinutes,
      0
    );

    // 8. Send analytics response
    return res.status(200).json({
      success: true,
      message: "Study analytics fetched successfully",

      data: {
        study: {
          totalStudySeconds: studySummary.totalStudySeconds,

          totalStudyMinutes,

          totalStudyHours: Number(
            (studySummary.totalStudySeconds / 3600).toFixed(2)
          ),

          todayStudySeconds,

          todayStudyMinutes,

          todayStudyHours: Number(
            (todayStudySeconds / 3600).toFixed(2)
          ),

          studySessions: studySummary.studySessions,

          totalQuizzesAttempted:
            studySummary.totalQuizzesAttempted,

          weeklyActivity: weeklyStudyActivity,
        },

        subjects: subjectAnalytics,

        tasks: {
          ...tasks,
          completionPercentage,
        },

        quizzes: {
          totalQuizzes,
          totalAttempts: studySummary.totalQuizzesAttempted,
          totalCorrectAnswers: studySummary.totalCorrectAnswers,
          totalQuestions: studySummary.totalQuestions,
          accuracyPercentage: quizAccuracy,
        },

        goals: {
          dailyGoalMinutes: studyGoal.dailyGoalMinutes,
          todayStudyMinutes,
          remainingMinutes,
          goalAchievedToday,
        },

        timezone: TIMEZONE,
      },
    });
  } catch (error) {
    console.error("Get Study Analytics Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch study analytics",
      error: error.message,
    });
  }
};
