import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import { getStudyAnalytics } from "../services/analytics.api";

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444"];

function formatMinutes(minutes = 0) {
  const safeMinutes = Math.max(0, Number(minutes) || 0);
  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;

  if (hours === 0) return `${remainingMinutes} min`;
  if (remainingMinutes === 0) return `${hours} hr`;

  return `${hours} hr ${remainingMinutes} min`;
}

function StatCard({ title, value, subtitle, icon, color }) {
  return (
    <div className="group rounded-2xl border border-white/80 bg-white/90 p-5 shadow-lg shadow-indigo-100/50 backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-100">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{title}</p>

          <h2 className="mt-2 text-2xl font-extrabold text-slate-800">
            {value}
          </h2>

          <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
        </div>

        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl transition group-hover:scale-110 ${color}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function SectionHeading({ title, subtitle, icon }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-xl">
            {icon}
          </div>
        )}

        <div>
          <h2 className="text-lg font-bold text-slate-800">{title}</h2>
          <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

export default function Analytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getStudyAnalytics();

      if (!response?.success) {
        throw new Error(response?.message || "Failed to load analytics");
      }

      setAnalytics(response.data);
    } catch (err) {
      console.error("Analytics error:", err);

      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to load analytics."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-slate-50 to-purple-100">
        <div className="rounded-3xl border border-white bg-white/80 p-10 text-center shadow-xl backdrop-blur">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />

          <p className="mt-5 font-semibold text-slate-700">
            Loading your analytics...
          </p>

          <p className="mt-1 text-sm text-slate-400">
            Preparing your study report
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-slate-50 to-purple-100 px-4">
        <div className="w-full max-w-md rounded-3xl border border-white bg-white/90 p-8 text-center shadow-xl">
          <div className="text-5xl">⚠️</div>

          <h2 className="mt-4 text-xl font-bold text-slate-800">
            Something went wrong
          </h2>

          <p className="mt-2 text-sm text-slate-500">{error}</p>

          <button
            onClick={fetchAnalytics}
            className="mt-6 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-700"
          >
            Try Again
          </button>

          <div className="mt-4">
            <Link
              to="/dashboard"
              className="text-sm font-semibold text-indigo-600 hover:underline"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const study = analytics?.study || {};
  const tasks = analytics?.tasks || {};
  const quizzes = analytics?.quizzes || {};
  const subjects = analytics?.subjects || [];

  const weeklyData = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));

    const dateString = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");

    const matchingDay = (study.weeklyActivity || []).find(
      (item) => item._id === dateString
    );

    return {
      day: date.toLocaleDateString("en-US", { weekday: "short" }),
      minutes: matchingDay?.studyMinutes || 0,
    };
  });

  const taskChartData = [
    { name: "Completed", value: tasks.completedTasks || 0 },
    { name: "Pending", value: tasks.pendingTasks || 0 },
    { name: "In Progress", value: tasks.inProgressTasks || 0 },
  ].filter((item) => item.value > 0);

  const hasTaskData = taskChartData.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-slate-50 to-purple-100">
      {/* Header */}
      <header className="border-b border-white/70 bg-white/75 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 transition hover:text-indigo-800"
            >
              ← Back to Dashboard
            </Link>

            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Study Analytics
              <span className="ml-2">📊</span>
            </h1>

            <p className="mt-2 text-sm text-slate-500 sm:text-base">
              Track your learning journey and study performance.
            </p>
          </div>

          <button
            onClick={fetchAnalytics}
            className="rounded-xl border border-indigo-100 bg-white px-5 py-3 text-sm font-semibold text-indigo-700 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50"
          >
            ↻ Refresh Analytics
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-9 px-4 py-9 sm:px-6 lg:px-8">
        {/* Overview Cards */}
        <section>
          <div className="mb-5">
            <h2 className="text-xl font-extrabold text-slate-800">
              Overall Performance
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              A quick overview of your learning progress.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Total Study Time"
              value={`${study.totalStudyHours || 0} hrs`}
              subtitle={formatMinutes(study.totalStudyMinutes)}
              icon="📚"
              color="bg-indigo-100 text-indigo-600"
            />

            <StatCard
              title="Today's Study"
              value={formatMinutes(study.todayStudyMinutes)}
              subtitle="Study time today"
              icon="⏱️"
              color="bg-blue-100 text-blue-600"
            />

            <StatCard
              title="Completed Tasks"
              value={`${tasks.completedTasks || 0}/${tasks.totalTasks || 0}`}
              subtitle={`${tasks.completionPercentage || 0}% completion`}
              icon="✅"
              color="bg-green-100 text-green-600"
            />

            <StatCard
              title="Quiz Accuracy"
              value={`${quizzes.accuracyPercentage || 0}%`}
              subtitle={`${quizzes.totalAttempts || 0} quiz attempts`}
              icon="🎯"
              color="bg-orange-100 text-orange-600"
            />
          </div>
        </section>

        {/* Weekly Activity */}
        <section className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-xl shadow-indigo-100/50 backdrop-blur-sm sm:p-7">
          <SectionHeading
            title="Weekly Study Activity"
            subtitle="Your study time over the last seven days."
            icon="📅"
          />

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={weeklyData}
                margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="4 4"
                  vertical={false}
                  stroke="#e2e8f0"
                />

                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                />

                <YAxis
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                />

                <Tooltip
                  cursor={{ fill: "#eef2ff" }}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e0e7ff",
                    boxShadow: "0 8px 25px rgba(99,102,241,0.10)",
                  }}
                  formatter={(value) => [
                    formatMinutes(value),
                    "Study Time",
                  ]}
                />

                <Bar
                  dataKey="minutes"
                  fill="#6366f1"
                  radius={[9, 9, 0, 0]}
                  maxBarSize={55}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Subject and Task Analytics */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Subject Analytics */}
          <div className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-xl shadow-indigo-100/50 backdrop-blur-sm sm:p-7">
            <SectionHeading
              title="Subject-wise Study Time"
              subtitle="Understand where you spend your study time."
              icon="📖"
            />

            {subjects.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center text-center">
                <span className="text-4xl">📚</span>
                <p className="mt-3 text-sm text-slate-400">
                  No subject data available yet.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {subjects.map((subject, index) => {
                  const totalMinutes = study.totalStudyMinutes || 0;

                  const percentage =
                    totalMinutes > 0
                      ? (subject.studyMinutes / totalMinutes) * 100
                      : 0;

                  return (
                    <div key={subject.subject}>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div>
                          <p className="font-bold text-slate-800">
                            {subject.subject}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {subject.topicsCovered} topics covered
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-700">
                            {formatMinutes(subject.studyMinutes)}
                          </p>

                          <p className="text-xs text-slate-400">
                            {percentage.toFixed(0)}%
                          </p>
                        </div>
                      </div>

                      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: COLORS[index % COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Task Analytics */}
          <div className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-xl shadow-indigo-100/50 backdrop-blur-sm sm:p-7">
            <SectionHeading
              title="Task Completion"
              subtitle="Your task status distribution."
              icon="✅"
            />

            {hasTaskData ? (
              <>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={taskChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={95}
                        paddingAngle={4}
                      >
                        {taskChartData.map((entry) => {
                          const colorIndex = [
                            "Completed",
                            "Pending",
                            "In Progress",
                          ].indexOf(entry.name);

                          return (
                            <Cell
                              key={entry.name}
                              fill={COLORS[colorIndex]}
                            />
                          );
                        })}
                      </Pie>

                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-medium text-slate-500">
                      Total Tasks
                    </p>

                    <p className="mt-2 text-2xl font-extrabold text-slate-800">
                      {tasks.totalTasks || 0}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                    <p className="text-xs font-medium text-red-500">
                      Overdue Tasks
                    </p>

                    <p className="mt-2 text-2xl font-extrabold text-red-600">
                      {tasks.overdueTasks || 0}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex h-64 flex-col items-center justify-center text-center">
                <span className="text-4xl">📋</span>

                <p className="mt-3 text-sm text-slate-400">
                  No tasks available yet.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Quiz Analytics */}
        <section className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-xl shadow-indigo-100/50 backdrop-blur-sm sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <SectionHeading
              title="Quiz Performance"
              subtitle="Your quiz creation and practice statistics."
              icon="🎯"
            />

            <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-purple-50 px-6 py-4">
              <p className="text-xs font-semibold text-indigo-500">
                Overall Accuracy
              </p>

              <p className="mt-1 text-3xl font-extrabold text-indigo-700">
                {quizzes.accuracyPercentage || 0}%
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-5">
              <p className="text-sm font-medium text-slate-500">
                Quizzes Created
              </p>

              <p className="mt-2 text-3xl font-extrabold text-slate-800">
                {quizzes.totalQuizzes || 0}
              </p>
            </div>

            <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5">
              <p className="text-sm font-medium text-blue-600">
                Quiz Attempts
              </p>

              <p className="mt-2 text-3xl font-extrabold text-blue-700">
                {quizzes.totalAttempts || 0}
              </p>
            </div>

            <div className="rounded-2xl border border-green-100 bg-gradient-to-br from-green-50 to-white p-5">
              <p className="text-sm font-medium text-green-600">
                Correct Answers
              </p>

              <p className="mt-2 text-3xl font-extrabold text-green-700">
                {study.totalCorrectAnswers || 0}
              </p>
            </div>
          </div>

          <p className="mt-4 text-xs text-slate-400">
            Quiz accuracy is calculated from your recorded Study Progress data.
            Actual quiz-attempt tracking can be added separately.
          </p>
        </section>

        {/* Quick Navigation */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-700 p-7 text-white shadow-xl shadow-indigo-200 sm:p-9">
          <div className="pointer-events-none absolute -right-10 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

          <div className="pointer-events-none absolute -bottom-20 left-1/3 h-52 w-52 rounded-full bg-purple-300/20 blur-3xl" />

          <div className="relative">
            <div className="mb-3 inline-flex rounded-xl bg-white/15 px-3 py-1.5 text-sm font-medium text-indigo-50">
              Your learning journey 🚀
            </div>

            <h2 className="text-2xl font-extrabold">
              Keep improving every day!
            </h2>

            <p className="mt-2 max-w-xl text-sm leading-6 text-indigo-100">
              Consistent study sessions and completed tasks will help you build
              better learning habits. Keep going!
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/study-planner"
                className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-indigo-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-50"
              >
                Open Study Planner →
              </Link>

              <Link
                to="/study-calendar"
                className="rounded-xl border border-white/40 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/20"
              >
                Open Study Calendar →
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}