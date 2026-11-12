import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import html2pdf from "html2pdf.js";
import api from "../services/api";

const API_BASE = (
  import.meta.env.VITE_API_URL || "http://localhost:3000/api"
).replace(/\/api\/?$/, "");

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#0b1020] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/10";

function getFileName(material) {
  const originalName = material.originalName?.trim();

  if (originalName) return originalName;

  const title = material.title?.trim() || "study-material";
  const type = material.materialType?.toLowerCase();

  if (/\.[a-z0-9]{2,5}$/i.test(title)) return title;
  if (type === "pdf") return `${title}.pdf`;
  if (type === "image") return `${title}.jpg`;
  if (type === "document") return `${title}.docx`;

  return title;
}

async function openOrDownloadFile(material, download, setError) {
  let objectUrl = "";

  try {
    const endpoint = `${API_BASE}/api/study-materials/${material._id}/file${
      download ? "?download=true" : ""
    }`;

    const response = await fetch(endpoint, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || "Unable to retrieve file.");
    }

    const blob = await response.blob();
    objectUrl = URL.createObjectURL(blob);

    if (download) {
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = getFileName(material);
      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
      return;
    }

    const newTab = window.open(objectUrl, "_blank");

    if (newTab) {
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    } else {
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = getFileName(material);
      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    }
  } catch (err) {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    setError(err.message || "Unable to open file.");
  }
}

