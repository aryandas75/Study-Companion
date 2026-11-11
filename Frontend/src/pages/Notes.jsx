
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#0b1020] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/10";

function Notes() {
  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [subject, setSubject] = useState("");
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingId, setEditingId] = useState(null);

  const loadNotes = async () => {
    try {
      setError("");
      const data = await api("/notes");
      setNotes(Array.isArray(data) ? data : data.notes || []);
    } catch (err) {
      setError(err.message || "Unable to load notes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, []);

  const subjects = useMemo(
    () =>
      [
        ...new Set(
          notes.map((note) => note.subject?.trim()).filter(Boolean)
        ),
      ].sort((a, b) => a.localeCompare(b)),
    [notes]
  );

  const filteredNotes = useMemo(() => {
    const query = search.trim().toLowerCase();

    return notes.filter((note) => {
      const searchableText = [
        note.title,
        note.subject,
        note.content,
        note.body,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchableText.includes(query);
      const matchesSubject =
        subjectFilter === "all" || note.subject === subjectFilter;

      return matchesSearch && matchesSubject;
    });
  }, [notes, search, subjectFilter]);

  const resetForm = () => {
    setTitle("");
    setContent("");
    setSubject("");
    setEditingId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!title.trim() || !content.trim()) {
      setError("Please enter both a title and note content.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        title: title.trim(),
        content: content.trim(),
        subject: subject.trim(),
      };

      if (editingId) {
        await api(`/notes/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await api("/notes", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      resetForm();
      setSuccess(
        editingId
          ? "Your note was updated successfully."
          : "Your note was saved successfully."
      );

      await loadNotes();
    } catch (err) {
      setError(err.message || "Unable to save note.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (note) => {
    setEditingId(note._id);
    setTitle(note.title || "");
    setContent(note.content || note.body || "");
    setSubject(note.subject || "");
    setError("");
    setSuccess("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this note permanently?")) return;

    setError("");
    setSuccess("");
    setDeletingId(id);

    try {
      await api(`/notes/${id}`, { method: "DELETE" });

      setNotes((previous) =>
        previous.filter((note) => note._id !== id)
      );

      if (editingId === id) resetForm();

      setSuccess("Note deleted successfully.");
    } catch (err) {
      setError(err.message || "Unable to delete note.");
    } finally {
      setDeletingId("");
    }
  };

  const clearFilters = () => {
    setSearch("");
    setSubjectFilter("all");
  };

  const hasFilters = search !== "" || subjectFilter !== "all";

  const totalWords = notes.reduce((total, note) => {
    const text = note.content || note.body || "";
    return total + (text.trim() ? text.trim().split(/\s+/).length : 0);
  }, 0);

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#050816]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <Link
            to="/dashboard"
            className="flex items-center gap-3 font-bold transition hover:text-purple-300"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-purple-400/20 bg-purple-400/10 text-xl">
              📝
            </span>
            Study Companion
          </Link>

          <Link
            to="/dashboard"
            className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:border-purple-400/30 hover:text-purple-300"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-9 sm:py-12">
        <section className="relative mb-9 overflow-hidden rounded-3xl border border-purple-400/15 bg-gradient-to-br from-purple-500/10 via-blue-500/[0.06] to-cyan-500/10 p-6 sm:p-9">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-purple-400/10 blur-3xl" />

          <div className="relative">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-purple-300">
              Your personal notebook
            </p>

            <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
              My Notes <span className="ml-1">📝</span>
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
              Capture important concepts, formulas, and ideas in one place.
              Keep your revision notes organized and easy to find.
            </p>

            <div className="mt-7 grid grid-cols-2 gap-3 sm:max-w-lg">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-2xl font-bold">{notes.length}</p>
                <p className="mt-1 text-xs text-slate-400">Saved notes</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-2xl font-bold">{totalWords.toLocaleString()}</p>
                <p className="mt-1 text-xs text-slate-400">Words written</p>
              </div>
            </div>
          </div>
        </section>

        {(error || success) && (
          <div
            role="status"
            className={`mb-6 flex items-start justify-between gap-4 rounded-xl border p-4 text-sm ${
              error
                ? "border-red-400/20 bg-red-400/10 text-red-300"
                : "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
            }`}
          >
            <span>{error || success}</span>
            <button
              type="button"
              onClick={() => {
                setError("");
                setSuccess("");
              }}
              aria-label="Dismiss message"
              className="font-bold"
            >
              ✕
            </button>
          </div>
        )}

        <section
          id="note-editor"
          className="mb-10 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-7"
        >
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-400/10 text-xl">
              {editingId ? "✏️" : "📓"}
            </span>

            <div>
              <h2 className="text-xl font-semibold">
                {editingId ? "Edit your note" : "Create a new note"}
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                {editingId
                  ? "Make your changes and save them."
                  : "Write down what you want to remember."}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="note-title"
                  className="mb-2 block text-sm text-slate-300"
                >
                  Title <span className="text-purple-300">*</span>
                </label>
                <input
                  id="note-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  maxLength={150}
                  placeholder="e.g. Important exam concepts"
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="note-subject"
                  className="mb-2 block text-sm text-slate-300"
                >
                  Subject
                </label>
                <input
                  id="note-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={100}
                  placeholder="e.g. Control Systems"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="note-content"
                className="mb-2 block text-sm text-slate-300"
              >
                Note content <span className="text-purple-300">*</span>
              </label>
              <textarea
                id="note-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                maxLength={30000}
                rows={7}
                placeholder="Write your important concepts, formulas, examples, and ideas..."
                className={`${inputClass} resize-y leading-7`}
              />
              <p className="mt-2 text-right text-xs text-slate-500">
                {content.length.toLocaleString()} / 30,000 characters
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-gradient-to-r from-purple-500 to-blue-600 px-6 py-3 font-semibold shadow-lg shadow-purple-950/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update note"
                    : "+ Save note"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-white/10 px-6 py-3 text-slate-300 transition hover:bg-white/5"
                >
                  Cancel editing
                </button>
              )}
            </div>
          </form>
        </section>

        <section>
          <div className="mb-5">
            <h2 className="text-xl font-bold">Your notebook</h2>
            <p className="mt-1 text-sm text-slate-400">
              Find, review, and update your saved notes.
            </p>
          </div>

          <div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px_auto]">
              <div>
                <label htmlFor="note-search" className="sr-only">
                  Search notes
                </label>
                <input
                  id="note-search"
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="⌕  Search title, subject, or content..."
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="note-subject-filter" className="sr-only">
                  Filter by subject
                </label>
                <select
                  id="note-subject-filter"
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value)}
                  className={inputClass}
                >
                  <option value="all">All subjects</option>
                  {subjects.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={clearFilters}
                disabled={!hasFilters}
                className="rounded-xl border border-white/10 px-4 py-3 text-sm text-slate-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Clear filters
              </button>
            </div>

            <p className="mt-3 text-xs text-slate-500">
              Showing {filteredNotes.length} of {notes.length} notes
            </p>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-white/10 p-12 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-purple-400" />
              <p className="mt-4 text-sm text-slate-400">Loading your notes...</p>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center">
              <div className="text-4xl">
                {notes.length === 0 ? "📓" : "🔎"}
              </div>
              <h3 className="mt-4 text-lg font-semibold">
                {notes.length === 0 ? "Your notebook is empty" : "No matching notes"}
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-400">
                {notes.length === 0
                  ? "Create your first note using the editor above."
                  : "Try another search term or change the subject filter."}
              </p>
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-5 rounded-lg border border-purple-400/20 px-4 py-2 text-sm text-purple-300 transition hover:bg-purple-400/10"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredNotes.map((note) => {
                const noteContent = note.content || note.body || "";

                return (
                  <article
                    key={note._id}
                    className="group flex min-w-0 flex-col rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-5 transition duration-200 hover:-translate-y-0.5 hover:border-purple-400/30 hover:shadow-xl hover:shadow-purple-950/10"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="rounded-full border border-purple-400/15 bg-purple-400/10 px-3 py-1 text-xs text-purple-300">
                        {note.subject || "General"}
                      </span>
                      <span className="text-lg" aria-hidden="true">📝</span>
                    </div>

                    <h3 className="mt-4 break-words text-lg font-semibold transition group-hover:text-purple-200">
                      {note.title || "Untitled note"}
                    </h3>

                    <p className="mt-3 line-clamp-6 flex-1 whitespace-pre-wrap break-words text-sm leading-7 text-slate-400">
                      {noteContent || "This note has no content yet."}
                    </p>

                    {note.createdAt && (
                      <p className="mt-4 text-xs text-slate-500">
                        Created{" "}
                        {new Date(note.createdAt).toLocaleDateString()}
                      </p>
                    )}

                    <div className="mt-5 flex items-center gap-3 border-t border-white/10 pt-4">
                      <button
                        type="button"
                        onClick={() => handleEdit(note)}
                        className="rounded-lg border border-cyan-400/20 px-3 py-2 text-sm font-medium text-cyan-300 transition hover:bg-cyan-400/10"
                      >
                        Edit note
                      </button>

                      <button
                        type="button"
                        disabled={deletingId === note._id}
                        onClick={() => handleDelete(note._id)}
                        className="ml-auto rounded-lg px-3 py-2 text-sm text-red-400 transition hover:bg-red-400/10 hover:text-red-300 disabled:opacity-50"
                      >
                        {deletingId === note._id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <footer className="mt-12 border-t border-white/10 pt-6 text-center text-xs text-slate-500">
          Write it down. Understand it better. Remember it longer.
        </footer>
      </main>
    </div>
  );
}

export default Notes;
