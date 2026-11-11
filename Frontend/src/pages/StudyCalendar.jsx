
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getTasks,
  updateTask,
  deleteTask,
} from "../services/studyTask.api";

const statusStyles = {
  pending: {
    label: "Pending",
    color: "text-amber-300",
    bg: "bg-amber-400/10",
    dot: "bg-amber-400",
  },
  "in-progress": {
    label: "In Progress",
    color: "text-blue-300",
    bg: "bg-blue-400/10",
    dot: "bg-blue-400",
  },
  completed: {
    label: "Completed",
    color: "text-emerald-300",
    bg: "bg-emerald-400/10",
    dot: "bg-emerald-400",
  },
};

const priorityStyles = {
  high: "bg-red-400/10 text-red-300 border-red-400/20",
  medium: "bg-amber-400/10 text-amber-300 border-amber-400/20",
  low: "bg-green-400/10 text-green-300 border-green-400/20",
};

const dateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatDate = (date) =>
  date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const formatTime = (date) =>
  date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

const getTaskStatus = (task) => {
  if (task.status === "completed") return "completed";

  if (new Date(task.dueDate).getTime() < Date.now()) {
    return "overdue";
  }

  return task.status || "pending";
};

const isOverdue = (task) =>
  task.status !== "completed" &&
  new Date(task.dueDate).getTime() < Date.now();