function StudyMaterials() {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [summarizingId, setSummarizingId] = useState("");
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const [summaryLength, setSummaryLength] = useState("medium");
  const [summaryData, setSummaryData] = useState(null);

  const summaryContentRef = useRef(null);

  const [form, setForm] = useState({
    title: "",
    subject: "",
    description: "",
    materialType: "pdf",
    file: null,
  });

  // LOAD STUDY MATERIALS

  const loadMaterials = async () => {
    try {
      setError("");

      const data = await api("/study-materials");

      setMaterials(
        Array.isArray(data)
          ? data
          : data.materials || data.studyMaterials || []
      );
    } catch (err) {
      setError(err.message || "Unable to load study materials.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMaterials();
  }, []);

  // SUBJECT FILTER OPTIONS

  const subjects = useMemo(
    () =>
      [
        ...new Set(
          materials.map((item) => item.subject?.trim()).filter(Boolean)
        ),
      ].sort((a, b) => a.localeCompare(b)),
    [materials]
  );

  // SEARCH AND FILTER

  const filteredMaterials = useMemo(() => {
    const query = search.trim().toLowerCase();

    return materials.filter((material) => {
      const searchableText = [
        material.title,
        material.subject,
        material.description,
        material.originalName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchableText.includes(query);

      const matchesSubject =
        subjectFilter === "all" || material.subject === subjectFilter;

      const matchesType =
        typeFilter === "all" ||
        (material.materialType || "other").toLowerCase() === typeFilter;

      return matchesSearch && matchesSubject && matchesType;
    });
  }, [materials, search, subjectFilter, typeFilter]);

  // UPDATE FORM

  const updateForm = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  // UPLOAD MATERIAL

  const handleUpload = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!form.title.trim() || !form.subject.trim()) {
      setError("Please enter a title and subject.");
      return;
    }

    if (form.file && form.file.size > 10 * 1024 * 1024) {
      setError("File size must be 10 MB or less.");
      return;
    }

    if (
      form.file &&
      ![
        "application/pdf",
        "text/plain",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ].includes(form.file.type)
    ) {
      setError("Please upload a PDF, TXT, or DOCX file.");
      return;
    }

    try {
      setUploading(true);

      const body = new FormData();

      body.append("title", form.title.trim());
      body.append("subject", form.subject.trim());
      body.append("description", form.description.trim());
      body.append("materialType", form.materialType);

      if (form.file) {
        body.append("file", form.file);
      }

      await api("/study-materials", {
        method: "POST",
        body,
      });

      setForm({
        title: "",
        subject: "",
        description: "",
        materialType: "pdf",
        file: null,
      });

      event.target.reset();

      setSuccess("Study material added successfully.");

      await loadMaterials();
    } catch (err) {
      setError(err.message || "Unable to upload material.");
    } finally {
      setUploading(false);
    }
  };

  // SUMMARIZE STUDY MATERIAL USING GEMINI

  const handleSummarize = async (material) => {
    setError("");
    setSuccess("");
    setSummaryData(null);
    setSummarizingId(material._id);

    try {
      const data = await api(`/ai/summarize/${material._id}`, {
        method: "POST",
        body: JSON.stringify({
          length: summaryLength,
        }),
      });

      if (!data.success || !data.summary) {
        throw new Error(data.message || "Unable to generate summary.");
      }

      setSummaryData({
        title: data.title || material.title,
        subject: data.subject || material.subject,
        summary: data.summary,
        chatId: data.chatId,
        truncated: data.truncated,
      });

      setSuccess("AI summary generated successfully.");
    } catch (err) {
      setError(err.message || "Unable to summarize material.");
    } finally {
      setSummarizingId("");
    }
  };

  // DOWNLOAD SUMMARY AS PDF

const handleDownloadPDF = async () => {
  if (!summaryContentRef.current) {
    alert("Summary content not found!");
    return;
  }

  try {
    setDownloadingPDF(true);

    const element = summaryContentRef.current;

    // Create a temporary clone for PDF generation
    const clone = element.cloneNode(true);

    clone.style.backgroundColor = "#0f172a";
    clone.style.color = "#f1f5f9";
    clone.style.padding = "30px";
    clone.style.width = "750px";

    // Replace unsupported modern CSS colors
    const allElements = [
      clone,
      ...clone.querySelectorAll("*"),
    ];

    allElements.forEach((el) => {
      el.style.color = "#f1f5f9";
      el.style.backgroundColor = "transparent";
      el.style.borderColor = "#475569";
    });

    clone.style.backgroundColor = "#0f172a";

    // Add clone outside the visible screen
    clone.style.position = "fixed";
    clone.style.left = "-10000px";
    clone.style.top = "0";
    document.body.appendChild(clone);

    const options = {
      margin: 10,
      filename: `${summaryData.title || "study-summary"}.pdf`,
      image: {
        type: "jpeg",
        quality: 0.98,
      },
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: "#0f172a",
      },
      jsPDF: {
        unit: "mm",
        format: "a4",
        orientation: "portrait",
      },
      pagebreak: {
        mode: ["css", "legacy"],
      },
    };

    await html2pdf()
      .set(options)
      .from(clone)
      .save();

    document.body.removeChild(clone);

  } catch (error) {
    console.error("PDF download error:", error);
    alert("Unable to download PDF. Please try again.");
  } finally {
    setDownloadingPDF(false);
  }
};
  

  // DELETE MATERIAL

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this material?")) {
      return;
    }

    setError("");
    setSuccess("");
    setDeletingId(id);

    try {
      await api(`/study-materials/${id}`, {
        method: "DELETE",
      });

      setMaterials((previous) =>
        previous.filter((material) => material._id !== id)
      );

      setSuccess("Material deleted successfully.");
    } catch (err) {
      setError(err.message || "Unable to delete material.");
    } finally {
      setDeletingId("");
    }
  };

  // RESET FILTERS

  const resetFilters = () => {
    setSearch("");
    setSubjectFilter("all");
    setTypeFilter("all");
  };

  const hasActiveFilters =
    search !== "" || subjectFilter !== "all" || typeFilter !== "all";

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      {/* HEADER */}

      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#050816]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <Link
            to="/dashboard"
            className="flex items-center gap-3 font-bold transition hover:text-cyan-300"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-xl">
              📚
            </span>

            <span>Study Companion</span>
          </Link>

          <Link
            to="/dashboard"
            className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:border-cyan-400/30 hover:text-cyan-300"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-9 sm:py-12">
        {/* HERO SECTION */}

        <section className="relative mb-9 overflow-hidden rounded-3xl border border-cyan-400/15 bg-gradient-to-br from-cyan-500/10 via-blue-500/[0.06] to-purple-500/10 p-6 sm:p-9">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-300">
              Your learning library
            </p>

            <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
              Study Materials
              <span className="ml-2">📚</span>
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
              Keep your notes and resources organized. Upload new materials,
              search your library, and access your files whenever you need them.
            </p>

            <div className="mt-7 grid grid-cols-2 gap-3 sm:max-w-lg">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-2xl font-bold">{materials.length}</p>
                <p className="mt-1 text-xs text-slate-400">Total materials</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-2xl font-bold">{subjects.length}</p>
                <p className="mt-1 text-xs text-slate-400">Subjects covered</p>
              </div>
            </div>
          </div>
        </section>

        {/* ERROR AND SUCCESS MESSAGES */}

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
              className="font-bold"
              aria-label="Dismiss message"
            >
              ✕
            </button>
          </div>
        )}

        <div className="grid items-start gap-8 lg:grid-cols-[350px_minmax(0,1fr)]">
          {/* UPLOAD FORM */}

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-xl">
                ⬆️
              </span>

              <div>
                <h2 className="font-semibold">Add new material</h2>
                <p className="mt-1 text-xs text-slate-400">
                  Add to your personal library
                </p>
              </div>
            </div>

            <form onSubmit={handleUpload} className="mt-6 space-y-5">
              <div>
                <label
                  htmlFor="title"
                  className="mb-2 block text-sm text-slate-300"
                >
                  Title <span className="text-cyan-400">*</span>
                </label>

                <input
                  id="title"
                  required
                  maxLength={150}
                  value={form.title}
                  onChange={(e) => updateForm("title", e.target.value)}
                  placeholder="e.g. Digital Electronics Notes"
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="subject"
                  className="mb-2 block text-sm text-slate-300"
                >
                  Subject <span className="text-cyan-400">*</span>
                </label>

                <input
                  id="subject"
                  required
                  maxLength={100}
                  value={form.subject}
                  onChange={(e) => updateForm("subject", e.target.value)}
                  placeholder="e.g. Electronics"
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="mb-2 block text-sm text-slate-300"
                >
                  Description
                </label>

                <textarea
                  id="description"
                  rows={3}
                  maxLength={1000}
                  value={form.description}
                  onChange={(e) => updateForm("description", e.target.value)}
                  placeholder="What is this material about?"
                  className={`${inputClass} resize-y`}
                />
              </div>

              <div>
                <label
                  htmlFor="materialType"
                  className="mb-2 block text-sm text-slate-300"
                >
                  Material type
                </label>

                <select
                  id="materialType"
                  value={form.materialType}
                  onChange={(e) => updateForm("materialType", e.target.value)}
                  className={inputClass}
                >
                  <option value="pdf">PDF</option>
                  <option value="document">Document</option>
                  <option value="image">Image</option>
                  <option value="link">Link</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="file"
                  className="mb-2 block text-sm text-slate-300"
                >
                  Upload file <span className="text-slate-500">(optional)</span>
                </label>

                <input
                  id="file"
                  type="file"
                  accept=".pdf,.txt,.docx"
                  onChange={(e) =>
                    updateForm("file", e.target.files?.[0] || null)
                  }
                  className="w-full text-sm text-slate-400 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-cyan-400/10 file:px-3 file:py-2 file:text-cyan-300 hover:file:bg-cyan-400/20"
                />

                {form.file && (
                  <p className="mt-2 break-all text-xs text-cyan-300">
                    Selected: {form.file.name}
                  </p>
                )}

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  PDF, TXT, or DOCX · Maximum 10 MB
                </p>
              </div>

              <button
                type="submit"
                disabled={uploading}
                className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 font-semibold shadow-lg shadow-cyan-950/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {uploading ? "Uploading material..." : "+ Add material"}
              </button>
            </form>
          </section>

          {/* MATERIAL LIBRARY */}

          <section className="min-w-0">
            <div className="mb-5">
              <h2 className="text-xl font-bold">Your library</h2>
              <p className="mt-1 text-sm text-slate-400">
                Search and filter your saved resources.
              </p>
            </div>

            {/* SEARCH AND FILTERS */}

            <div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="md:col-span-3">
                  <label htmlFor="materialSearch" className="sr-only">
                    Search materials
                  </label>

                  <input
                    id="materialSearch"
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="⌕ Search by title, subject, or description..."
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="subjectFilter"
                    className="mb-2 block text-xs text-slate-400"
                  >
                    Subject
                  </label>

                  <select
                    id="subjectFilter"
                    value={subjectFilter}
                    onChange={(e) => setSubjectFilter(e.target.value)}
                    className={inputClass}
                  >
                    <option value="all">All subjects</option>

                    {subjects.map((subject) => (
                      <option key={subject} value={subject}>
                        {subject}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="typeFilter"
                    className="mb-2 block text-xs text-slate-400"
                  >
                    File type
                  </label>

                  <select
                    id="typeFilter"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className={inputClass}
                  >
                    <option value="all">All types</option>
                    <option value="pdf">PDF</option>
                    <option value="document">Document</option>
                    <option value="image">Image</option>
                    <option value="link">Link</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={resetFilters}
                    disabled={!hasActiveFilters}
                    className="w-full rounded-xl border border-white/10 px-4 py-3 text-sm text-slate-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Clear filters
                  </button>
                </div>
              </div>

              <p className="mt-3 text-xs text-slate-500">
                Showing {filteredMaterials.length} of {materials.length}{" "}
                materials
              </p>
            </div>

            {/* SUMMARY LENGTH SELECTOR */}

            <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-purple-400/15 bg-purple-400/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-semibold text-purple-300">
                  ✨ AI Summarisation
                </h3>

                <p className="mt-1 text-xs text-slate-400">
                  Choose the summary length before generating.
                </p>
              </div>

              <select
                value={summaryLength}
                onChange={(e) => setSummaryLength(e.target.value)}
                className="rounded-xl border border-purple-400/20 bg-[#0b1020] px-4 py-2.5 text-sm text-white outline-none focus:border-purple-400"
              >
                <option value="short">Short summary</option>
                <option value="medium">Medium summary</option>
                <option value="detailed">Detailed summary</option>
              </select>
            </div>

            {/* LOADING STATE */}

            {loading ? (
              <div className="rounded-2xl border border-white/10 p-12 text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-cyan-400" />

                <p className="mt-4 text-sm text-slate-400">
                  Loading your library...
                </p>
              </div>
            ) : filteredMaterials.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center">
                <div className="text-4xl">📚</div>

                <h3 className="mt-4 text-lg font-semibold">
                  {materials.length === 0
                    ? "Your library is empty"
                    : "No materials found"}
                </h3>

                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-400">
                  {materials.length === 0
                    ? "Upload your first study material using the form."
                    : "Try another search term or clear your filters."}
                </p>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="mt-5 rounded-lg border border-cyan-400/20 px-4 py-2 text-sm text-cyan-300 hover:bg-cyan-400/10"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {filteredMaterials.map((material) => {
                  const hasFile = Boolean(material.fileUrl);

                  const type = (
                    material.materialType || "other"
                  ).toLowerCase();

                  const icon =
                    type === "pdf"
                      ? "📕"
                      : type === "image"
                        ? "🖼️"
                        : type === "link"
                          ? "🔗"
                          : type === "document"
                            ? "📝"
                            : "📄";

                  const isSupportedFile = [
                    "application/pdf",
                    "text/plain",
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                  ].includes(material.mimeType);

                  return (
                    <article
                      key={material._id}
                      className="group flex min-w-0 flex-col rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-5 transition duration-200 hover:-translate-y-0.5 hover:border-cyan-400/30 hover:shadow-xl hover:shadow-cyan-950/10"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-cyan-400/10 bg-cyan-400/[0.08] text-2xl">
                          {icon}
                        </div>

                        <span className="rounded-full border border-purple-400/15 bg-purple-400/10 px-3 py-1 text-xs capitalize text-purple-300">
                          {type}
                        </span>
                      </div>

                      <h3 className="mt-4 break-words text-lg font-semibold transition group-hover:text-cyan-200">
                        {material.title || "Untitled material"}
                      </h3>

                      <p className="mt-1 break-words text-sm font-medium text-cyan-400">
                        {material.subject || "Uncategorized"}
                      </p>

                      <p className="mt-3 line-clamp-3 flex-1 break-words text-sm leading-6 text-slate-400">
                        {material.description || "No description provided."}
                      </p>

                      {material.originalName && (
                        <p
                          className="mt-3 truncate text-xs text-slate-500"
                          title={material.originalName}
                        >
                          File: {material.originalName}
                        </p>
                      )}

                      {/* CARD ACTIONS */}

                      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
                        {hasFile ? (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                openOrDownloadFile(material, false, setError)
                              }
                              className="rounded-lg border border-cyan-400/20 bg-cyan-400/[0.06] px-3 py-2 text-sm font-medium text-cyan-300 transition hover:bg-cyan-400/15"
                            >
                              Open ↗
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                openOrDownloadFile(material, true, setError)
                              }
                              className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10"
                            >
                              Download ↓
                            </button>

                            {isSupportedFile && (
                              <button
                                type="button"
                                disabled={Boolean(summarizingId)}
                                onClick={() => handleSummarize(material)}
                                className="rounded-lg border border-purple-400/20 bg-purple-400/10 px-3 py-2 text-sm font-medium text-purple-300 transition hover:bg-purple-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {summarizingId === material._id
                                  ? "Generating..."
                                  : "✨ Summarize"}
                              </button>
                            )}
                          </>
                        ) : (
                          <span className="py-2 text-xs text-slate-500">
                            No file attached
                          </span>
                        )}

                        <button
                          type="button"
                          disabled={deletingId === material._id}
                          onClick={() => handleDelete(material._id)}
                          className="ml-auto rounded-lg px-2 py-2 text-sm text-red-400 transition hover:bg-red-400/10 hover:text-red-300 disabled:opacity-50"
                        >
                          {deletingId === material._id
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* FOOTER */}

        <footer className="mt-12 border-t border-white/10 pt-6 text-center text-xs text-slate-500">
          Stay organized. Keep learning. One resource at a time.
        </footer>
      </main>

      {/* AI SUMMARY MODAL */}

      {summaryData && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setSummaryData(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="summary-title"
            className="flex max-h-[85dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-purple-400/20 bg-[#0b1020] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* HEADER */}

            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 p-5">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-purple-400">
                  AI Generated Summary
                </p>

                <h2
                  id="summary-title"
                  className="mt-2 break-words text-xl font-bold text-white"
                >
                  {summaryData.title}
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  {summaryData.subject}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSummaryData(null)}
                className="shrink-0 rounded-lg border border-white/10 px-3 py-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
                aria-label="Close summary"
              >
                ✕
              </button>
            </div>

            {/* SCROLLABLE SUMMARY CONTENT */}

            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              <div
  ref={summaryContentRef}
  className="bg-slate-900 text-slate-100 p-8 rounded-xl shadow-lg"
>
  <h1 className="text-3xl font-bold text-white mb-3">
    {summaryData.title}
  </h1>

  <p className="text-slate-400 mb-6">
    Subject: {summaryData.subject}
  </p>

  <hr className="border-slate-700 mb-8" />

  <div className="prose prose-invert prose-headings:text-white prose-p:text-slate-200 prose-li:text-slate-200 prose-strong:text-white max-w-none">
    <ReactMarkdown remarkPlugins={[remarkGfm]}>
      {summaryData.summary}
    </ReactMarkdown>
  </div>
              </div>
            </div>

            {/* FOOTER */}

            <div className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-white/10 bg-[#0b1020] p-4">
              <button
  type="button"
  onClick={handleDownloadPDF}
  disabled={downloadingPDF}
  className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold disabled:opacity-50"
>
  {downloadingPDF ? "Generating PDF..." : "↓ Download PDF"}
              </button>

              <button
                type="button"
                onClick={() => setSummaryData(null)}
                className="rounded-xl bg-gradient-to-r from-purple-500 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
              >
                Close Summary
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudyMaterials;