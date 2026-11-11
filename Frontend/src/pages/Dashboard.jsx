import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import BookLogo from "../components/BookLogo";

const features = [
  {
    title: "Study Materials",
    description: "Upload and organize your learning resources.",
    path: "/materials",
    icon: "📚",
    color: "from-blue-500 to-cyan-500",
  },
  {
    title: "My Notes",
    description: "Create and manage your personal notes.",
    path: "/notes",
    icon: "📝",
    color: "from-purple-500 to-pink-500",
  },
  {
    title: "AI Assistant",
    description: "Summarize content and ask study questions.",
    path: "/ai",
    icon: "✨",
    color: "from-cyan-500 to-teal-500",
  },
  {
    title: "AI Flashcards",
    description:
      "Generate flashcards from your study materials or any topic and revise them with spaced repetition.",
    path: "/flashcards",
    icon: "🧠",
    color: "from-fuchsia-500 to-violet-600",
  },
  {
    title: "Quizzes",
    description: "Test your knowledge with practice quizzes.",
    path: "/quizzes",
    icon: "🎯",
    color: "from-orange-500 to-red-500",
  },
  {
    title: "My Progress",
    description: "Review your study activity and progress.",
    path: "/progress",
    icon: "📈",
    color: "from-green-500 to-emerald-500",
  },
  {
    title: "Study Planner",
    description:
      "Plan your study schedule, manage tasks, and track deadlines.",
    path: "/study-planner",
    icon: "📅",
    color: "from-cyan-500 to-blue-600",
  },
  {
    title: "Study Calendar",
    description:
      "View your study tasks, deadlines, and upcoming activities on a calendar.",
    path: "/study-calendar",
    icon: "🗓️",
    color: "from-indigo-500 to-purple-600",
  },
  {
    title: "Study Analytics",
    description:
      "Analyze your study time, task completion, and learning performance.",
    path: "/analytics",
    icon: "📊",
    color: "from-emerald-500 to-teal-600",
  },
  {
    title: "Pomodoro Timer",
    description:
      "Track your actual study time with the stopwatch and session history.",
    path: "/pomodoro",
    icon: "🍅",
    color: "from-rose-500 to-orange-500",
  },
  {
    title: "Study Goals & Streaks",
    description:
      "Set daily study targets, track your streaks, and build consistency.",
    path: "/study-goals",
    icon: "🔥",
    color: "from-amber-500 to-orange-600",
  },
];

const quickActions = [
  {
    title: "Upload material",
    description: "Add a PDF or document",
    path: "/materials",
    icon: "📤",
  },
  {
    title: "Write a note",
    description: "Capture important ideas",
    path: "/notes",
    icon: "✍️",
  },
  {
    title: "Ask AI",
    description: "Get help with a topic",
    path: "/ai",
    icon: "✨",
  },
  {
    title: "AI Flashcards",
    description: "Create and review smart flashcards",
    path: "/flashcards",
    icon: "🧠",
  },
  {
    title: "Take a quiz",
    description: "Test your knowledge",
    path: "/quizzes",
    icon: "🎯",
  },
  {
    title: "Plan your study",
    description: "Organize your upcoming study tasks",
    path: "/study-planner",
    icon: "📅",
  },
  {
    title: "Study Calendar",
    description: "View deadlines and upcoming study tasks",
    path: "/study-calendar",
    icon: "🗓️",
  },
  {
    title: "View Analytics",
    description: "Track your overall study performance",
    path: "/analytics",
    icon: "📊",
  },
  {
    title: "Start Focus Session",
    description: "Track your actual study time",
    path: "/pomodoro",
    icon: "🍅",
  },
  {
    title: "Study Goals",
    description: "Track daily targets and study streaks",
    path: "/study-goals",
    icon: "🔥",
  },
];

function Dashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);

      try {
        const [userData, progressData] = await Promise.all([
          api("/auth/me"),
          api("/study-progress/summary").catch(() => null),
        ]);

        setUser(userData.user || userData);

        setStats(
          progressData?.summary ??
            progressData?.data?.summary ??
            progressData?.data ??
            progressData
        );

        setError("");
      } catch (err) {
        setError(err.message || "Failed to load dashboard.");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    setError("");

    try {
      await api("/auth/logout", { method: "POST" });
      navigate("/login");
    } catch (err) {
      setError(err.message || "Unable to log out. Please try again.");
      setLoggingOut(false);
    }
  };

  const summary = stats?.summary || stats;

  const totalMinutes = Number(summary?.totalStudyMinutes) || 0;
  const totalQuizzes = Number(summary?.totalQuizzesAttempted) || 0;
  const studySessions = Number(summary?.studySessions) || 0;
  const correctAnswers = Number(summary?.totalCorrectAnswers) || 0;
  const totalQuestions = Number(summary?.totalQuestions) || 0;

  const accuracy = Math.min(
    100,
    Math.max(
      0,
      Number(
        summary?.overallAccuracy ??
          (totalQuestions > 0
            ? (correctAnswers / totalQuestions) * 100
            : 0)
      ) || 0
    )
  );

  const roundedMinutes = Math.round(totalMinutes);

  const formattedMinutes =
    roundedMinutes >= 60
      ? `${Math.floor(roundedMinutes / 60)}h ${roundedMinutes % 60}m`
      : `${roundedMinutes} min`;

  const progressCards = [
    {
      title: "Total Study Time",
      value: formattedMinutes,
      icon: "⏱️",
      color: "text-cyan-400",
      background: "bg-cyan-400/10",
      border: "hover:border-cyan-400/30",
    },
    {
      title: "Quizzes Attempted",
      value: totalQuizzes,
      icon: "📝",
      color: "text-purple-400",
      background: "bg-purple-400/10",
      border: "hover:border-purple-400/30",
    },
    {
      title: "Study Sessions",
      value: studySessions,
      icon: "📚",
      color: "text-emerald-400",
      background: "bg-emerald-400/10",
      border: "hover:border-emerald-400/30",
    },
  ];

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      {/* Navbar */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#050816]/90 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-4">
          <Link
            to="/dashboard"
            className="flex shrink-0 items-center gap-3"
          >
            <BookLogo size={42} />

            <div>
              <span className="block text-lg font-bold tracking-tight">
                Study Companion
              </span>
              <span className="hidden text-xs text-slate-500 sm:block">
                Your personal learning space
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/study-planner"
              className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs font-medium text-cyan-300 transition hover:bg-cyan-400/20 sm:px-4 sm:text-sm"
            >
              📅 <span className="hidden sm:inline">Study Planner</span>
              <span className="sm:hidden">Planner</span>
            </Link>

            <Link
              to="/study-calendar"
              className="rounded-xl border border-indigo-400/20 bg-indigo-400/10 px-3 py-2 text-xs font-medium text-indigo-300 transition hover:bg-indigo-400/20 sm:px-4 sm:text-sm"
            >
              🗓️ <span className="hidden sm:inline">Calendar</span>
            </Link>

            <Link
              to="/analytics"
              className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs font-medium text-emerald-300 transition hover:bg-emerald-400/20 sm:px-4 sm:text-sm"
            >
              📊 <span className="hidden sm:inline">Analytics</span>
            </Link>

            <Link
              to="/pomodoro"
              className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs font-medium text-rose-300 transition hover:bg-rose-400/20 sm:px-4 sm:text-sm"
            >
              🍅 <span className="hidden sm:inline">Pomodoro</span>
            </Link>

            <Link
              to="/study-goals"
              className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs font-medium text-amber-300 transition hover:bg-amber-400/20 sm:px-4 sm:text-sm"
            >
              🔥 <span className="hidden sm:inline">Study Goals</span>
              <span className="sm:hidden">Goals</span>
            </Link>

            <Link
              to="/progress"
              className="hidden rounded-xl px-4 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white sm:block"
            >
              My Progress
            </Link>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-red-400/30 hover:bg-red-400/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:text-sm"
            >
              {loggingOut ? "Logging out..." : "Log out"}
            </button>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8 sm:py-12">
        {/* Welcome Banner */}
        <section className="relative overflow-hidden rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-blue-950 via-[#10172d] to-purple-950 p-7 sm:p-10 lg:p-12">
          <div className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="pointer-events-none absolute -bottom-28 right-1/4 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl" />

          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-cyan-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
              YOUR PERSONAL LEARNING SPACE
            </div>

            <h1 className="mt-6 text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
              Welcome back
              {user?.name ? (
                <>
                  , <span className="text-cyan-300">{user.name}</span>
                </>
              ) : (
                ""
              )}
              ! 👋
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              Ready to learn something new today? Organize your materials,
              create notes, practice quizzes, and use AI to make studying
              smarter.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/materials"
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/10 transition hover:-translate-y-0.5 hover:bg-cyan-300"
              >
                Explore materials <span>→</span>
              </Link>

              <Link
                to="/ai"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                <span>✨</span> Open AI Assistant
              </Link>

              <Link
                to="/flashcards"
                className="inline-flex items-center gap-2 rounded-xl border border-fuchsia-400/30 bg-fuchsia-400/10 px-5 py-3 text-sm font-semibold text-fuchsia-300 transition hover:bg-fuchsia-400/20"
              >
                <span>🧠</span> Create Flashcards
              </Link>

              <Link
                to="/study-planner"
                className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-5 py-3 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-400/20"
              >
                <span>📅</span> Plan your study
              </Link>

              <Link
                to="/study-calendar"
                className="inline-flex items-center gap-2 rounded-xl border border-indigo-400/30 bg-indigo-400/10 px-5 py-3 text-sm font-semibold text-indigo-300 transition hover:bg-indigo-400/20"
              >
                <span>🗓️</span> Open Study Calendar
              </Link>

              <Link
                to="/analytics"
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-5 py-3 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-400/20"
              >
                <span>📊</span> View Analytics
              </Link>

              <Link
                to="/pomodoro"
                className="inline-flex items-center gap-2 rounded-xl border border-rose-400/30 bg-rose-400/10 px-5 py-3 text-sm font-semibold text-rose-300 transition hover:bg-rose-400/20"
              >
                🍅 Start Focus Session
              </Link>

              <Link
                to="/study-goals"
                className="inline-flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-5 py-3 text-sm font-semibold text-amber-300 transition hover:bg-amber-400/20"
              >
                🔥 Set Study Goals
              </Link>
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-7 right-8 hidden text-8xl opacity-10 lg:block">
            🎓
          </div>
        </section>

        {/* Error Message */}
        {error && (
          <div
            role="alert"
            className="mt-5 flex items-start justify-between gap-4 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300"
          >
            <p>{error}</p>

            <button
              onClick={() => setError("")}
              className="shrink-0 text-red-300 transition hover:text-white"
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        )}

        {/* Quick Stats */}
        <section className="mt-10">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Your overview
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                A snapshot of your learning activity.
              </p>
            </div>

            <Link
              to="/analytics"
              className="text-sm font-medium text-cyan-400 transition hover:text-cyan-300"
            >
              Full report →
            </Link>
          </div>

          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="animate-pulse rounded-2xl border border-white/10 bg-white/[0.03] p-6"
                >
                  <div className="h-4 w-32 rounded bg-white/10" />
                  <div className="mt-6 h-9 w-24 rounded bg-white/10" />
                  <div className="mt-3 h-3 w-40 rounded bg-white/5" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {progressCards.map((card) => (
                <article
                  key={card.title}
                  className={`group rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition duration-300 hover:-translate-y-1 hover:bg-white/[0.05] ${card.border}`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-400">
                      {card.title}
                    </p>

                    <span
                      className={`flex h-12 w-12 items-center justify-center rounded-xl text-xl ${card.background}`}
                    >
                      {card.icon}
                    </span>
                  </div>

                  <p className={`mt-5 text-3xl font-bold ${card.color}`}>
                    {card.value}
                  </p>

                  <p className="mt-2 text-xs text-slate-500">
                    {card.title === "Total Study Time"
                      ? "Time spent learning"
                      : card.title === "Quizzes Attempted"
                        ? "Practice makes progress"
                        : "Keep your routine going"}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Workspace */}
        <section className="mt-12">
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight">
              Your workspace
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Everything you need to study effectively, all in one place.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Link
                key={feature.path}
                to={feature.path}
                className="group rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition duration-300 hover:-translate-y-1 hover:border-cyan-400/30 hover:bg-white/[0.05]"
              >
                <div className="flex items-start justify-between">
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.color} text-2xl shadow-lg transition duration-300 group-hover:scale-105`}
                  >
                    {feature.icon}
                  </div>

                  <span className="text-lg text-slate-600 transition group-hover:translate-x-1 group-hover:text-cyan-400">
                    ↗
                  </span>
                </div>

                <h3 className="mt-6 text-lg font-semibold transition group-hover:text-cyan-300">
                  {feature.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {feature.description}
                </p>

                <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-cyan-400">
                  Open section
                  <span className="transition group-hover:translate-x-1">
                    →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="mt-12">
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight">
              Quick actions
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Jump straight into your next study task.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {quickActions.map((action) => (
              <Link
                key={action.title}
                to={action.path}
                className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition duration-300 hover:-translate-y-1 hover:border-cyan-400/30 hover:bg-cyan-400/[0.04]"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-2xl transition group-hover:scale-105">
                  {action.icon}
                </span>

                <div className="min-w-0">
                  <h3 className="font-semibold transition group-hover:text-cyan-300">
                    {action.title}
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    {action.description}
                  </p>
                </div>

                <span className="ml-auto text-slate-600 transition group-hover:translate-x-1 group-hover:text-cyan-400">
                  →
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Learning Progress */}
        <section className="mt-12">
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight">
              Your learning progress
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Track your study time, quiz performance, and consistency.
            </p>
          </div>

          {loading ? (
            <div className="animate-pulse rounded-2xl border border-white/10 bg-white/[0.03] p-8">
              <div className="h-5 w-40 rounded bg-white/10" />
              <div className="mt-5 h-3 w-full rounded-full bg-white/10" />
            </div>
          ) : !stats ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center sm:p-10">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-3xl">
                📈
              </div>

              <h3 className="mt-5 text-lg font-semibold">
                Your learning journey starts here
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
                Complete study sessions and quizzes to see your learning
                statistics here.
              </p>

              <Link
                to="/materials"
                className="mt-5 inline-flex rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300"
              >
                Start studying →
              </Link>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-5">
                <div>
                  <h3 className="text-xl font-semibold">Quiz accuracy</h3>

                  <p className="mt-2 text-sm text-slate-400">
                    {correctAnswers} correct answers out of {totalQuestions}{" "}
                    questions
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-3xl font-bold text-emerald-400">
                    {accuracy.toFixed(1)}%
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Overall accuracy
                  </p>
                </div>
              </div>

              <div
                className="mt-7 h-3 overflow-hidden rounded-full bg-white/10"
                role="progressbar"
                aria-label="Quiz accuracy"
                aria-valuenow={accuracy}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-400 to-emerald-400 transition-all duration-700"
                  style={{ width: `${accuracy}%` }}
                />
              </div>

              <div className="mt-3 flex justify-between text-xs text-slate-500">
                <span>Keep practicing</span>
                <span>Goal: 100%</span>
              </div>

              {totalQuestions === 0 && (
                <p className="mt-4 text-xs text-slate-500">
                  Complete a quiz to begin tracking your accuracy.
                </p>
              )}
            </div>
          )}

          <Link
            to="/progress"
            className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-cyan-400 transition hover:border-cyan-400/30 hover:bg-cyan-400/5"
          >
            View detailed progress <span>→</span>
          </Link>
        </section>

        {/* Footer */}
        <footer className="mt-14 border-t border-white/10 py-6">
          <div className="flex flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
            <p className="text-sm text-slate-500">
              © {new Date().getFullYear()} Study Companion
            </p>

            <p className="text-xs text-slate-600">
              Learn smarter. Stay consistent. Keep growing.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}

export default Dashboard;