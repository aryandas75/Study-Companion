
import { useCallback, useEffect, useRef, useState } from "react";
import {
  startPomodoroSession,
  pausePomodoroSession,
  resumePomodoroSession,
  finishPomodoroSession,
  getPomodoroSessions,
  deletePomodoroSession,
} from "../services/pomodoro.api";

export default function Pomodoro() {
  const [subject, setSubject] = useState("General");
  const [session, setSession] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState({
    totalSessions: 0,
    completedSessions: 0,
    totalSeconds: 0,
    totalMinutes: 0,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [message, setMessage] = useState("");

  const timerRef = useRef(null);

  const isRunning = session?.status === "running";
  const isPaused = session?.status === "paused";
  const hasActiveSession = isRunning || isPaused;

  // Calculate elapsed seconds using server timestamps.
  const calculateElapsedSeconds = useCallback((currentSession) => {
    if (!currentSession) return 0;

    let total = Number(currentSession.accumulatedSeconds || 0);

    if (currentSession.status === "running" && currentSession.lastResumedAt) {
      const lastResumedAt = new Date(
        currentSession.lastResumedAt
      ).getTime();

      const runningSeconds = Math.floor(
        (Date.now() - lastResumedAt) / 1000
      );

      total += Math.max(0, runningSeconds);
    }

    return total;
  }, []);

  // Load history and restore any unfinished session.
  const loadSessions = useCallback(async () => {
    try {
      setHistoryError("");

      const response = await getPomodoroSessions();

      if (response?.success) {
        const fetchedSessions = response.sessions || [];

        setSessions(fetchedSessions);
        setStats(
          response.stats || {
            totalSessions: 0,
            completedSessions: 0,
            totalSeconds: 0,
            totalMinutes: 0,
          }
        );

        const activeSession = fetchedSessions.find(
          (item) =>
            item.status === "running" || item.status === "paused"
        );

        if (activeSession) {
          setSession(activeSession);
          setElapsedSeconds(calculateElapsedSeconds(activeSession));
          setSubject(activeSession.subject || "General");
        } else {
          setSession(null);
          setElapsedSeconds(0);
        }
      }
    } catch (error) {
      console.error("Error loading study sessions:", error);
      setHistoryError("Unable to load your study session history.");
    } finally {
      setLoading(false);
    }
  }, [calculateElapsedSeconds]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Stopwatch: update the display every second.
  // The server timestamps remain the source of truth.
  useEffect(() => {
    if (!isRunning || !session) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      return;
    }

    timerRef.current = setInterval(() => {
      setElapsedSeconds(calculateElapsedSeconds(session));
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRunning, session, calculateElapsedSeconds]);

  // Start a new study session.
  const handleStart = async () => {
    try {
      setSaving(true);
      setMessage("");

      const response = await startPomodoroSession(
        subject.trim() || "General"
      );

      if (!response?.success) {
        throw new Error(response?.message || "Could not start session");
      }

      setSession(response.session);
      setElapsedSeconds(0);
      setMessage("Your study session has started. Stay focused!");
      await loadSessions();
    } catch (error) {
      console.error("Start session error:", error);
      setMessage(
        error?.message || "Unable to start your study session."
      );
    } finally {
      setSaving(false);
    }
  };

  // Pause the current study session.
  const handlePause = async () => {
    if (!session?._id) return;

    try {
      setSaving(true);
      setMessage("");

      const response = await pausePomodoroSession(session._id);

      if (!response?.success) {
        throw new Error(response?.message || "Could not pause session");
      }

      setSession(response.session);
      setElapsedSeconds(
        response.elapsedSeconds ??
          calculateElapsedSeconds(response.session)
      );
      setMessage("Study session paused. Take your time.");
      await loadSessions();
    } catch (error) {
      console.error("Pause session error:", error);
      setMessage(error?.message || "Unable to pause your session.");
    } finally {
      setSaving(false);
    }
  };

  // Resume a paused study session.
  const handleResume = async () => {
    if (!session?._id) return;

    try {
      setSaving(true);
      setMessage("");

      const response = await resumePomodoroSession(session._id);

      if (!response?.success) {
        throw new Error(response?.message || "Could not resume session");
      }

      setSession(response.session);
      setElapsedSeconds(
        calculateElapsedSeconds(response.session)
      );
      setMessage("Welcome back! Your stopwatch has resumed.");
      await loadSessions();
    } catch (error) {
      console.error("Resume session error:", error);
      setMessage(error?.message || "Unable to resume your session.");
    } finally {
      setSaving(false);
    }
  };

  // Finish and save the actual study time.
  const handleFinish = async () => {
    if (!session?._id) return;

    const confirmed = window.confirm(
      "Are you sure you want to finish this study session?"
    );

    if (!confirmed) return;

    try {
      setSaving(true);
      setMessage("");

      const response = await finishPomodoroSession(session._id);

      if (!response?.success) {
        throw new Error(response?.message || "Could not finish session");
      }

      const finalSeconds =
        response.elapsedSeconds ??
        response.session?.accumulatedSeconds ??
        elapsedSeconds;

      setElapsedSeconds(finalSeconds);
      setSession(null);

      setMessage(
        `Session completed! ${formatTime(finalSeconds)} of study time saved to your progress.`
      );

      await loadSessions();
    } catch (error) {
      console.error("Finish session error:", error);
      setMessage(
        error?.message || "Unable to finish and save your session."
      );
    } finally {
      setSaving(false);
    }
  };

  // Format seconds as HH:MM:SS.
  const formatTime = (seconds) => {
    const safeSeconds = Math.max(0, Math.floor(seconds || 0));

    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const remainingSeconds = safeSeconds % 60;

    return [
      String(hours).padStart(2, "0"),
      String(minutes).padStart(2, "0"),
      String(remainingSeconds).padStart(2, "0"),
    ].join(":");
  };

  // Format total minutes for statistics.
  const formatMinutes = (minutes) => {
    const safeMinutes = Math.floor(minutes || 0);
    const hours = Math.floor(safeMinutes / 60);
    const remainingMinutes = safeMinutes % 60;

    if (hours === 0) return `${remainingMinutes} min`;
    if (remainingMinutes === 0) return `${hours} hr`;

    return `${hours} hr ${remainingMinutes} min`;
  };

  // Format session date.
  const formatDate = (date) => {
    return new Date(date).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const completedSessions = sessions.filter(
    (item) => item.status === "completed" || item.completed === true
  );

  const totalFocusSeconds =
    stats.totalSeconds ??
    completedSessions.reduce(
      (total, item) =>
        total + Number(item.accumulatedSeconds || 0),
      0
    );
    const handleDeleteSession = async (sessionId) => {
  const confirmed = window.confirm(
    "Are you sure you want to delete this study session? Its associated study progress will also be deleted."
  );

  if (!confirmed) return;

  try {
    setSaving(true);
    setMessage("");

    const response = await deletePomodoroSession(sessionId);

    if (!response?.success) {
      throw new Error(response?.message || "Failed to delete session");
    }

    setMessage("Study session deleted successfully.");

    await loadSessions();
  } catch (error) {
    console.error("Delete session error:", error);
    setMessage(error?.message || "Unable to delete study session.");
  } finally {
    setSaving(false);
  }
};

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#080b18] via-[#11152b] to-[#1b1235] px-4 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.25em] text-indigo-400">
              Study Companion
            </p>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Study Stopwatch
            </h1>

            <p className="mt-2 text-slate-400">
              Track exactly how much time you spend studying.
            </p>
          </div>

          <button
            onClick={() => (window.location.href = "/dashboard")}
            className="rounded-xl border border-white/10 bg-white/10 px-5 py-3 font-medium text-white transition hover:bg-white/20"
          >
            ← Dashboard
          </button>
        </div>

        {/* Main Stopwatch Card */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-purple-950/30 backdrop-blur-xl sm:p-10">
          {/* Status */}
          <div className="mb-8 text-center">
            <span
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${
                isRunning
                  ? "bg-emerald-500/10 text-emerald-300"
                  : isPaused
                  ? "bg-amber-500/10 text-amber-300"
                  : "bg-indigo-500/10 text-indigo-300"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  isRunning
                    ? "animate-pulse bg-emerald-400"
                    : isPaused
                    ? "bg-amber-400"
                    : "bg-indigo-400"
                }`}
              />
              {isRunning
                ? "Study session running"
                : isPaused
                ? "Study session paused"
                : "Ready to study"}
            </span>
          </div>

          {/* Stopwatch Display */}
          <div className="text-center">
            <div className="relative mx-auto my-10 flex h-64 w-64 items-center justify-center rounded-full border-[12px] border-white/10 bg-white/[0.03] shadow-[0_0_60px_rgba(99,102,241,0.12)] sm:h-72 sm:w-72">
              <div
                className={`absolute inset-[-12px] rounded-full border-[3px] ${
                  isRunning
                    ? "border-emerald-400/50"
                    : isPaused
                    ? "border-amber-400/40"
                    : "border-indigo-400/30"
                }`}
              />

              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                  Total study time
                </p>

                <span className="font-mono text-5xl font-bold tracking-tight text-white sm:text-6xl">
                  {formatTime(elapsedSeconds)}
                </span>

                <p className="mt-4 text-sm font-medium text-slate-400">
                  {isRunning
                    ? "Keep going. You're doing great!"
                    : isPaused
                    ? "Paused. Resume when ready."
                    : "Every second counts."}
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="mb-9 flex flex-wrap justify-center gap-4">
              {!hasActiveSession && (
                <button
                  onClick={handleStart}
                  disabled={saving || loading}
                  className="min-w-40 rounded-xl bg-indigo-600 px-8 py-3.5 font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:scale-105 hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Starting..." : "▶ Start Studying"}
                </button>
              )}

              {isRunning && (
                <button
                  onClick={handlePause}
                  disabled={saving}
                  className="min-w-40 rounded-xl bg-amber-600 px-8 py-3.5 font-semibold text-white shadow-lg shadow-amber-500/20 transition hover:scale-105 hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Pausing..." : "Ⅱ Pause"}
                </button>
              )}

              {isPaused && (
                <button
                  onClick={handleResume}
                  disabled={saving}
                  className="min-w-40 rounded-xl bg-emerald-600 px-8 py-3.5 font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:scale-105 hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Resuming..." : "▶ Resume"}
                </button>
              )}

              {hasActiveSession && (
                <button
                  onClick={handleFinish}
                  disabled={saving}
                  className="min-w-40 rounded-xl border border-white/10 bg-white/10 px-8 py-3.5 font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Saving..." : "■ Finish Session"}
                </button>
              )}
            </div>
          </div>

          {/* Subject Input */}
          <div className="mx-auto max-w-md">
            <label className="mb-3 block text-sm font-semibold text-slate-300">
              What are you studying?
            </label>

            <input
              type="text"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="e.g. Mathematics, DSA, Control Systems"
              disabled={hasActiveSession || saving}
              className="w-full rounded-xl border border-white/10 bg-[#11152b] px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60"
            />

            {hasActiveSession && (
              <p className="mt-2 text-xs text-slate-500">
                Finish your current session before changing the subject.
              </p>
            )}
          </div>

          {/* Message */}
          {message && (
            <p className="mt-6 text-center text-sm font-medium text-indigo-300">
              {message}
            </p>
          )}

          {saving && (
            <p className="mt-3 text-center text-sm text-slate-400">
              Saving your session...
            </p>
          )}
        </div>

        {/* Statistics */}
        <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-6 shadow-lg backdrop-blur-lg">
            <p className="text-sm font-medium text-slate-400">
              Completed Study Sessions
            </p>

            <p className="mt-3 text-4xl font-bold text-indigo-400">
              {stats.completedSessions}
            </p>

            <p className="mt-2 text-xs text-slate-500">
              Total completed sessions
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-6 shadow-lg backdrop-blur-lg">
            <p className="text-sm font-medium text-slate-400">
              Total Study Time
            </p>

            <p className="mt-3 text-4xl font-bold text-emerald-400">
              {formatMinutes(totalFocusSeconds / 60)}
            </p>

            <p className="mt-2 text-xs text-slate-500">
              Time from completed sessions
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-6 shadow-lg backdrop-blur-lg">
            <p className="text-sm font-medium text-slate-400">
              Current Session
            </p>

            <p className="mt-3 truncate text-2xl font-bold text-purple-400">
              {session?.subject || "Not started"}
            </p>

            <p className="mt-2 text-xs text-slate-500">
              {isRunning
                ? "Currently studying"
                : isPaused
                ? "Session paused"
                : "No active session"}
            </p>
          </div>
        </div>

        {/* Session History */}
        <div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-xl backdrop-blur-xl sm:p-8">
          <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white">
                Session History
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                Review your completed study sessions.
              </p>
            </div>

            <button
              onClick={loadSessions}
              disabled={loading}
              className="rounded-xl border border-indigo-400/20 bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-300 transition hover:bg-indigo-500/20 disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "↻ Refresh"}
            </button>
          </div>

          {historyError && (
            <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
              {historyError}
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-slate-400">
              Loading your session history...
            </div>
          ) : completedSessions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 py-12 text-center text-slate-400">
              No completed study sessions yet.
            </div>
          ) : (
            <div className="space-y-4">
              {completedSessions.map((item) => (
                <div
                  key={item._id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                >
                  <div>
                    <p className="font-semibold text-white">
                      {item.subject || "General"}
                    </p>

                    <p className="mt-1 text-sm text-slate-400">
                      {item.startedAt
                        ? formatDate(item.startedAt)
                        : formatDate(item.createdAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
  <div className="rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-semibold text-emerald-300">
    {formatTime(
      item.accumulatedSeconds ||
        Math.round((item.duration || 0) * 60)
    )}
  </div>

  <button
    onClick={() => handleDeleteSession(item._id)}
    disabled={saving}
    className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
  >
    Delete
  </button>
</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
