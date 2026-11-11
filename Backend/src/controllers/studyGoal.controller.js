import mongoose from "mongoose";
import StudyGoal from "../models/studyGoal.model.js";
import StudyProgress from "../models/studyProgress.model.js";

const DEFAULT_GOAL_MINUTES = 180;
const TIMEZONE = "Asia/Kolkata";

// Get today's date in YYYY-MM-DD format
const getTodayKey = () => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
};

// Convert date key into a readable date
const formatDate = (dateKey) => {
  return dateKey;
};

// Get daily study goal and streak information
export const getStudyGoals = async (req, res) => {
  try {
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    let goal = await StudyGoal.findOne({ user: userId });

    if (!goal) {
      goal = await StudyGoal.create({
        user: userId,
        dailyGoalMinutes: DEFAULT_GOAL_MINUTES,
      });
    }

    const dailyActivity = await StudyProgress.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
          studyTimeMinutes: { $gt: 0 },
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
          studyMinutes: {
            $sum: "$studyTimeMinutes",
          },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ]);

    const todayKey = getTodayKey();

    const activityMap = new Map(
      dailyActivity.map((item) => [
        item._id,
        item.studyMinutes,
      ])
    );

    const todayStudyMinutes = activityMap.get(todayKey) || 0;

    const dailyGoalMinutes = goal.dailyGoalMinutes;

    const goalAchievedToday =
      todayStudyMinutes >= dailyGoalMinutes;

    // Calculate streaks
    const studiedDates = dailyActivity
      .filter((item) => item.studyMinutes > 0)
      .map((item) => item._id);

    const dateSet = new Set(studiedDates);

    const addDays = (dateKey, amount) => {
      const date = new Date(`${dateKey}T00:00:00Z`);

      date.setUTCDate(date.getUTCDate() + amount);

      return date.toISOString().slice(0, 10);
    };

    // Current streak
    let currentStreak = 0;

    let streakDate = dateSet.has(todayKey)
      ? todayKey
      : addDays(todayKey, -1);

    while (dateSet.has(streakDate)) {
      currentStreak++;
      streakDate = addDays(streakDate, -1);
    }

    // Longest streak
    let longestStreak = 0;
    let runningStreak = 0;
    let previousDate = null;

    for (const date of studiedDates) {
      if (
        previousDate &&
        addDays(previousDate, 1) === date
      ) {
        runningStreak++;
      } else {
        runningStreak = 1;
      }

      longestStreak = Math.max(
        longestStreak,
        runningStreak
      );

      previousDate = date;
    }

    // Last 30 days of activity
    const last30Days = [];

    for (let i = 29; i >= 0; i--) {
      const dateKey = addDays(todayKey, -i);

      const studyMinutes = activityMap.get(dateKey) || 0;

      last30Days.push({
        date: formatDate(dateKey),
        studyMinutes,
        goalMinutes: dailyGoalMinutes,
        goalAchieved: studyMinutes >= dailyGoalMinutes,
        studied: studyMinutes > 0,
      });
    }

    const achievedDays = last30Days.filter(
      (day) => day.goalAchieved
    ).length;

    return res.status(200).json({
      success: true,
      message: "Study goals fetched successfully",

      data: {
        dailyGoalMinutes,
        todayStudyMinutes,

        remainingMinutes: Math.max(
          dailyGoalMinutes - todayStudyMinutes,
          0
        ),

        goalAchievedToday,

        currentStreak,
        longestStreak,

        achievedDays,

        history: last30Days,
      },
    });
  } catch (error) {
    console.error("Get Study Goals Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch study goals",
      error: error.message,
    });
  }
};

// Update daily study goal
export const updateStudyGoal = async (req, res) => {
  try {
    const userId = req.userId;
    const { dailyGoalMinutes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const goalMinutes = Number(dailyGoalMinutes);

    if (
      !Number.isInteger(goalMinutes) ||
      goalMinutes < 1 ||
      goalMinutes > 1440
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Daily goal must be a whole number between 1 and 1440 minutes",
      });
    }

    const goal = await StudyGoal.findOneAndUpdate(
      { user: userId },
      {
        $set: {
          dailyGoalMinutes: goalMinutes,
        },
        $setOnInsert: {
          user: userId,
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Daily study goal updated successfully",
      data: goal,
    });
  } catch (error) {
    console.error("Update Study Goal Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update study goal",
      error: error.message,
    });
  }
};