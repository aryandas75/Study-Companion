import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  getTaskStats,
} from "../services/studyTask.api";

const initialForm = {
  title: "",
  subject: "",
  topic: "",
  description: "",
  dueDate: "",
  dueTime: "23:59",
  priority: "medium",
};

const statusOptions = [
  { value: "pending", label: "Pending" },
  { value: "in-progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

const priorityStyles = {
  low: "bg-blue-100 text-blue-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
};

const inputStyles =
  "w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";

export default function StudyPlanner() {
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
  });

  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);

  const [filters, setFilters] = useState({
    search: "",
    status: "",
    priority: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState("");

  // Load tasks and statistics
  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = {
        limit: 100,
        sort: "dueDate",
        order: "asc",
      };

      if (filters.search.trim()) {
        params.search = filters.search.trim();
      }

      if (filters.status) {
        params.status = filters.status;
      }

      if (filters.priority) {
        params.priority = filters.priority;
      }

      const [taskResponse, statsResponse] = await Promise.all([
        getTasks(params),
        getTaskStats(),
      ]);

      setTasks(
        Array.isArray(taskResponse.tasks)
          ? taskResponse.tasks
          : []
      );

      const taskStats = statsResponse.stats || {};

      setStats({
        total: taskStats.total || 0,
        pending: taskStats.pending || 0,
        inProgress: taskStats.inProgress || 0,
        completed: taskStats.completed || 0,
        overdue: taskStats.overdue || 0,
      });
    } catch (err) {
      console.error("Study Planner loading error:", err);
      setError(err.message || "Unable to load study tasks.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Reload when filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 250);

    return () => clearTimeout(timer);
  }, [loadData]);

  // Handle input changes
  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // Reset form
  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  // Scroll to form
  const scrollToForm = () => {
    document.getElementById("task-form")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  // Create or update task
  const handleSubmit = async (event) => {
    event.preventDefault();

    setSaving(true);
    setError("");

    try {
      if (!form.title.trim()) {
        throw new Error("Please enter a task title.");
      }

      if (!form.subject.trim()) {
        throw new Error("Please enter a subject.");
      }

      if (!form.dueDate) {
        throw new Error("Please select a deadline date.");
      }

      if (!form.dueTime) {
        throw new Error("Please select a deadline time.");
      }

      const parsedDate = new Date(
        `${form.dueDate}T${form.dueTime}`
      );

      if (Number.isNaN(parsedDate.getTime())) {
        throw new Error("Please select a valid deadline.");
      }

      const payload = {
        title: form.title.trim(),
        subject: form.subject.trim(),
        topic: form.topic.trim(),
        description: form.description.trim(),
        priority: form.priority,
        dueDate: parsedDate.toISOString(),
      };

      if (editingId) {
        await updateTask(editingId, payload);
      } else {
        await createTask(payload);
      }

      resetForm();
      await loadData();
    } catch (err) {
      console.error("Save study task error:", err);
      setError(err.message || "Unable to save study task.");
    } finally {
      setSaving(false);
    }
  };

  // Edit task
  const handleEdit = (task) => {
    const date = task.dueDate ? new Date(task.dueDate) : null;

    setEditingId(task._id);

    setForm({
      title: task.title || "",
      subject: task.subject || "",
      topic: task.topic || "",
      description: task.description || "",

      dueDate: date
        ? `${date.getFullYear()}-${String(
            date.getMonth() + 1
          ).padStart(2, "0")}-${String(
            date.getDate()
          ).padStart(2, "0")}`
        : "",

      dueTime: date
        ? `${String(date.getHours()).padStart(
            2,
            "0"
          )}:${String(date.getMinutes()).padStart(2, "0")}`
        : "23:59",

      priority: task.priority || "medium",
    });

    scrollToForm();
  };

  // Change task status
  const handleStatusChange = async (task, status) => {
    setActionLoading(task._id);
    setError("");

    try {
      await updateTask(task._id, { status });
      await loadData();
    } catch (err) {
      console.error("Update task status error:", err);
      setError(err.message || "Unable to update task status.");
    } finally {
      setActionLoading(null);
    }
  };

  // Delete task
  const handleDelete = async (task) => {
    const confirmed = window.confirm(
      `Delete "${task.title}" permanently?`
    );

    if (!confirmed) return;

    setActionLoading(task._id);
    setError("");

    try {
      await deleteTask(task._id);

      if (editingId === task._id) {
        resetForm();
      }

      await loadData();
    } catch (err) {
      console.error("Delete task error:", err);
      setError(err.message || "Unable to delete task.");
    } finally {
      setActionLoading(null);
    }
  };

  // Check overdue status
  const isOverdue = (task) =>
    task.status !== "completed" &&
    new Date(task.dueDate).getTime() < Date.now();

  // Format deadline
  const formatDate = (date) => {
    if (!date) return "No deadline";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "Invalid date";
    }

    return parsedDate.toLocaleString([], {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <header className="mb-8">

          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="mb-6 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-indigo-500/50 hover:bg-slate-800 hover:text-white"
          >
            <span aria-hidden="true">←</span>
            Back to Dashboard
          </button>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-indigo-400">
                Study Companion
              </p>

              <h1 className="text-3xl font-bold sm:text-4xl">
                Study Planner
              </h1>

              <p className="mt-2 text-slate-400">
                Organize your subjects, deadlines and study progress.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                resetForm();
                scrollToForm();
              }}
              className="rounded-xl bg-indigo-500 px-5 py-3 font-semibold transition hover:bg-indigo-400"
            >
              + New Task
            </button>
          </div>
        </header>

        {/* Error message */}
        {error && (
          <div
            role="alert"
            className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300"
          >
            <p>{error}</p>

            <button
              type="button"
              onClick={loadData}
              className="shrink-0 rounded-lg border border-red-400/30 px-3 py-1.5 text-sm hover:bg-red-500/10"
            >
              Retry
            </button>
          </div>
        )}

        {/* Statistics */}
        <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
          {[
            { label: "Total Tasks", value: stats.total },
            { label: "Pending", value: stats.pending },
            { label: "In Progress", value: stats.inProgress },
            { label: "Completed", value: stats.completed },
            { label: "Overdue", value: stats.overdue },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-white/10 bg-slate-900 p-5"
            >
              <p className="text-sm text-slate-400">
                {item.label}
              </p>

              <p className="mt-3 text-3xl font-bold">
                {item.value}
              </p>
            </div>
          ))}
        </section>

        {/* Create/Edit Form */}
        <section
          id="task-form"
          className="mb-8 scroll-mt-6 rounded-2xl border border-white/10 bg-slate-900 p-5 sm:p-7"
        >
          <h2 className="mb-6 text-xl font-bold">
            {editingId ? "Edit Study Task" : "Create Study Task"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">

              {/* Title */}
              <div>
                <label
                  htmlFor="task-title"
                  className="mb-2 block text-sm text-slate-300"
                >
                  Task Title *
                </label>

                <input
                  id="task-title"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  required
                  maxLength={150}
                  placeholder="Complete Control Systems Unit 1"
                  className={inputStyles}
                />
              </div>

              {/* Subject */}
              <div>
                <label
                  htmlFor="task-subject"
                  className="mb-2 block text-sm text-slate-300"
                >
                  Subject *
                </label>

                <input
                  id="task-subject"
                  name="subject"
                  value={form.subject}
                  onChange={handleChange}
                  required
                  maxLength={100}
                  placeholder="Control Systems"
                  className={inputStyles}
                />
              </div>

              {/* Topic */}
              <div>
                <label
                  htmlFor="task-topic"
                  className="mb-2 block text-sm text-slate-300"
                >
                  Topic
                </label>

                <input
                  id="task-topic"
                  name="topic"
                  value={form.topic}
                  onChange={handleChange}
                  placeholder="Open-loop and closed-loop systems"
                  className={inputStyles}
                />
              </div>

              {/* Deadline Date */}
              <div>
                <label
                  htmlFor="task-dueDate"
                  className="mb-2 block text-sm text-slate-300"
                >
                  Deadline Date *
                </label>

                <input
                  id="task-dueDate"
                  type="date"
                  name="dueDate"
                  value={form.dueDate}
                  onChange={handleChange}
                  required
                  className={inputStyles}
                />

                <p className="mt-2 text-xs text-slate-400">
                  Past deadlines are allowed and will be marked overdue.
                </p>
              </div>

              {/* Deadline Time */}
              <div>
                <label
                  htmlFor="task-dueTime"
                  className="mb-2 block text-sm text-slate-300"
                >
                  Deadline Time *
                </label>

                <input
                  id="task-dueTime"
                  type="time"
                  name="dueTime"
                  value={form.dueTime}
                  onChange={handleChange}
                  required
                  className={inputStyles}
                />
              </div>

              {/* Priority */}
              <div>
                <label
                  htmlFor="task-priority"
                  className="mb-2 block text-sm text-slate-300"
                >
                  Priority
                </label>

                <select
                  id="task-priority"
                  name="priority"
                  value={form.priority}
                  onChange={handleChange}
                  className={inputStyles}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="task-description"
                className="mb-2 block text-sm text-slate-300"
              >
                Description
              </label>

              <textarea
                id="task-description"
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                placeholder="What do you want to accomplish?"
                className={inputStyles}
              />
            </div>

            {/* Form Buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-indigo-500 px-6 py-3 font-semibold transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update Task"
                    : "Create Task"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={saving}
                  className="rounded-xl border border-white/15 px-6 py-3 font-semibold hover:bg-white/5"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        {/* Task List */}
        <section>
          <div className="mb-5">
            <h2 className="text-2xl font-bold">Your Tasks</h2>

            <p className="mt-1 text-sm text-slate-400">
              Search, filter and manage your study schedule.
            </p>
          </div>

          {/* Search and Filters */}
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <input
              type="search"
              value={filters.search}
              onChange={(event) =>
                setFilters((previous) => ({
                  ...previous,
                  search: event.target.value,
                }))
              }
              placeholder="Search tasks..."
              className={inputStyles}
            />

            <select
              value={filters.status}
              onChange={(event) =>
                setFilters((previous) => ({
                  ...previous,
                  status: event.target.value,
                }))
              }
              className={inputStyles}
            >
              <option value="">All statuses</option>

              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={filters.priority}
              onChange={(event) =>
                setFilters((previous) => ({
                  ...previous,
                  priority: event.target.value,
                }))
              }
              className={inputStyles}
            >
              <option value="">All priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Loading / Empty / Tasks */}
          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-slate-900 p-10 text-center text-slate-400">
              Loading your study tasks...
            </div>
          ) : tasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-slate-900 p-12 text-center">
              <p className="text-xl font-semibold">No tasks found</p>

              <p className="mt-2 text-slate-400">
                Create a task or change your filters.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {tasks.map((task) => (
                <article
                  key={task._id}
                  className="rounded-2xl border border-white/10 bg-slate-900 p-5 transition hover:border-indigo-500/40"
                >
                  {/* Priority and Status */}
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        priorityStyles[task.priority] ||
                        priorityStyles.medium
                      }`}
                    >
                      {task.priority || "medium"} priority
                    </span>

                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">
                      {statusOptions.find(
                        (option) => option.value === task.status
                      )?.label || task.status}
                    </span>

                    {isOverdue(task) && (
                      <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-400">
                        Overdue
                      </span>
                    )}
                  </div>

                  {/* Task Details */}
                  <h3 className="text-xl font-bold">
                    {task.title}
                  </h3>

                  <p className="mt-1 text-sm text-indigo-300">
                    {task.subject}
                    {task.topic ? ` · ${task.topic}` : ""}
                  </p>

                  {task.description && (
                    <p className="mt-3 whitespace-pre-wrap text-sm text-slate-400">
                      {task.description}
                    </p>
                  )}

                  <p className="mt-4 text-sm text-slate-400">
                    Deadline: {formatDate(task.dueDate)}
                  </p>

                  {/* Task Actions */}
                  <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
                    <select
                      aria-label={`Status for ${task.title}`}
                      value={task.status}
                      disabled={actionLoading === task._id}
                      onChange={(event) =>
                        handleStatusChange(task, event.target.value)
                      }
                      className="min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white disabled:opacity-50"
                    >
                      {statusOptions.map((option) => (
                        <option
                          key={option.value}
                          value={option.value}
                        >
                          {option.label}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      disabled={actionLoading === task._id}
                      onClick={() => handleEdit(task)}
                      className="rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5 disabled:opacity-50"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      disabled={actionLoading === task._id}
                      onClick={() => handleDelete(task)}
                      className="rounded-lg border border-red-500/20 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                    >
                      {actionLoading === task._id ? "Please wait..." : "Delete"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}