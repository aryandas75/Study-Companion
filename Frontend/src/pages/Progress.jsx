
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

function Progress() {
  const [summary, setSummary] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadProgress = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      else setRefreshing(true);

      setError("");

      const [summaryResponse, activityResponse] = await Promise.all([
        api("/study-progress/summary"),
        api("/study-progress"),
      ]);

      const summaryData =
        summaryResponse?.summary ??
        summaryResponse?.data?.summary ??
        summaryResponse?.data ??
        summaryResponse;

      const activityData =
        activityResponse?.progress ??
        activityResponse?.data?.progress ??
        activityResponse?.activities ??
        activityResponse?.data?.activities ??
        activityResponse?.data ??
        activityResponse;

      setSummary(summaryData || {});

      setActivities(
        Array.isArray(activityData) ? activityData : []
      );
    } catch (err) {
      console.error("Load progress error:", err);
      setError(err.message || "Failed to load your progress.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProgress();
  }, []);

  // Format duration using seconds to preserve accurate stopwatch time.
  const formatDuration = (seconds) => {
    const value = Number(seconds);

    if (!Number.isFinite(value) || value < 0) {
      return "0 min";
    }

    const totalSeconds = Math.floor(value);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const remainingSeconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }

    return `${remainingSeconds}s`;
  };

  // Display all dates in Indian Standard Time.
  const formatDate = (date) => {
    if (!date) return "Date unavailable";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "Date unavailable";
    }

    return parsedDate.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getActivityType = (activity) => {
    if (activity.pomodoroSession) return "study";
    if (activity.quizAttempt || activity.quizzesAttempted > 0) {
      return "quiz";
    }

    return "other";
  };

  const getActivityName = (activity) => {
    const type = getActivityType(activity);

    if (type === "study") return "Study session completed";
    if (type === "quiz") return "Quiz attempt recorded";

    return activity.title || activity.topic || "Study activity";
  };

  const getActivityIcon = (activity) => {
    const type = getActivityType(activity);

    if (type === "study") return "⏱️";
    if (type === "quiz") return "🎯";

    return "📚";
  };

  const getActivityDuration = (activity) => {
    const seconds = Number(activity.studyTimeSeconds || 0);

    if (seconds > 0) return formatDuration(seconds);

    const minutes = Number(activity.studyTimeMinutes || 0);

    if (minutes > 0) {
      return formatDuration(minutes * 60);
    }

    return null;
  };

  const stats = useMemo(() => {
    const totalStudySeconds = Number(
      summary?.totalStudySeconds ??
      (Number(summary?.totalStudyMinutes || 0) * 60)
    );

    const totalQuizzesAttempted = Number(
      summary?.totalQuizzesAttempted || 0
    );

    const totalCorrectAnswers = Number(
      summary?.totalCorrectAnswers || 0
    );

    const totalQuestions = Number(
      summary?.totalQuestions || 0
    );

    const studySessions = Number(
      summary?.studySessions || 0
    );

    const accuracy =
      summary?.overallAccuracy !== undefined
        ? Number(summary.overallAccuracy)
        : totalQuestions > 0
          ? (totalCorrectAnswers / totalQuestions) * 100
          : 0;

    return {
      totalStudySeconds,
      totalQuizzesAttempted,
      totalCorrectAnswers,
      totalQuestions,
      studySessions,
      accuracy,
    };
  }, [summary]);

  const cards = [
    {
      title: "Total Study Time",
      value: formatDuration(stats.totalStudySeconds),
      icon: "⏱️",
      color: "text-cyan-400",
      background: "bg-cyan-400/10",
      description: "Your recorded study duration",
    },
    {
      title: "Study Sessions",
      value: stats.studySessions,
      icon: "📖",
      color: "text-purple-400",
      background: "bg-purple-400/10",
      description: "Completed stopwatch sessions",
    },
    {
      title: "Quizzes Attempted",
      value: stats.totalQuizzesAttempted,
      icon: "🎯",
      color: "text-orange-400",
      background: "bg-orange-400/10",
      description: "Total quiz attempts",
    },
    {
      title: "Quiz Accuracy",
      value: `${stats.accuracy.toFixed(1)}%`,
      icon: "🏆",
      color: "text-emerald-400",
      background: "bg-emerald-400/10",
      description: "Your overall quiz performance",
    },
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050816] text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-cyan-400/20 border-t-cyan-400" />
          <p className="text-sm text-slate-400">
            Preparing your learning analytics...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      {/* HEADER */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#050816]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 font-bold transition hover:text-cyan-400"
          >
            <span className="text-xl">←</span>
            Study Companion
          </Link>

          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-slate-400 sm:block">
              Learning Analytics
            </span>

            <button
              onClick={() => loadProgress(false)}
              disabled={refreshing}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium transition hover:border-cyan-400/40 hover:bg-cyan-400/5 disabled:opacity-50"
            >
              {refreshing ? "Refreshing..." : "↻ Refresh"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-10">
        {/* HERO */}
        <section className="relative overflow-hidden rounded-3xl border border-cyan-400/10 bg-gradient-to-br from-[#101d3b] via-[#0c1429] to-[#111027] p-7 sm:p-10">
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative z-10 max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">
              Your learning journey
            </p>

            <h1 className="mt-4 text-3xl font-bold sm:text-4xl lg:text-5xl">
              Track your progress 📈
            </h1>

            <p className="mt-4 leading-7 text-slate-400">
              Every study session and quiz brings you closer to your
              learning goals. Monitor your consistency and keep improving.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/materials"
                className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300"
              >
                Continue studying →
              </Link>

              <Link
                to="/quizzes"
                className="rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold transition hover:bg-white/5"
              >
                Practice quizzes
              </Link>
            </div>
          </div>
        </section>

        {/* ERROR */}
        {error && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">
            <span>{error}</span>

            <button
              onClick={() => loadProgress()}
              className="font-semibold underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* OVERVIEW */}
        <section className="mt-9">
          <div className="mb-5">
            <h2 className="text-xl font-bold">
              Learning overview
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Your overall study statistics
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
              <article
                key={card.title}
                className="rounded-2xl border border-white/10 bg-[#0d1222] p-6 transition duration-300 hover:-translate-y-1 hover:border-white/20"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-400">
                    {card.title}
                  </p>

                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.background} text-xl`}
                  >
                    {card.icon}
                  </div>
                </div>

                <p className={`mt-6 text-3xl font-bold ${card.color}`}>
                  {card.value}
                </p>

                <p className="mt-2 text-xs text-slate-500">
                  {card.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* QUIZ PERFORMANCE */}
        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-white/10 bg-[#0d1222] p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">
                  Quiz performance
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Your results across all quiz attempts
                </p>
              </div>

              <span className="text-2xl">🎯</span>
            </div>

            <div className="mt-7 flex items-end justify-between">
              <p className="text-4xl font-bold text-emerald-400">
                {stats.accuracy.toFixed(1)}%
              </p>

              <p className="text-sm text-slate-400">
                {stats.totalCorrectAnswers} / {stats.totalQuestions} correct
              </p>
            </div>

            <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all duration-700"
                style={{
                  width: `${Math.min(Math.max(stats.accuracy, 0), 100)}%`,
                }}
              />
            </div>

            <p className="mt-4 text-xs text-slate-500">
              Accuracy is calculated using all submitted quiz answers.
            </p>

            <Link
              to="/quizzes"
              className="mt-5 inline-block text-sm font-semibold text-cyan-400 hover:text-cyan-300"
            >
              Practice more quizzes →
            </Link>
          </article>

          {/* STUDY TIME */}
          <article className="rounded-2xl border border-white/10 bg-[#0d1222] p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">
                  Study summary
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Your recorded study effort
                </p>
              </div>

              <span className="text-2xl">📚</span>
            </div>

            <div className="mt-7 space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">
                  Total study time
                </span>

                <span className="font-semibold text-cyan-400">
                  {formatDuration(stats.totalStudySeconds)}
                </span>
              </div>

              <div className="h-px bg-white/10" />

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">
                  Completed sessions
                </span>

                <span className="font-semibold text-purple-400">
                  {stats.studySessions}
                </span>
              </div>

              <div className="h-px bg-white/10" />

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">
                  Total quiz attempts
                </span>

                <span className="font-semibold text-orange-400">
                  {stats.totalQuizzesAttempted}
                </span>
              </div>
            </div>

            <Link
              to="/pomodoro"
              className="mt-6 inline-block text-sm font-semibold text-cyan-400 hover:text-cyan-300"
            >
              Start a study session →
            </Link>
          </article>
        </section>

        {/* ACTIVITY HISTORY */}
        <section className="mt-8 rounded-2xl border border-white/10 bg-[#0d1222] p-6 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">
                Recent study activities
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Your latest recorded study sessions and quiz attempts
              </p>
            </div>

            <span className="rounded-full bg-cyan-400/10 px-4 py-2 text-xs font-semibold text-cyan-400">
              {activities.length} records
            </span>
          </div>

          {activities.length === 0 ? (
            <div className="py-14 text-center">
              <div className="text-5xl">🌱</div>

              <h3 className="mt-5 text-lg font-semibold">
                Your journey starts here
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
                Complete a quiz or record a study session to start
                building your learning history.
              </p>

              <Link
                to="/materials"
                className="mt-6 inline-block rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-300"
              >
                Start learning →
              </Link>
            </div>
          ) : (
            <div className="mt-7 space-y-4">
              {activities.map((activity, index) => {
                const type = getActivityType(activity);
                const duration = getActivityDuration(activity);
                const date = activity.date || activity.createdAt;

                const quizScore =
                  activity.quizAttempt?.scorePercentage ??
                  activity.scorePercentage;

                return (
                  <article
                    key={activity._id || index}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 transition hover:border-cyan-400/20 hover:bg-white/[0.04]"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/5 text-xl">
                        {getActivityIcon(activity)}
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate font-semibold">
                          {getActivityName(activity)}
                        </h3>

                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                          <span>{activity.subject || "General"}</span>

                          {activity.topic && (
                            <>
                              <span>•</span>
                              <span>{activity.topic}</span>
                            </>
                          )}

                          {date && (
                            <>
                              <span>•</span>
                              <span>{formatDate(date)}</span>
                            </>
                          )}

                          {duration && (
                            <>
                              <span>•</span>
                              <span>{duration}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {type === "quiz" &&
                        quizScore !== undefined && (
                          <span className="rounded-full bg-purple-400/10 px-3 py-1.5 text-xs font-semibold text-purple-300">
                            {Number(quizScore).toFixed(1)}%
                          </span>
                        )}

                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                          type === "study"
                            ? "bg-cyan-400/10 text-cyan-300"
                            : type === "quiz"
                              ? "bg-purple-400/10 text-purple-300"
                              : "bg-slate-400/10 text-slate-300"
                        }`}
                      >
                        {type === "study"
                          ? "Study"
                          : type === "quiz"
                            ? "Quiz"
                            : "Recorded"}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* QUICK NAVIGATION */}
        <section className="mt-8">
          <h2 className="text-xl font-bold">
            Continue your learning
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Jump back into your study tools.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              to="/materials"
              className="rounded-2xl border border-white/10 bg-[#0d1222] p-5 transition hover:border-cyan-400/30 hover:bg-cyan-400/[0.04]"
            >
              <span className="text-2xl">📚</span>
              <h3 className="mt-4 font-semibold">Study Materials</h3>
              <p className="mt-2 text-sm text-slate-400">
                Read and organize your learning resources.
              </p>
            </Link>

            <Link
              to="/quizzes"
              className="rounded-2xl border border-white/10 bg-[#0d1222] p-5 transition hover:border-purple-400/30 hover:bg-purple-400/[0.04]"
            >
              <span className="text-2xl">🎯</span>
              <h3 className="mt-4 font-semibold">Practice Quizzes</h3>
              <p className="mt-2 text-sm text-slate-400">
                Test your knowledge with AI-generated MCQs.
              </p>
            </Link>

            <Link
              to="/pomodoro"
              className="rounded-2xl border border-white/10 bg-[#0d1222] p-5 transition hover:border-emerald-400/30 hover:bg-emerald-400/[0.04]"
            >
              <span className="text-2xl">⏱️</span>
              <h3 className="mt-4 font-semibold">Study Timer</h3>
              <p className="mt-2 text-sm text-slate-400">
                Record your next focused study session.
              </p>
            </Link>
          </div>
        </section>

        {/* MOTIVATION */}
        <section className="mt-8 overflow-hidden rounded-2xl border border-emerald-400/15 bg-gradient-to-r from-emerald-400/[0.08] to-cyan-400/[0.04] p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="max-w-xl">
              <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
                Stay consistent
              </p>

              <h2 className="mt-3 text-2xl font-bold">
                Small steps. Big progress. 💪
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                Focus on improving a little every day. Complete your
                study goals, practise regularly and keep building your
                learning streak.
              </p>
            </div>

            <Link
              to="/study-goals"
              className="rounded-xl border border-emerald-400/30 px-5 py-3 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-400/10"
            >
              View study goals →
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Progress;
