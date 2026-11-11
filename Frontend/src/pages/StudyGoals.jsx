import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getStudyGoals,
  updateStudyGoal,
} from "../services/studyGoal.api";

const formatStudyTime = (minutes) => {
  const totalMinutes = Math.floor(minutes || 0);
  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  if (hours === 0) return `${remainingMinutes}m`;
  if (remainingMinutes === 0) return `${hours}h`;

  return `${hours}h ${remainingMinutes}m`;
};

const formatDate = (dateString) => {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
    }
  );
};

const StatCard = ({ title, value, subtitle, icon }) => (
  <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
    <div className="mb-4 flex items-center justify-between">
      <p className="text-sm text-slate-400">{title}</p>
      <span className="text-2xl">{icon}</span>
    </div>

    <h3 className="text-3xl font-bold text-white">{value}</h3>
    <p className="mt-2 text-xs text-slate-500">{subtitle}</p>
  </div>
);

export default function StudyGoals() {
  const [goals, setGoals] = useState(null);
  const [goalInput, setGoalInput] = useState("180");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadGoals = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getStudyGoals();

      if (!response.success) {
        throw new Error(
          response.message || "Failed to load study goals"
        );
      }

      setGoals(response.data);
      setGoalInput(String(response.data.dailyGoalMinutes));
    } catch (err) {
      setError(err.message || "Unable to load study goals.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const handleUpdateGoal = async (e) => {
    e.preventDefault();

    const minutes = Number(goalInput);

    if (
      !Number.isInteger(minutes) ||
      minutes < 1 ||
      minutes > 1440
    ) {
      setError("Enter a whole number between 1 and 1440 minutes.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const response = await updateStudyGoal(minutes);

      if (!response.success) {
        throw new Error(
          response.message || "Failed to update goal"
        );
      }

      setMessage("Daily study goal updated successfully.");

      await loadGoals();
    } catch (err) {
      setError(err.message || "Unable to update study goal.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Loading study goals...
      </div>
    );
  }

  if (error && !goals) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 px-4 text-white">
        <p className="text-red-400">{error}</p>

        <button
          onClick={loadGoals}
          className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold hover:bg-indigo-500"
        >
          Try Again
        </button>
      </div>
    );
  }

  const progressPercentage = Math.min(
    (goals.todayStudyMinutes / goals.dailyGoalMinutes) * 100,
    100
  );

  const achievedDays = goals.history.filter(
    (day) => day.goalAchieved
  ).length;

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              to="/dashboard"
              className="mb-3 inline-block text-sm text-indigo-400 hover:text-indigo-300"
            >
              ← Dashboard
            </Link>

            <h1 className="text-3xl font-bold sm:text-4xl">
              Study Goals & Streaks
            </h1>

            <p className="mt-2 text-slate-400">
              Build consistency, one study session at a time.
            </p>
          </div>

          <Link
            to="/pomodoro"
            className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold transition hover:bg-indigo-500"
          >
            Start Studying →
          </Link>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">
            {message}
          </div>
        )}

        {/* Today's Goal */}
        <div className="mb-6 grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950 to-slate-900 p-6 lg:col-span-2">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-indigo-300">
                  TODAY'S STUDY GOAL
                </p>

                <h2 className="mt-2 text-2xl font-bold">
                  {formatStudyTime(goals.todayStudyMinutes)}
                  <span className="text-lg font-normal text-slate-400">
                    {" "}
                    / {formatStudyTime(goals.dailyGoalMinutes)}
                  </span>
                </h2>
              </div>

              <span
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  goals.goalAchievedToday
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-amber-500/20 text-amber-300"
                }`}
              >
                {goals.goalAchievedToday
                  ? "Goal achieved ✓"
                  : "In progress"}
              </span>
            </div>

            {/* Progress */}
            <div className="h-4 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-700"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>

            <div className="mt-3 flex justify-between text-sm text-slate-400">
              <span>{progressPercentage.toFixed(1)}% completed</span>

              <span>
                {goals.goalAchievedToday
                  ? "Daily target completed"
                  : `${formatStudyTime(goals.remainingMinutes)} remaining`}
              </span>
            </div>

            <div className="mt-7 rounded-xl bg-white/5 p-4">
              <p className="text-sm text-slate-400">
                {goals.goalAchievedToday
                  ? "Excellent work! You have achieved today's study target."
                  : "Keep going! Complete your remaining study time to reach today's goal."}
              </p>
            </div>
          </div>

          {/* Update Goal */}
          <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
            <h2 className="text-lg font-bold">
              Set Daily Goal
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Choose how many minutes you want to study every day.
            </p>

            <form
              onSubmit={handleUpdateGoal}
              className="mt-6"
            >
              <label
                htmlFor="dailyGoal"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Daily target (minutes)
              </label>

              <input
                id="dailyGoal"
                type="number"
                min="1"
                max="1440"
                step="1"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none focus:border-indigo-500"
                required
              />

              <p className="mt-2 text-xs text-slate-500">
                Example: 180 minutes = 3 hours
              </p>

              <button
                type="submit"
                disabled={saving}
                className="mt-5 w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Updating..." : "Update Goal"}
              </button>
            </form>
          </div>
        </div>

        {/* Streak Statistics */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Current Streak"
            value={`${goals.currentStreak} days`}
            subtitle="Consecutive days studied"
            icon="🔥"
          />

          <StatCard
            title="Longest Streak"
            value={`${goals.longestStreak} days`}
            subtitle="Your personal record"
            icon="🏆"
          />

          <StatCard
            title="Goal Achievement"
            value={`${achievedDays}/30`}
            subtitle="Goals achieved in the last 30 days"
            icon="🎯"
          />

          <StatCard
            title="Today's Study"
            value={formatStudyTime(goals.todayStudyMinutes)}
            subtitle="Total recorded study time"
            icon="📚"
          />
        </div>

        {/* 30-Day History */}
        <div className="rounded-2xl border border-white/10 bg-slate-900 p-5 sm:p-7">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">
                30-Day Goal History
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                See how consistently you are reaching your daily target.
              </p>
            </div>

            <div className="flex flex-wrap gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm bg-emerald-400" />
                Goal achieved
              </span>

              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm bg-indigo-400" />
                Studied
              </span>

              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm bg-slate-700" />
                No study
              </span>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-3 sm:grid-cols-7 md:grid-cols-10 lg:grid-cols-15">
            {goals.history.map((day) => (
              <div
                key={day.date}
                title={`${formatDate(day.date)}: ${formatStudyTime(day.studyMinutes)} studied`}
                className="group flex flex-col items-center gap-2"
              >
                <div
                  className={`flex aspect-square w-full items-center justify-center rounded-xl text-sm font-bold transition ${
                    day.goalAchieved
                      ? "bg-emerald-500 text-white"
                      : day.studied
                        ? "bg-indigo-500/80 text-white"
                        : "bg-slate-800 text-slate-500"
                  }`}
                >
                  {day.goalAchieved
                    ? "✓"
                    : day.studied
                      ? "•"
                      : "–"}
                </div>

                <span className="text-[10px] text-slate-500">
                  {formatDate(day.date)}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-xl bg-slate-800/70 p-4">
            <p className="text-sm text-slate-300">
              You achieved your daily study goal on{" "}
              <span className="font-bold text-emerald-400">
                {achievedDays} out of the last 30 days
              </span>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}