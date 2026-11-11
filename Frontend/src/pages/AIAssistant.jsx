import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import * as pdfjsLib from "pdfjs-dist";
import api from "../services/api";

// Configure PDF.js worker for Vite.
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

function AIAssistant() {
  const [activeTab, setActiveTab] = useState("ask");

  const [question, setQuestion] = useState("");
  const [text, setText] = useState("");
  const [subject, setSubject] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [count, setCount] = useState("5");

  const [pdfFile, setPdfFile] = useState(null);
  const [pdfName, setPdfName] = useState("");
  const [extractingPDF, setExtractingPDF] = useState(false);

  const [messages, setMessages] = useState([]);
  const [chatId, setChatId] = useState(null);
  const [chats, setChats] = useState([]);
  const [loadingChats, setLoadingChats] = useState(true);

  const [result, setResult] = useState(null);

  // Practice question states
  const [previousQuestions, setPreviousQuestions] = useState([]);
  const [practiceSettings, setPracticeSettings] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedIndex, setCopiedIndex] = useState(null);

  const tabs = [
    {
      id: "ask",
      label: "Ask AI",
      icon: "💬",
      description: "Chat and ask follow-ups",
    },
    {
      id: "summarize",
      label: "Summarize",
      icon: "✨",
      description: "Create revision notes",
    },
    {
      id: "questions",
      label: "Practice",
      icon: "🎯",
      description: "Practice exam questions",
    },
  ];

  // Normalize text returned by the backend.
  const normalizeText = (value) => {
    if (typeof value !== "string") return "";

    return value
      .replace(/\\r\\n/g, "\n")
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\n")
      .replace(/\\t/g, "\t");
  };

  // Extract the useful answer from API response.
  const getAnswer = (data) => {
    if (typeof data === "string") return data;

    const answer =
      data?.answer ??
      data?.summary ??
      data?.questions ??
      data?.result ??
      data?.message ??
      data;

    return typeof answer === "string"
      ? answer
      : JSON.stringify(answer, null, 2);
  };

  // Load saved conversations.
  const loadChats = useCallback(async () => {
    try {
      const data = await api("/chats");

      setChats(
        Array.isArray(data)
          ? data
          : Array.isArray(data?.chats)
            ? data.chats
            : []
      );
    } catch (err) {
      setError(err?.message || "Unable to load saved conversations.");
    } finally {
      setLoadingChats(false);
    }
  }, []);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  // Switch between AI tools.
  const switchTab = (tabId) => {
    if (loading) return;

    if (activeTab === "summarize" && tabId !== "summarize") {
      setText("");
      setPdfFile(null);
      setPdfName("");
    }

    // Reset the visible result when changing tools.
    setResult(null);
    setError("");
    setCopiedIndex(null);

    // Reset practice history when leaving Practice.
    if (activeTab === "questions" && tabId !== "questions") {
      setPreviousQuestions([]);
      setPracticeSettings(null);
    }

    setActiveTab(tabId);
  };

  // Start a new conversation.
  const clearChat = () => {
    setChatId(null);
    setMessages([]);
    setQuestion("");
    setText("");
    setPdfFile(null);
    setPdfName("");
    setResult(null);
    setError("");
    setCopiedIndex(null);
    setPreviousQuestions([]);
    setPracticeSettings(null);
  };

  // Extract text from PDF in browser.
  const extractPDFText = async (file) => {
    const arrayBuffer = await file.arrayBuffer();

    const pdf = await pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
    }).promise;

    let extractedText = "";

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();

      const pageText = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ");

      extractedText += `\n\nPage ${pageNumber}\n${pageText}`;
    }

    return extractedText.trim();
  };

  // Handle PDF upload.
  const handlePDFChange = async (event) => {
    const file = event.target.files?.[0];

    setPdfFile(null);
    setPdfName("");
    setText("");
    setError("");

    if (!file) return;

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      setError("Please select a PDF file.");
      event.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("PDF size must be 10 MB or less.");
      event.target.value = "";
      return;
    }

    setPdfFile(file);
    setPdfName(file.name);
    setExtractingPDF(true);

    try {
      const extractedText = await extractPDFText(file);

      if (!extractedText) {
        throw new Error(
          "No selectable text was found. This PDF may be scanned; OCR is required."
        );
      }

      setText(extractedText);
    } catch (err) {
      setPdfFile(null);
      setPdfName("");
      setText("");
      setError(err?.message || "Unable to read this PDF.");
    } finally {
      setExtractingPDF(false);
    }
  };

  // Open an existing conversation.
  const openChat = async (id) => {
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const data = await api(`/chats/${id}`);
      const chat = data?.chat ?? data;

      if (!chat?._id || !Array.isArray(chat.messages)) {
        throw new Error("Unexpected conversation data from the server.");
      }

      const pairs = [];
      let pendingQuestion = null;

      for (const message of chat.messages) {
        if (message.role === "user") {
          if (pendingQuestion !== null) {
            pairs.push({
              question: pendingQuestion,
              answer: "No answer was saved for this question.",
            });
          }

          pendingQuestion = message.content;
        } else if (
          message.role === "assistant" &&
          pendingQuestion !== null
        ) {
          pairs.push({
            question: pendingQuestion,
            answer: normalizeText(message.content),
          });

          pendingQuestion = null;
        }
      }

      if (pendingQuestion !== null) {
        pairs.push({
          question: pendingQuestion,
          answer: "No answer was saved for this question.",
        });
      }

      setChatId(chat._id);
      setMessages(pairs);
      setQuestion("");
      setActiveTab("ask");
      setResult(null);
      setPreviousQuestions([]);
      setPracticeSettings(null);
      setCopiedIndex(null);
    } catch (err) {
      setError(err?.message || "Unable to open this conversation.");
    } finally {
      setLoading(false);
    }
  };

  // Rename a saved conversation.
  const renameChat = async (id, currentTitle) => {
    if (loading) return;

    const newTitle = window.prompt(
      "Enter a new conversation title:",
      currentTitle || ""
    );

    if (newTitle === null) return;

    const trimmedTitle = newTitle.trim();

    if (!trimmedTitle) {
      setError("Conversation title cannot be empty.");
      return;
    }

    if (trimmedTitle.length > 100) {
      setError("Conversation title cannot exceed 100 characters.");
      return;
    }

    if (trimmedTitle === currentTitle) return;

    setError("");

    try {
      await api(`/chats/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: trimmedTitle,
        }),
      });

      setChats((previous) =>
        previous.map((chat) =>
          chat._id === id
            ? { ...chat, title: trimmedTitle }
            : chat
        )
      );
    } catch (err) {
      setError(err?.message || "Unable to rename conversation.");
    }
  };

  // Delete a conversation.
  const deleteChat = async (id) => {
    if (loading) return;

    if (!window.confirm("Delete this conversation permanently?")) return;

    setError("");

    try {
      await api(`/chats/${id}`, {
        method: "DELETE",
      });

      setChats((previous) =>
        previous.filter((chat) => chat._id !== id)
      );

      if (chatId === id) {
        clearChat();
      }
    } catch (err) {
      setError(err?.message || "Unable to delete this conversation.");
    }
  };

  // Copy generated content.
  const copyText = async (value, index) => {
    try {
      await navigator.clipboard.writeText(value);

      setCopiedIndex(index);

      window.setTimeout(() => {
        setCopiedIndex(null);
      }, 2000);
    } catch {
      setError("Unable to copy. Please copy the text manually.");
    }
  };

  // Generate another set of practice questions.
  const generateAnotherSet = async () => {
    if (loading || !practiceSettings) return;

    setLoading(true);
    setError("");

    try {
      const data = await api("/ai/questions", {
        method: "POST",
        body: JSON.stringify({
          topic: practiceSettings.topic,
          subject: practiceSettings.subject || undefined,
          difficulty: practiceSettings.difficulty,
          numberOfQuestions: practiceSettings.numberOfQuestions,
          previousQuestions: previousQuestions.map(
            (q) => q.question
          ),
          ...(chatId ? { chatId } : {}),
        }),
      });

      if (!data?.success || !Array.isArray(data.questionItems)) {
        throw new Error(
          data?.message || "Unable to generate another question set."
        );
      }

      if (
        data.questionItems.length !==
        practiceSettings.numberOfQuestions
      ) {
        throw new Error(
          "The AI did not generate the requested number of questions."
        );
      }

      setPreviousQuestions((previous) => [
        ...previous,
        ...data.questionItems,
      ]);

      setResult({
        title: "New practice questions",
        content: normalizeText(data.questions),
        questionItems: data.questionItems,
      });

      if (data.chatId) {
        setChatId(data.chatId);
      }

      await loadChats();
    } catch (err) {
      setError(
        err?.message || "Unable to generate another question set."
      );
    } finally {
      setLoading(false);
    }
  };

  // Main AI request handler.
  const runAI = async (event) => {
    event.preventDefault();

    if (loading || extractingPDF) return;

    const currentQuestion = question.trim();
    const currentText = text.trim();

    if (activeTab === "ask" && !currentQuestion) {
      setError("Please enter a question.");
      return;
    }

    if (activeTab !== "ask" && !currentText) {
      setError(
        activeTab === "summarize"
          ? "Please paste study text or upload a PDF."
          : "Please enter a topic or study text."
      );
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      // ASK AI
      if (activeTab === "ask") {
        const history = messages.flatMap((message) => [
          {
            role: "user",
            content: message.question,
          },
          {
            role: "assistant",
            content: message.answer,
          },
        ]);

        const data = await api("/ai/ask", {
          method: "POST",
          body: JSON.stringify({
            question: currentQuestion,
            history,
            ...(chatId ? { chatId } : {}),
            ...(subject.trim() ? { subject: subject.trim() } : {}),
          }),
        });

        const answer = normalizeText(getAnswer(data));

        if (data?.chatId) {
          setChatId(data.chatId);
        }

        setMessages((previous) => [
          ...previous,
          {
            question: currentQuestion,
            answer,
          },
        ]);

        setQuestion("");

        await loadChats();
      }

      // SUMMARIZE
      else if (activeTab === "summarize") {
        const data = await api("/ai/summarize", {
          method: "POST",
          body: JSON.stringify({
            text: currentText,
            ...(chatId ? { chatId } : {}),
          }),
        });

        if (data?.chatId) {
          setChatId(data.chatId);
        }

        setResult({
          title: pdfName
            ? `Summary: ${pdfName}`
            : "Study summary",
          content: normalizeText(getAnswer(data)),
        });

        await loadChats();
      }

      // GENERATE FIRST PRACTICE QUESTION SET
      else {
        const settings = {
          topic: currentText.slice(0, 300),
          subject: subject.trim(),
          difficulty,
          numberOfQuestions: Math.min(Number(count), 10),
        };

        const data = await api("/ai/questions", {
          method: "POST",
          body: JSON.stringify({
            topic: settings.topic,
            subject: settings.subject || undefined,
            difficulty: settings.difficulty,
            numberOfQuestions: settings.numberOfQuestions,
            previousQuestions: [],
            ...(chatId ? { chatId } : {}),
          }),
        });

        if (!data?.success || !Array.isArray(data.questionItems)) {
          throw new Error(
            data?.message || "Unable to generate practice questions."
          );
        }

        if (
          data.questionItems.length !== settings.numberOfQuestions
        ) {
          throw new Error(
            "The AI did not generate the requested number of questions."
          );
        }

        setPracticeSettings(settings);
        setPreviousQuestions(data.questionItems);

        if (data?.chatId) {
          setChatId(data.chatId);
        }

        setResult({
          title: "Practice questions",
          content: normalizeText(data.questions),
          questionItems: data.questionItems,
        });

        await loadChats();
      }
    } catch (err) {
      const message = err?.message || "";

      if (
        /429|no credits|quota|rate limit|insufficient_quota/i.test(message)
      ) {
        setError(
          "The AI service has reached its usage limit. Check your AI provider's quota."
        );
      } else if (/401|unauthorized|token/i.test(message)) {
        setError("Your session may have expired. Please log in again.");
      } else {
        setError(message || "Unable to process your request.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Markdown styling.
  const markdownClasses =
    "break-words text-sm leading-7 text-slate-200 " +
    "[&_h1]:mb-3 [&_h1]:mt-5 [&_h1]:text-2xl [&_h1]:font-bold " +
    "[&_h2]:mb-3 [&_h2]:mt-5 [&_h2]:text-xl [&_h2]:font-semibold " +
    "[&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-semibold " +
    "[&_p]:mb-3 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 " +
    "[&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-2 " +
    "[&_strong]:font-semibold [&_strong]:text-cyan-200 " +
    "[&_blockquote]:border-l-2 [&_blockquote]:border-cyan-400 " +
    "[&_blockquote]:pl-4 [&_blockquote]:text-slate-400 " +
    "[&_hr]:my-5 [&_hr]:border-white/10 [&_table]:w-full " +
    "[&_table]:border-collapse [&_th]:border [&_th]:border-white/10 " +
    "[&_th]:p-2 [&_td]:border [&_td]:border-white/10 [&_td]:p-2 " +
    "[&_code]:rounded [&_code]:bg-white/10 [&_code]:px-1 " +
    "[&_pre]:overflow-x-auto";

  const renderMarkdown = (content) => (
    <div className={markdownClasses}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      {/* HEADER */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#050816]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-4">
          <Link to="/dashboard" className="flex items-center gap-3 font-bold">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 text-xl">
              📚
            </span>

            <span>
              Study Companion
              <span className="block text-xs font-normal text-slate-400">
                Your learning workspace
              </span>
            </span>
          </Link>

          <Link
            to="/dashboard"
            className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300 hover:text-white"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8">
        {/* HERO */}
        <section className="rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-purple-500/10 p-7 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
            YOUR PERSONAL STUDY ASSISTANT
          </p>

          <h1 className="mt-4 text-3xl font-bold sm:text-5xl">
            Learn smarter with{" "}
            <span className="bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
              AI
            </span>{" "}
            ✨
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
            Ask questions, understand difficult concepts, summarize notes, and
            practice for exams with your personal study assistant.
          </p>
        </section>

        {/* TABS */}
        <section className="mt-8 grid gap-3 sm:grid-cols-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => switchTab(tab.id)}
              className={`rounded-2xl border p-5 text-left transition ${
                activeTab === tab.id
                  ? "border-cyan-400/50 bg-cyan-400/10"
                  : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
              }`}
            >
              <span className="text-2xl">{tab.icon}</span>

              <span className="mt-3 block font-semibold">
                {tab.label}
              </span>

              <span className="mt-1 block text-xs text-slate-400">
                {tab.description}
              </span>
            </button>
          ))}
        </section>

        {/* ERROR */}
        {error && (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        <section className="mt-6 grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          {/* SIDEBAR */}
          <aside className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a1020]">
            <div className="flex items-center justify-between gap-2 border-b border-white/10 p-4">
              <h2 className="font-semibold">Saved conversations</h2>

              <button
                type="button"
                onClick={clearChat}
                disabled={loading}
                className="rounded-lg bg-cyan-500/15 px-3 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/25 disabled:opacity-50"
              >
                + New
              </button>
            </div>

            <div className="max-h-[440px] space-y-2 overflow-y-auto p-3">
              {loadingChats && (
                <p className="p-3 text-sm text-slate-400">
                  Loading conversations...
                </p>
              )}

              {!loadingChats && chats.length === 0 && (
                <p className="p-3 text-sm leading-6 text-slate-400">
                  Your saved conversations will appear here.
                </p>
              )}

              {chats.map((chat) => (
                <div
                  key={chat._id}
                  className={`group flex items-start gap-2 rounded-xl border p-3 ${
                    chatId === chat._id
                      ? "border-cyan-400/40 bg-cyan-400/10"
                      : "border-transparent hover:bg-white/[0.05]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => openChat(chat._id)}
                    disabled={loading}
                    className="min-w-0 flex-1 text-left disabled:opacity-50"
                  >
                    <span className="block truncate text-sm font-medium">
                      {chat.title || "New conversation"}
                    </span>

                    <span className="mt-1 block text-xs text-slate-500">
                      {chat.messageCount ?? chat.messages?.length ?? 0} messages
                    </span>
                  </button>

                  {/* RENAME */}
                  <button
                    type="button"
                    onClick={() =>
                      renameChat(chat._id, chat.title || "")
                    }
                    disabled={loading}
                    title="Rename conversation"
                    aria-label={`Rename ${chat.title || "conversation"}`}
                    className="rounded px-1 text-slate-500 hover:text-cyan-300 disabled:opacity-50"
                  >
                    ✎
                  </button>

                  {/* DELETE */}
                  <button
                    type="button"
                    onClick={() => deleteChat(chat._id)}
                    disabled={loading}
                    title="Delete conversation"
                    aria-label={`Delete ${chat.title || "conversation"}`}
                    className="rounded px-1 text-slate-500 hover:text-red-300 disabled:opacity-50"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </aside>

          {/* ASK AI */}
          {activeTab === "ask" ? (
            <div className="min-w-0 overflow-hidden rounded-3xl border border-white/10 bg-[#0a1020]">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 p-5">
                <div>
                  <h2 className="font-semibold">AI conversation</h2>

                  <p className="mt-1 text-xs text-slate-400">
                    Your conversations are saved automatically.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={clearChat}
                  disabled={loading || messages.length === 0}
                  className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5 disabled:opacity-40"
                >
                  New chat
                </button>
              </div>

              <div className="space-y-6 p-5 sm:p-7">
                {messages.length === 0 && (
                  <div className="py-10 text-center">
                    <div className="text-4xl">💬</div>

                    <h3 className="mt-4 font-semibold">
                      What would you like to learn?
                    </h3>

                    <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-400">
                      Ask a question or open a saved conversation.
                    </p>
                  </div>
                )}

                {messages.map((message, index) => (
                  <div
                    key={`${index}-${message.question}`}
                    className="space-y-4"
                  >
                    <div className="ml-auto max-w-[90%] rounded-2xl rounded-br-sm bg-blue-600/20 p-4 sm:max-w-[80%]">
                      <p className="mb-2 text-xs font-semibold text-cyan-300">
                        YOU
                      </p>

                      <p className="whitespace-pre-wrap text-sm leading-6">
                        {message.question}
                      </p>
                    </div>

                    <div className="max-w-full rounded-2xl border border-white/10 bg-[#050816] p-4 sm:p-6">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold text-cyan-300">
                          ✨ STUDY COMPANION
                        </p>

                        <button
                          type="button"
                          onClick={() => copyText(message.answer, index)}
                          className="text-xs text-slate-400 hover:text-cyan-300"
                        >
                          {copiedIndex === index
                            ? "✓ Copied"
                            : "Copy answer"}
                        </button>
                      </div>

                      {renderMarkdown(message.answer)}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div
                    aria-live="polite"
                    className="flex items-center gap-3 text-sm text-cyan-300"
                  >
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-300/30 border-t-cyan-300" />
                    Study Companion is thinking...
                  </div>
                )}
              </div>

              {/* ASK FORM */}
              <form
                onSubmit={runAI}
                className="border-t border-white/10 bg-[#080d1b] p-5 sm:p-6"
              >
                <div className="mb-4">
                  <label
                    htmlFor="chat-question"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Your question
                  </label>

                  <input
                    id="chat-question"
                    type="text"
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    placeholder="Ask anything about your studies..."
                    disabled={loading}
                    className="w-full rounded-xl border border-white/10 bg-[#050816] px-4 py-3.5 text-sm outline-none placeholder:text-slate-500 focus:border-cyan-400/60 disabled:opacity-50"
                  />
                </div>

                <div className="mb-4">
                  <label
                    htmlFor="ask-subject"
                    className="mb-2 block text-sm text-slate-300"
                  >
                    Subject (optional)
                  </label>

                  <input
                    id="ask-subject"
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    placeholder="e.g. Control Systems"
                    className="w-full rounded-xl border border-white/10 bg-[#050816] px-4 py-3 outline-none focus:border-cyan-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !question.trim()}
                  className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 font-semibold disabled:opacity-50"
                >
                  {loading ? "Thinking..." : "Send question →"}
                </button>
              </form>
            </div>
          ) : (
            /* SUMMARIZE AND PRACTICE */
            <div className="min-w-0 space-y-6">
              <section className="rounded-3xl border border-white/10 bg-[#0a1020] p-5 sm:p-8">
                <h2 className="text-xl font-semibold">
                  {activeTab === "summarize"
                    ? "Summarize your material"
                    : "Generate practice questions"}
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {activeTab === "summarize"
                    ? "Upload a PDF or paste your study text."
                    : "Enter a topic or paste your study text."}
                </p>

                <form onSubmit={runAI} className="mt-6 space-y-5">
                  {/* SUBJECT */}
                  <div>
                    <label
                      htmlFor="tool-subject"
                      className="mb-2 block text-sm text-slate-300"
                    >
                      Subject (optional)
                    </label>

                    <input
                      id="tool-subject"
                      value={subject}
                      onChange={(event) => setSubject(event.target.value)}
                      placeholder="e.g. Control Systems"
                      className="w-full rounded-xl border border-white/10 bg-[#050816] px-4 py-3 outline-none focus:border-cyan-400"
                    />
                  </div>

                  {/* PDF UPLOAD */}
                  {activeTab === "summarize" && (
                    <div className="rounded-2xl border border-dashed border-cyan-400/30 bg-cyan-400/5 p-5">
                      <label
                        htmlFor="pdf-upload"
                        className="mb-3 block font-medium text-cyan-200"
                      >
                        📄 Upload PDF (maximum 10 MB)
                      </label>

                      <input
                        id="pdf-upload"
                        type="file"
                        accept=".pdf,application/pdf"
                        onChange={handlePDFChange}
                        disabled={loading || extractingPDF}
                        className="block w-full text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-500/20 file:px-4 file:py-2 file:font-semibold file:text-cyan-200 hover:file:bg-cyan-500/30"
                      />

                      {pdfName && (
                        <p className="mt-3 break-all text-sm text-slate-300">
                          Selected: {pdfName}
                        </p>
                      )}

                      {extractingPDF && (
                        <p className="mt-3 text-sm text-cyan-300">
                          Extracting text from PDF...
                        </p>
                      )}

                      {pdfFile && !extractingPDF && text && (
                        <p className="mt-3 text-sm text-emerald-300">
                          ✓ PDF text extracted successfully.
                        </p>
                      )}

                      {pdfFile && (
                        <button
                          type="button"
                          onClick={() => {
                            setPdfFile(null);
                            setPdfName("");
                            setText("");
                          }}
                          className="mt-3 text-sm text-red-300 hover:text-red-200"
                        >
                          Remove PDF
                        </button>
                      )}
                    </div>
                  )}

                  {/* TEXT INPUT */}
                  <div>
                    <label
                      htmlFor="study-text"
                      className="mb-2 block text-sm text-slate-300"
                    >
                      {activeTab === "summarize"
                        ? "Study text"
                        : "Topic or study text"}
                    </label>

                    <textarea
                      id="study-text"
                      value={text}
                      onChange={(event) => {
                        setText(event.target.value);

                        if (pdfFile) {
                          setPdfFile(null);
                          setPdfName("");
                        }
                      }}
                      rows={8}
                      placeholder={
                        activeTab === "summarize"
                          ? "PDF text will appear here after extraction, or paste your notes..."
                          : "Paste your notes or enter a topic..."
                      }
                      className="w-full resize-y rounded-xl border border-white/10 bg-[#050816] px-4 py-3 text-sm leading-7 outline-none focus:border-cyan-400"
                    />

                    <p className="mt-2 text-xs text-slate-500">
                      {text.length.toLocaleString()} characters
                    </p>
                  </div>

                  {/* PRACTICE SETTINGS */}
                  {activeTab === "questions" && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="difficulty"
                          className="mb-2 block text-sm text-slate-300"
                        >
                          Difficulty
                        </label>

                        <select
                          id="difficulty"
                          value={difficulty}
                          onChange={(event) =>
                            setDifficulty(event.target.value)
                          }
                          className="w-full rounded-xl border border-white/10 bg-[#050816] px-4 py-3"
                        >
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="count"
                          className="mb-2 block text-sm text-slate-300"
                        >
                          Number of questions
                        </label>

                        <select
                          id="count"
                          value={count}
                          onChange={(event) => setCount(event.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-[#050816] px-4 py-3"
                        >
                          {[1, 2, 3, 5, 10].map((number) => (
                            <option key={number} value={number}>
                              {number} questions
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* SUBMIT */}
                  <button
                    type="submit"
                    disabled={loading || extractingPDF || !text.trim()}
                    className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 font-semibold transition hover:brightness-110 disabled:opacity-50"
                  >
                    {loading
                      ? "Processing..."
                      : extractingPDF
                        ? "Reading PDF..."
                        : activeTab === "summarize"
                          ? "Generate summary →"
                          : "Generate questions →"}
                  </button>
                </form>
              </section>

              {/* AI RESULT */}
              {result && (
                <section className="rounded-2xl border border-cyan-400/20 bg-[#0a1020] p-5 sm:p-7">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="text-xl font-semibold">
                      {result.title}
                    </h2>

                    <button
                      type="button"
                      onClick={() => copyText(result.content, "result")}
                      className="text-sm text-cyan-300 hover:text-cyan-200"
                    >
                      {copiedIndex === "result"
                        ? "✓ Copied"
                        : "Copy result"}
                    </button>
                  </div>

                  {renderMarkdown(result.content)}

                  {/* GENERATE ANOTHER SET */}
                  {activeTab === "questions" &&
                    result.questionItems &&
                    practiceSettings && (
                      <div className="mt-6 border-t border-white/10 pt-5">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-cyan-300">
                              Want more practice?
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              Generate a fresh set without repeating previous
                              questions.
                            </p>
                          </div>

                          <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs text-cyan-300">
                            {previousQuestions.length} questions generated
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={generateAnotherSet}
                          disabled={loading}
                          className="rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-3 font-semibold transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {loading
                            ? "Generating new questions..."
                            : "↻ Generate Another Set"}
                        </button>
                      </div>
                    )}

                  <p className="mt-4 text-xs text-slate-500">
                    Saved to your conversations. Select it from the sidebar
                    to reopen it.
                  </p>
                </section>
              )}
            </div>
          )}
        </section>

        {/* FOOTER */}
        <footer className="mt-10 border-t border-white/[0.07] pt-6 text-center text-xs leading-6 text-slate-500">
          Study Companion · Your personal learning workspace
        </footer>
      </main>
    </div>
  );
}

export default AIAssistant;