function StudyCalendar() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(dateKey(new Date()));
  const [selectedTask, setSelectedTask] = useState(null);

  const [viewMode, setViewMode] = useState("month");

  const [editingTask, setEditingTask] = useState(null);
  const [saving, setSaving] = useState(false);

  const [subjectFilter, setSubjectFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const [editForm, setEditForm] = useState({
    title: "",
    subject: "",
    topic: "",
    description: "",
    dueDate: "",
    priority: "medium",
    status: "pending",
  });

  // Load tasks
  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getTasks({ limit: 100 });

      setTasks(Array.isArray(response.tasks) ? response.tasks : []);
    } catch (err) {
      setError(err.message || "Unable to load study tasks.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Subjects for filtering
  const subjects = useMemo(
    () => [...new Set(tasks.map((task) => task.subject).filter(Boolean))],
    [tasks]
  );

  // Apply filters
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSubject =
        subjectFilter === "all" || task.subject === subjectFilter;

      const matchesPriority =
        priorityFilter === "all" || task.priority === priorityFilter;

      return matchesSubject && matchesPriority;
    });
  }, [tasks, subjectFilter, priorityFilter]);

  // Group tasks by date
  const tasksByDate = useMemo(() => {
    const grouped = {};

    filteredTasks.forEach((task) => {
      if (!task.dueDate) return;

      const key = dateKey(new Date(task.dueDate));

      if (!grouped[key]) grouped[key] = [];

      grouped[key].push(task);
    });

    return grouped;
  }, [filteredTasks]);

  const selectedTasks = tasksByDate[selectedDate] || [];

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarDays = [];

  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  const todayKey = dateKey(new Date());

  // Weekly calendar calculations
  const weekStart = new Date(currentDate);
  weekStart.setDate(currentDate.getDate() - currentDate.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const weekDates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return date;
  });

  const weekEnd = weekDates[6];

  const displayedTitle =
    viewMode === "month"
      ? currentDate.toLocaleDateString("en-IN", {
          month: "long",
          year: "numeric",
        })
      : `${weekStart.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
        })} – ${weekEnd.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}`;

  // Monthly task statistics
  const monthlyTasks = useMemo(() => {
    return filteredTasks.filter((task) => {
      const deadline = new Date(task.dueDate);

      return (
        deadline.getFullYear() === year &&
        deadline.getMonth() === month
      );
    });
  }, [filteredTasks, year, month]);

  const monthlyCompleted = monthlyTasks.filter(
    (task) => task.status === "completed"
  ).length;

  const monthlyCompletion = monthlyTasks.length
    ? Math.round((monthlyCompleted / monthlyTasks.length) * 100)
    : 0;

  // Upcoming tasks
  const upcomingTasks = useMemo(() => {
    const now = new Date();
    const nextWeek = new Date();

    nextWeek.setDate(now.getDate() + 7);

    return filteredTasks
      .filter((task) => {
        const deadline = new Date(task.dueDate);

        return (
          task.status !== "completed" &&
          deadline >= now &&
          deadline <= nextWeek
        );
      })
      .sort(
        (a, b) =>
          new Date(a.dueDate) - new Date(b.dueDate)
      );
  }, [filteredTasks]);

  // Statistics
  const completedTasks = filteredTasks.filter(
    (task) => task.status === "completed"
  ).length;

  const overdueTasks = filteredTasks.filter(isOverdue).length;

  const pendingTasks = filteredTasks.filter(
    (task) => task.status === "pending" && !isOverdue(task)
  ).length;

  const inProgressTasks = filteredTasks.filter(
    (task) => task.status === "in-progress" && !isOverdue(task)
  ).length;

  // Navigate between months or weeks
  const changePeriod = (amount) => {
    if (viewMode === "month") {
      const nextDate = new Date(year, month + amount, 1);
      setCurrentDate(nextDate);
    } else {
      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() + amount * 7);

      setCurrentDate(nextDate);
      setSelectedDate(dateKey(nextDate));
    }

    setSelectedTask(null);
  };

  // Go to today
  const goToToday = () => {
    const today = new Date();

    setCurrentDate(today);
    setSelectedDate(dateKey(today));
    setSelectedTask(null);
  };

  // Select a date in monthly view
  const handleDateClick = (day) => {
    const selected = new Date(year, month, day);

    setSelectedDate(dateKey(selected));
    setSelectedTask(null);
  };

  // Select a date in weekly view
  const handleWeekDateClick = (date) => {
    setSelectedDate(dateKey(date));
    setSelectedTask(null);
  };

  // Open edit form
  const openEditForm = (task) => {
    const deadline = new Date(task.dueDate);

    const localDateTime = new Date(
      deadline.getTime() - deadline.getTimezoneOffset() * 60000
    )
      .toISOString()
      .slice(0, 16);

    setEditForm({
      title: task.title || "",
      subject: task.subject || "",
      topic: task.topic || "",
      description: task.description || "",
      dueDate: localDateTime,
      priority: task.priority || "medium",
      status: task.status || "pending",
    });

    setEditingTask(task);
    setSelectedTask(null);
  };

  // Save edited task
  const handleEditSubmit = async (event) => {
    event.preventDefault();

    if (!editingTask) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      await updateTask(editingTask._id, {
        ...editForm,
        dueDate: new Date(editForm.dueDate).toISOString(),
      });

      setSuccess("Task updated successfully!");
      setEditingTask(null);

      await loadTasks();
    } catch (err) {
      setError(err.message || "Unable to update task.");
    } finally {
      setSaving(false);
    }
  };

  // Mark task as completed
  const handleComplete = async (task) => {
    try {
      setError("");
      setSuccess("");

      await updateTask(task._id, {
        status: "completed",
      });

      setSuccess("Task marked as completed!");
      setSelectedTask(null);

      await loadTasks();
    } catch (err) {
      setError(err.message || "Unable to update task.");
    }
  };

  // Delete task
  const handleDelete = async (task) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${task.title}"?`
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      await deleteTask(task._id);

      setSuccess("Task deleted successfully!");
      setSelectedTask(null);

      await loadTasks();
    } catch (err) {
      setError(err.message || "Unable to delete task.");
    }
  };

  const monthName = currentDate.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  const statCards = [
    {
      title: "Total Tasks",
      value: filteredTasks.length,
      icon: "📚",
      color: "text-cyan-300",
    },
    {
      title: "Completed",
      value: completedTasks,
      icon: "✅",
      color: "text-emerald-300",
    },
    {
      title: "Pending",
      value: pendingTasks,
      icon: "⏳",
      color: "text-amber-300",
    },
    {
      title: "In Progress",
      value: inProgressTasks,
      icon: "🔄",
      color: "text-blue-300",
    },
    {
      title: "Overdue",
      value: overdueTasks,
      icon: "⚠️",
      color: "text-red-300",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-indigo-400">
              STUDY COMPANION
            </p>

            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
              Study Calendar 🗓️
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Manage your study deadlines and track your progress.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/dashboard"
              className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm font-medium text-slate-300 transition hover:border-cyan-400/40 hover:text-white"
            >
              ← Dashboard
            </Link>

            <Link
              to="/study-planner"
              className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm font-medium text-slate-300 transition hover:border-indigo-400/40 hover:text-white"
            >
              Study Planner
            </Link>

            <button
              onClick={loadTasks}
              disabled={loading}
              className="rounded-xl bg-indigo-500 px-4 py-3 text-sm font-semibold transition hover:bg-indigo-400 disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "↻ Refresh"}
            </button>
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <div className="mb-4 flex justify-between rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">
            {error}
            <button onClick={() => setError("")}>✕</button>
          </div>
        )}

        {success && (
          <div className="mb-4 flex justify-between rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-300">
            {success}
            <button onClick={() => setSuccess("")}>✕</button>
          </div>
        )}

        {/* Filters */}
        <section className="mb-8 flex flex-wrap items-end gap-4 rounded-2xl border border-white/10 bg-slate-900 p-5">
          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-400">
              Filter by subject
            </label>

            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-indigo-400"
            >
              <option value="all">All Subjects</option>

              {subjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-400">
              Filter by priority
            </label>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-indigo-400"
            >
              <option value="all">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <button
            onClick={() => {
              setSubjectFilter("all");
              setPriorityFilter("all");
            }}
            className="rounded-xl border border-white/10 px-4 py-3 text-sm text-slate-300 transition hover:bg-white/5"
          >
            Clear Filters
          </button>
        </section>

        {/* Statistics */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {statCards.map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-white/10 bg-slate-900 p-5"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">{card.title}</p>
                <span className="text-xl">{card.icon}</span>
              </div>

              <p className={`mt-4 text-3xl font-bold ${card.color}`}>
                {loading ? "—" : card.value}
              </p>
            </div>
          ))}
        </div>

        {/* Monthly Progress */}
        <section className="mb-8 rounded-2xl border border-white/10 bg-slate-900 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">
                {monthName} Progress
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                {monthlyCompleted} of {monthlyTasks.length} tasks completed.
              </p>
            </div>

            <p className="text-3xl font-bold text-emerald-300">
              {monthlyCompletion}%
            </p>
          </div>

          <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-700"
              style={{ width: `${monthlyCompletion}%` }}
            />
          </div>
        </section>

        {/* Calendar + Upcoming Tasks */}
        <div className="grid gap-6 lg:grid-cols-3">

          {/* Calendar */}
          <section className="rounded-2xl border border-white/10 bg-slate-900 p-5 sm:p-7 lg:col-span-2">

            {/* Calendar Header */}
            <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">
                  {displayedTitle}
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  {viewMode === "month"
                    ? "Monthly overview of your study schedule."
                    : "Your seven-day study schedule."}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">

                {/* View Toggle */}
                <div className="flex rounded-xl border border-white/10 bg-slate-950 p-1">
                  <button
                    onClick={() => setViewMode("month")}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                      viewMode === "month"
                        ? "bg-indigo-500 text-white"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Month
                  </button>

                  <button
                    onClick={() => setViewMode("week")}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                      viewMode === "week"
                        ? "bg-indigo-500 text-white"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Week
                  </button>
                </div>

                <button
                  onClick={() => changePeriod(-1)}
                  className="h-10 w-10 rounded-lg border border-white/10 transition hover:bg-white/10"
                >
                  ←
                </button>

                <button
                  onClick={goToToday}
                  className="rounded-lg border border-indigo-400/30 bg-indigo-400/10 px-3 py-2 text-xs font-semibold text-indigo-300"
                >
                  Today
                </button>

                <button
                  onClick={() => changePeriod(1)}
                  className="h-10 w-10 rounded-lg border border-white/10 transition hover:bg-white/10"
                >
                  →
                </button>
              </div>
            </div>

            {/* MONTH VIEW */}
            {viewMode === "month" && (
              <>
                <div className="mb-3 grid grid-cols-7 gap-2 text-center">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                    (day) => (
                      <div
                        key={day}
                        className="py-2 text-xs font-semibold text-slate-500"
                      >
                        {day}
                      </div>
                    )
                  )}
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {calendarDays.map((day, index) => {
                    if (!day) {
                      return <div key={`empty-${index}`} />;
                    }

                    const key = dateKey(new Date(year, month, day));
                    const dayTasks = tasksByDate[key] || [];

                    const isToday = key === todayKey;
                    const isSelected = key === selectedDate;

                    const hasOverdue = dayTasks.some(isOverdue);

                    const hasPending = dayTasks.some(
                      (task) =>
                        task.status === "pending" && !isOverdue(task)
                    );

                    const hasInProgress = dayTasks.some(
                      (task) =>
                        task.status === "in-progress" && !isOverdue(task)
                    );

                    const hasCompleted = dayTasks.some(
                      (task) => task.status === "completed"
                    );

                    return (
                      <button
                        key={day}
                        onClick={() => handleDateClick(day)}
                        className={`flex min-h-16 flex-col items-center justify-center rounded-xl border p-1 transition sm:min-h-24 ${
                          isSelected
                            ? "border-indigo-400 bg-indigo-500/20"
                            : isToday
                              ? "border-cyan-400/50 bg-cyan-400/5"
                              : "border-white/5 bg-slate-950 hover:border-white/20"
                        }`}
                      >
                        <span className="text-sm font-semibold">
                          {day}
                        </span>

                        {dayTasks.length > 0 && (
                          <span className="mt-1 text-[10px] text-slate-400">
                            {dayTasks.length} tasks
                          </span>
                        )}

                        <div className="mt-1 flex gap-1">
                          {hasOverdue && (
                            <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                          )}

                          {hasPending && (
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                          )}

                          {hasInProgress && (
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                          )}

                          {hasCompleted && (
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* WEEK VIEW */}
            {viewMode === "week" && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {weekDates.map((date) => {
                  const key = dateKey(date);
                  const dayTasks = tasksByDate[key] || [];

                  const isToday = key === todayKey;
                  const isSelected = key === selectedDate;

                  return (
                    <button
                      key={key}
                      onClick={() => handleWeekDateClick(date)}
                      className={`rounded-xl border p-4 text-left transition-all duration-300 ${
                        isSelected
                          ? "border-indigo-400 bg-indigo-500/15 shadow-lg shadow-indigo-950/30"
                          : isToday
                            ? "border-cyan-400/40 bg-cyan-400/5"
                            : "border-white/5 bg-slate-950 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">

                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-12 w-12 flex-col items-center justify-center rounded-xl ${
                              isToday
                                ? "bg-cyan-400/10 text-cyan-300"
                                : "bg-white/5 text-white"
                            }`}
                          >
                            <span className="text-lg font-bold">
                              {date.getDate()}
                            </span>
                          </div>

                          <div>
                            <p className="font-semibold">
                              {date.toLocaleDateString("en-IN", {
                                weekday: "long",
                              })}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {date.toLocaleDateString("en-IN", {
                                month: "long",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-lg font-bold text-indigo-300">
                            {dayTasks.length}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            Tasks
                          </p>
                        </div>
                      </div>

                      {dayTasks.length > 0 ? (
                        <div className="mt-4 space-y-2">
                          {dayTasks.slice(0, 3).map((task) => (
                            <div
                              key={task._id}
                              className="flex items-center justify-between gap-2 rounded-lg bg-white/[0.04] px-3 py-2"
                            >
                              <div className="flex min-w-0 items-center gap-2">
                                <span
                                  className={`h-2 w-2 shrink-0 rounded-full ${
                                    isOverdue(task)
                                      ? "bg-red-400"
                                      : statusStyles[task.status]?.dot ||
                                        "bg-amber-400"
                                  }`}
                                />

                                <span className="truncate text-xs text-slate-300">
                                  {task.title}
                                </span>
                              </div>

                              <span className="shrink-0 text-[10px] text-slate-500">
                                {formatTime(new Date(task.dueDate))}
                              </span>
                            </div>
                          ))}

                          {dayTasks.length > 3 && (
                            <p className="pl-3 text-xs text-indigo-300">
                              +{dayTasks.length - 3} more tasks
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="mt-4 rounded-lg bg-white/[0.02] px-3 py-3 text-center text-xs text-slate-600">
                          No tasks scheduled
                        </p>
                      )}

                      {isToday && (
                        <span className="mt-3 inline-block rounded-full bg-cyan-400/10 px-2.5 py-1 text-[10px] font-semibold text-cyan-300">
                          TODAY
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Calendar Legend */}
            <div className="mt-6 flex flex-wrap gap-4 border-t border-white/10 pt-5">
              {[
                ["bg-amber-400", "Pending"],
                ["bg-blue-400", "In Progress"],
                ["bg-emerald-400", "Completed"],
                ["bg-red-400", "Overdue"],
              ].map(([color, label]) => (
                <div
                  key={label}
                  className="flex items-center gap-2 text-xs text-slate-400"
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
                  {label}
                </div>
              ))}
            </div>
          </section>

          {/* Upcoming Deadlines */}
          <section className="relative overflow-hidden rounded-2xl border border-indigo-400/20 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/50 p-5 sm:p-6">

            <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl" />

            {/* Header */}
            <div className="relative mb-7 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-400/20 bg-indigo-400/10 text-xl">
                  📅
                </span>

                <div>
                  <h2 className="text-xl font-bold tracking-tight">
                    Upcoming Deadlines
                  </h2>

                  <p className="mt-1 text-xs text-slate-400">
                    Stay ahead of your study goals.
                  </p>
                </div>
              </div>

              <span className="rounded-full border border-indigo-400/20 bg-indigo-400/10 px-3 py-1.5 text-xs font-semibold text-indigo-300">
                Next 7 days
              </span>
            </div>

            {/* Deadline count */}
            <div className="relative mb-5 flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3">
              <div>
                <p className="text-xs text-slate-400">
                  Pending deadlines
                </p>

                <p className="mt-1 text-2xl font-bold text-white">
                  {upcomingTasks.length}

                  <span className="ml-2 text-xs font-normal text-slate-500">
                    tasks to complete
                  </span>
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-500/10 text-xl">
                🎯
              </div>
            </div>

            {/* Deadline cards */}
            <div className="relative max-h-[430px] space-y-3 overflow-y-auto pr-1">

              {loading ? (
                <div className="rounded-xl border border-white/5 bg-slate-950/60 p-6 text-center">
                  <p className="text-sm text-slate-400">
                    Loading your deadlines...
                  </p>
                </div>
              ) : upcomingTasks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-emerald-400/20 bg-emerald-400/[0.04] px-5 py-10 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400/10 text-3xl">
                    🎉
                  </div>

                  <h3 className="mt-4 font-semibold text-emerald-300">
                    You're all caught up!
                  </h3>

                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    No upcoming deadlines for the next seven days.
                    Enjoy your progress!
                  </p>
                </div>
              ) : (
                upcomingTasks.map((task) => {
                  const deadline = new Date(task.dueDate);
                  const today = new Date();

                  const todayStart = new Date(
                    today.getFullYear(),
                    today.getMonth(),
                    today.getDate()
                  );

                  const deadlineStart = new Date(
                    deadline.getFullYear(),
                    deadline.getMonth(),
                    deadline.getDate()
                  );

                  const daysLeft = Math.round(
                    (deadlineStart - todayStart) /
                      (1000 * 60 * 60 * 24)
                  );

                  const countdown =
                    daysLeft === 0
                      ? "Today"
                      : daysLeft === 1
                        ? "Tomorrow"
                        : `In ${daysLeft} days`;

                  const urgency =
                    daysLeft === 0
                      ? {
                          color: "text-red-300",
                          bg: "bg-red-400/10",
                          border: "border-red-400/30",
                          dot: "bg-red-400",
                        }
                      : daysLeft <= 2
                        ? {
                            color: "text-amber-300",
                            bg: "bg-amber-400/10",
                            border: "border-amber-400/20",
                            dot: "bg-amber-400",
                          }
                        : {
                            color: "text-cyan-300",
                            bg: "bg-cyan-400/10",
                            border: "border-cyan-400/20",
                            dot: "bg-cyan-400",
                          };

                  const priorityColor =
                    task.priority === "high"
                      ? "text-red-300"
                      : task.priority === "medium"
                        ? "text-amber-300"
                        : "text-emerald-300";

                  return (
                    <button
                      key={task._id}
                      onClick={() => {
                        setSelectedDate(dateKey(deadline));
                        setSelectedTask(task);
                        setCurrentDate(deadline);
                      }}
                      className={`group w-full rounded-xl border ${urgency.border} bg-slate-950/80 p-4 text-left transition-all duration-300 hover:-translate-y-1 hover:bg-slate-900 hover:shadow-lg hover:shadow-indigo-950/40`}
                    >
                      <div className="flex gap-3">

                        <div className="flex h-[68px] w-[62px] shrink-0 flex-col items-center justify-center rounded-xl border border-white/5 bg-white/[0.04]">
                          <span className="text-2xl font-bold text-white">
                            {deadline.getDate()}
                          </span>

                          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            {deadline.toLocaleDateString("en-IN", {
                              month: "short",
                            })}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="truncate font-semibold text-white transition group-hover:text-indigo-300">
                              {task.title}
                            </h3>

                            <span
                              className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${urgency.bg} ${urgency.color}`}
                            >
                              {countdown}
                            </span>
                          </div>

                          <p className="mt-1 truncate text-xs text-slate-400">
                            📖 {task.subject}
                          </p>

                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs text-slate-500">
                              🕒 {formatTime(deadline)}
                            </span>

                            <span
                              className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase ${priorityColor}`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${urgency.dot}`}
                              />

                              {task.priority || "Medium"} Priority
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <Link
              to="/study-planner"
              className="group relative mt-5 flex items-center justify-center gap-2 overflow-hidden rounded-xl border border-indigo-400/20 bg-indigo-500/10 px-4 py-3.5 text-sm font-semibold text-indigo-300 transition-all duration-300 hover:border-indigo-400/40 hover:bg-indigo-500/20"
            >
              <span>Manage all tasks</span>

              <span className="transition-transform duration-300 group-hover:translate-x-1">
                →
              </span>
            </Link>
          </section>
        </div>

        {/* Selected Date Tasks */}
        <section className="mt-8 rounded-2xl border border-white/10 bg-slate-900 p-5 sm:p-7">
          <div className="mb-6">
            <h2 className="text-xl font-bold">
              Tasks for{" "}
              {formatDate(new Date(`${selectedDate}T00:00:00`))}
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              {selectedTasks.length} tasks scheduled.
            </p>
          </div>

          {selectedTasks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 py-10 text-center">
              <span className="text-3xl">📭</span>

              <p className="mt-3 text-sm text-slate-400">
                No tasks scheduled for this date.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {selectedTasks.map((task) => {
                const status = getTaskStatus(task);

                return (
                  <div
                    key={task._id}
                    className="rounded-xl border border-white/10 bg-slate-950 p-5"
                  >
                    <button
                      onClick={() => setSelectedTask(task)}
                      className="w-full text-left"
                    >
                      <h3 className="font-semibold">{task.title}</h3>

                      <p className="mt-2 text-sm text-slate-400">
                        {task.subject}
                      </p>

                      <p className="mt-2 text-xs text-cyan-300">
                        🕒 {formatTime(new Date(task.dueDate))}
                      </p>
                    </button>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          status === "overdue"
                            ? "bg-red-400/10 text-red-300"
                            : statusStyles[status]?.bg
                        }`}
                      >
                        {status === "overdue"
                          ? "Overdue"
                          : statusStyles[status]?.label}
                      </span>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                          priorityStyles[task.priority] ||
                          priorityStyles.medium
                        }`}
                      >
                        {task.priority || "medium"}
                      </span>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <button
                        onClick={() => openEditForm(task)}
                        className="flex-1 rounded-lg border border-indigo-400/20 bg-indigo-400/10 px-3 py-2 text-xs font-semibold text-indigo-300 hover:bg-indigo-400/20"
                      >
                        ✏️ Edit
                      </button>

                      {task.status !== "completed" && (
                        <button
                          onClick={() => handleComplete(task)}
                          className="flex-1 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-400/20"
                        >
                          ✓ Complete
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(task)}
                        className="rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-400/20"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Task Details Modal */}
        {selectedTask && !editingTask && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={() => setSelectedTask(null)}
          >
            <div
              className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-6"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex justify-between gap-4">
                <h2 className="text-2xl font-bold">
                  {selectedTask.title}
                </h2>

                <button
                  onClick={() => setSelectedTask(null)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="mt-6 space-y-4 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Subject</p>
                  <p className="mt-1">
                    {selectedTask.subject || "N/A"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Topic</p>
                  <p className="mt-1">
                    {selectedTask.topic || "N/A"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Description</p>
                  <p className="mt-1 text-slate-300">
                    {selectedTask.description || "No description."}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Deadline</p>
                  <p className="mt-1 text-cyan-300">
                    {formatDate(new Date(selectedTask.dueDate))} at{" "}
                    {formatTime(new Date(selectedTask.dueDate))}
                  </p>
                </div>
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  onClick={() => openEditForm(selectedTask)}
                  className="flex-1 rounded-xl bg-indigo-500 px-4 py-3 text-sm font-semibold hover:bg-indigo-400"
                >
                  Edit Task
                </button>

                <button
                  onClick={() => handleComplete(selectedTask)}
                  disabled={selectedTask.status === "completed"}
                  className="flex-1 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-40"
                >
                  Mark Completed
                </button>
              </div>

              <button
                onClick={() => handleDelete(selectedTask)}
                className="mt-3 w-full rounded-xl bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300 hover:bg-red-500/20"
              >
                Delete Task
              </button>
            </div>
          </div>
        )}

        {/* Edit Task Modal */}
        {editingTask && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
            onClick={() => !saving && setEditingTask(null)}
          >
            <form
              onSubmit={handleEditSubmit}
              onClick={(event) => event.stopPropagation()}
              className="my-auto w-full max-w-xl rounded-2xl border border-white/10 bg-slate-900 p-6"
            >
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold">
                  Edit Study Task
                </h2>

                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  disabled={saving}
                  className="text-slate-400 hover:text-white disabled:opacity-50"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm text-slate-400">
                    Task Title
                  </label>

                  <input
                    required
                    value={editForm.title}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        title: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-400"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm text-slate-400">
                      Subject
                    </label>

                    <input
                      required
                      value={editForm.subject}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          subject: e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-400"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-slate-400">
                      Topic
                    </label>

                    <input
                      value={editForm.topic}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          topic: e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-400">
                    Description
                  </label>

                  <textarea
                    rows="3"
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        description: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-400">
                    Deadline
                  </label>

                  <input
                    type="datetime-local"
                    required
                    value={editForm.dueDate}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        dueDate: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-400"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm text-slate-400">
                      Priority
                    </label>

                    <select
                      value={editForm.priority}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          priority: e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-400"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-slate-400">
                      Status
                    </label>

                    <select
                      value={editForm.status}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          status: e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-indigo-400"
                    >
                      <option value="pending">Pending</option>
                      <option value="in-progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-7 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  disabled={saving}
                  className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-300 hover:bg-white/5 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        )}

        <footer className="mt-10 border-t border-white/10 py-6 text-center text-xs text-slate-500">
          Study Companion · Stay organized. Stay consistent. Keep learning.
        </footer>
      </div>
    </div>
  );
}

export default StudyCalendar;
