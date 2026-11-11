import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

const LETTERS = ["A", "B", "C", "D"];

function Quizzes() {
 // --------------------------------------------------
// QUIZ DATA
// --------------------------------------------------

const LETTERS = ["A", "B", "C", "D"];

const [quizzes, setQuizzes] = useState([]);
const [attempts, setAttempts] = useState([]);

// Generator fields
const [title, setTitle] = useState("");
const [subject, setSubject] = useState("");
const [topic, setTopic] = useState("");
const [difficulty, setDifficulty] = useState("medium");
const [numberOfQuestions, setNumberOfQuestions] = useState(5);

// Loading states
const [loading, setLoading] = useState(true);
const [generating, setGenerating] = useState(false);
const [submitting, setSubmitting] = useState(false);
const [deleting, setDeleting] = useState("");

// Messages
const [error, setError] = useState("");
const [success, setSuccess] = useState("");

// Quiz practice
const [activeQuiz, setActiveQuiz] = useState(null);
const [answers, setAnswers] = useState({});
const [currentQuestion, setCurrentQuestion] = useState(0);
const [score, setScore] = useState(null);

// Attempt review
const [reviewAttempt, setReviewAttempt] = useState(null);

// Timer
const [timeTaken, setTimeTaken] = useState(0);
const [quizStartedAt, setQuizStartedAt] = useState(null);


// --------------------------------------------------
// LOAD QUIZZES AND ATTEMPTS
// --------------------------------------------------

const loadQuizzes = async () => {
  try {
    const data = await api("/quizzes");
    setQuizzes(data.quizzes || []);
  } catch (err) {
    setError(err.message || "Failed to load quizzes.");
  }
};

const loadAttempts = async () => {
  try {
    const data = await api("/quizzes/attempts");
    setAttempts(data.attempts || []);
  } catch (err) {
    console.error("Attempt history error:", err);
  }
};

const loadPageData = async () => {
  try {
    setLoading(true);
    setError("");

    await Promise.all([
      loadQuizzes(),
      loadAttempts(),
    ]);
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  loadPageData();
}, []);


// --------------------------------------------------
// QUIZ TIMER
// --------------------------------------------------

useEffect(() => {
  if (!activeQuiz || score || !quizStartedAt) {
    return;
  }

  const interval = setInterval(() => {
    const seconds = Math.floor(
      (Date.now() - quizStartedAt) / 1000
    );

    setTimeTaken(seconds);
  }, 1000);

  return () => clearInterval(interval);
}, [activeQuiz, score, quizStartedAt]);


// --------------------------------------------------
// FORMAT TIME
// --------------------------------------------------

const formatTime = (seconds = 0) => {
  const safeSeconds = Math.max(0, Number(seconds) || 0);

  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(
      minutes
    ).padStart(2, "0")}:${String(remainingSeconds).padStart(
      2,
      "0"
    )}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds
  ).padStart(2, "0")}`;
};


// --------------------------------------------------
// GENERATE AI QUIZ
// --------------------------------------------------

const generateQuiz = async (event) => {
  event.preventDefault();

  setError("");
  setSuccess("");

  if (!subject.trim() || !topic.trim()) {
    setError("Please enter both subject and topic.");
    return;
  }

  try {
    setGenerating(true);

    const response = await api("/quizzes/generate", {
      method: "POST",
      body: JSON.stringify({
        title: title.trim(),
        subject: subject.trim(),
        topic: topic.trim(),
        difficulty,
        numberOfQuestions: Number(numberOfQuestions),
      }),
    });

    if (!response.quiz?._id) {
      throw new Error("Quiz generation failed.");
    }

    const generatedQuiz = response.quiz;

    setSuccess("Your AI quiz was generated and saved!");

    setTitle("");
    setTopic("");
    setNumberOfQuestions(5);

    await loadQuizzes();

    // Open generated quiz automatically.
    await openQuiz(generatedQuiz);

  } catch (err) {
    setError(err.message || "Failed to generate quiz.");
  } finally {
    setGenerating(false);
  }
};


// --------------------------------------------------
// OPEN SAVED QUIZ
// --------------------------------------------------

const openQuiz = async (quiz) => {
  try {
    setError("");
    setSuccess("");
    setReviewAttempt(null);

    const response = await api(`/quizzes/${quiz._id}`);

    if (!response.quiz) {
      throw new Error("Unable to load quiz.");
    }

    startQuiz(response.quiz);

  } catch (err) {
    setError(err.message || "Failed to open quiz.");
  }
};


// --------------------------------------------------
// START QUIZ
// --------------------------------------------------

const startQuiz = (quiz) => {
  setReviewAttempt(null);

  setActiveQuiz(quiz);
  setAnswers({});
  setCurrentQuestion(0);
  setScore(null);
  setTimeTaken(0);
  setQuizStartedAt(Date.now());

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
};


// --------------------------------------------------
// SELECT ANSWER
// --------------------------------------------------

const selectAnswer = (questionId, answer) => {
  if (score) return;

  setAnswers((previous) => ({
    ...previous,
    [questionId]: answer,
  }));
};


// --------------------------------------------------
// QUESTION NAVIGATION
// --------------------------------------------------

const goToQuestion = (index) => {
  if (
    !activeQuiz ||
    index < 0 ||
    index >= activeQuiz.questions.length
  ) {
    return;
  }

  setCurrentQuestion(index);
};


// --------------------------------------------------
// SUBMIT QUIZ
// --------------------------------------------------

const submitQuiz = async () => {
  if (!activeQuiz || score || submitting) {
    return;
  }

  const questions = activeQuiz.questions || [];

  if (!questions.length) {
    setError("This quiz has no questions.");
    return;
  }

  const unanswered = questions.filter(
    (question) => !answers[question._id]
  );

  if (unanswered.length > 0) {
    const confirmed = window.confirm(
      `You have ${unanswered.length} unanswered questions. Submit anyway?`
    );

    if (!confirmed) return;
  }

  try {
    setSubmitting(true);
    setError("");

    const finalTime = quizStartedAt
      ? Math.floor((Date.now() - quizStartedAt) / 1000)
      : timeTaken;

    const formattedAnswers = questions.map((question) => ({
      questionId: question._id,
      selectedAnswer: answers[question._id] || null,
    }));

    const response = await api(
      `/quizzes/${activeQuiz._id}/attempts`,
      {
        method: "POST",
        body: JSON.stringify({
          answers: formattedAnswers,
          timeTakenSeconds: finalTime,
        }),
      }
    );

    if (!response.result) {
      throw new Error("Unable to calculate quiz result.");
    }

    setTimeTaken(finalTime);
    setScore(response.result);

    await Promise.all([
      loadQuizzes(),
      loadAttempts(),
    ]);

  } catch (err) {
    setError(err.message || "Failed to submit quiz.");
  } finally {
    setSubmitting(false);
  }
};


// --------------------------------------------------
// RETAKE QUIZ
// --------------------------------------------------

const retryQuiz = () => {
  if (!activeQuiz) return;

  startQuiz(activeQuiz);
};


// --------------------------------------------------
// BACK TO QUIZ LIST
// --------------------------------------------------

const backToQuizzes = async () => {
  setActiveQuiz(null);
  setReviewAttempt(null);

  setAnswers({});
  setCurrentQuestion(0);
  setScore(null);

  setTimeTaken(0);
  setQuizStartedAt(null);

  setError("");
  setSuccess("");

  await loadPageData();

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
};


// --------------------------------------------------
// DELETE QUIZ
// --------------------------------------------------

const deleteQuiz = async (id) => {
  const confirmed = window.confirm(
    "Are you sure you want to delete this quiz? Previous attempt records will be preserved."
  );

  if (!confirmed) return;

  try {
    setDeleting(id);
    setError("");
    setSuccess("");

    await api(`/quizzes/${id}`, {
      method: "DELETE",
    });

    setQuizzes((previous) =>
      previous.filter((quiz) => quiz._id !== id)
    );

    setSuccess("Quiz deleted successfully.");

    await loadAttempts();

  } catch (err) {
    setError(err.message || "Failed to delete quiz.");
  } finally {
    setDeleting("");
  }
};


// --------------------------------------------------
// OPEN ATTEMPT REVIEW
// --------------------------------------------------

const openAttemptReview = (attempt) => {
  if (!attempt.reviewQuestions?.length) {
    setError(
      "Question review is unavailable for this attempt."
    );
    return;
  }

  setError("");
  setSuccess("");

  setActiveQuiz(null);
  setReviewAttempt(attempt);

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
};


// --------------------------------------------------
// CLOSE ATTEMPT REVIEW
// --------------------------------------------------

const closeAttemptReview = () => {
  setReviewAttempt(null);
  setError("");
  setSuccess("");

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
};


// --------------------------------------------------
// PERFORMANCE MESSAGE
// --------------------------------------------------

const getPerformanceMessage = (percentage) => {
  if (percentage >= 90) {
    return "Excellent! You have mastered this topic. 🏆";
  }

  if (percentage >= 70) {
    return "Great work! You have a good understanding. 🎉";
  }

  if (percentage >= 50) {
    return "Good effort! Keep practising. 👍";
  }

  return "Keep learning! Review the explanations and try again. 📚";
};


// --------------------------------------------------
// LOADING SCREEN
// --------------------------------------------------

if (loading) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050816] text-white">
      <p className="text-slate-400">
        Loading your quizzes...
      </p>
    </div>
  );
}


// --------------------------------------------------
// ACTIVE QUIZ DATA
// --------------------------------------------------

const questions = activeQuiz?.questions || [];

const question = questions[currentQuestion];

const answeredCount = Object.keys(answers).length;

const progressPercentage =
  questions.length > 0
    ? (answeredCount / questions.length) * 100
    : 0;

const resultMap = new Map(
  (score?.results || []).map((result) => [
    String(result.questionId),
    result,
  ])
);
  // --------------------------------------------------
  // MAIN UI
  // --------------------------------------------------
return (
  <div className="min-h-screen bg-[#050816] text-white">

    {/* HEADER */}
    <header className="border-b border-white/10">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
        <Link
          to="/dashboard"
          className="font-bold transition hover:text-cyan-400"
        >
          ← Study Companion
        </Link>

        <span className="text-sm text-slate-400">
          AI Quiz Center
        </span>
      </div>
    </header>

    <main className="mx-auto max-w-7xl px-5 py-10">

      {/* PAGE HEADING */}
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-widest text-orange-400">
          Practice makes progress
        </p>

        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
          Test your knowledge 🎯
        </h1>

        <p className="mt-3 text-slate-400">
          Generate AI-powered quizzes, practise MCQs and track your performance.
        </p>
      </div>

      {/* ERROR */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* SUCCESS */}
      {success && !activeQuiz && !reviewAttempt && (
        <div className="mb-6 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-300">
          {success}
        </div>
      )}

      {/* ================================================= */}
      {/* ATTEMPT REVIEW */}
      {/* ================================================= */}

      {reviewAttempt ? (

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-8">

          <button
            onClick={closeAttemptReview}
            className="mb-6 text-sm text-cyan-400 hover:text-cyan-300"
          >
            ← Back to quiz history
          </button>

          {/* REVIEW HEADER */}
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-orange-400">
              Attempt review
            </p>

            <h2 className="mt-3 text-2xl font-bold">
              {reviewAttempt.quizTitle ||
                reviewAttempt.quiz?.title ||
                "Quiz review"}
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              {reviewAttempt.subject || "General"} · {reviewAttempt.topic || ""}
            </p>

            <p className="mt-2 text-xs text-slate-500">
              Attempted on{" "}
              {new Date(reviewAttempt.createdAt).toLocaleDateString("en-IN")}
            </p>
          </div>

          {/* REVIEW SUMMARY */}
          <div className="mt-6 grid gap-4 sm:grid-cols-3">

            <div className="rounded-xl bg-white/5 p-5">
              <p className="text-sm text-slate-400">
                Score
              </p>

              <p className="mt-2 text-3xl font-bold text-cyan-400">
                {reviewAttempt.scorePercentage}%
              </p>
            </div>

            <div className="rounded-xl bg-white/5 p-5">
              <p className="text-sm text-slate-400">
                Correct answers
              </p>

              <p className="mt-2 text-3xl font-bold text-emerald-400">
                {reviewAttempt.correctAnswers}/{reviewAttempt.totalQuestions}
              </p>
            </div>

            <div className="rounded-xl bg-white/5 p-5">
              <p className="text-sm text-slate-400">
                Time taken
              </p>

              <p className="mt-2 text-3xl font-bold">
                {formatTime(reviewAttempt.timeTakenSeconds || 0)}
              </p>
            </div>

          </div>

          {/* QUESTION-BY-QUESTION REVIEW */}
          <div className="mt-8">

            <h3 className="mb-5 text-xl font-bold">
              Question-wise analysis
            </h3>

            <div className="space-y-5">

              {reviewAttempt.reviewQuestions.map((item, index) => {

                const letters = ["A", "B", "C", "D"];

                const selectedIndex = letters.indexOf(
                  item.selectedAnswer
                );

                const correctIndex = letters.indexOf(
                  item.correctAnswer
                );

                return (
                  <article
                    key={item.questionId || index}
                    className="rounded-2xl border border-white/10 bg-[#0b1020] p-5 sm:p-6"
                  >

                    {/* QUESTION HEADER */}
                    <div className="flex flex-wrap items-center justify-between gap-3">

                      <p className="font-semibold text-orange-400">
                        Question {index + 1}
                      </p>

                      {item.isCorrect ? (
                        <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                          ✓ Correct
                        </span>
                      ) : (
                        <span className="rounded-full bg-red-400/10 px-3 py-1 text-xs font-semibold text-red-400">
                          ✕ Incorrect
                        </span>
                      )}

                    </div>

                    {/* QUESTION TEXT */}
                    <h4 className="mt-4 text-lg font-semibold leading-relaxed">
                      {item.question}
                    </h4>

                    {/* OPTIONS */}
                    <div className="mt-5 space-y-3">

                      {item.options.map((option, optionIndex) => {

                        const letter = letters[optionIndex];

                        const isSelected =
                          selectedIndex === optionIndex;

                        const isCorrect =
                          correctIndex === optionIndex;

                        let optionStyle =
                          "border-white/10 bg-white/[0.02]";

                        if (isCorrect) {
                          optionStyle =
                            "border-emerald-400/50 bg-emerald-400/10";
                        } else if (isSelected && !item.isCorrect) {
                          optionStyle =
                            "border-red-400/50 bg-red-400/10";
                        }

                        return (
                          <div
                            key={letter}
                            className={`flex items-center gap-3 rounded-xl border p-4 ${optionStyle}`}
                          >

                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-sm font-bold">
                              {letter}
                            </span>

                            <span className="flex-1 text-sm text-slate-200">
                              {option}
                            </span>

                            {isCorrect && (
                              <span className="text-xs font-semibold text-emerald-400">
                                Correct answer
                              </span>
                            )}

                            {isSelected && !item.isCorrect && (
                              <span className="text-xs font-semibold text-red-400">
                                Your answer
                              </span>
                            )}

                            {isSelected && item.isCorrect && (
                              <span className="text-xs font-semibold text-emerald-400">
                                Your answer
                              </span>
                            )}

                          </div>
                        );
                      })}

                    </div>

                    {/* SKIPPED QUESTION */}
                    {!item.selectedAnswer && (
                      <p className="mt-4 text-sm text-yellow-400">
                        You skipped this question.
                      </p>
                    )}

                    {/* EXPLANATION */}
                    <div className="mt-5 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4">

                      <p className="font-semibold text-cyan-300">
                        Explanation
                      </p>

                      <p className="mt-2 text-sm leading-relaxed text-slate-300">
                        {item.explanation ||
                          "No explanation is available for this question."}
                      </p>

                    </div>

                  </article>
                );
              })}

            </div>
          </div>

          <button
            onClick={closeAttemptReview}
            className="mt-8 rounded-xl border border-white/10 px-6 py-3 font-semibold transition hover:bg-white/5"
          >
            ← Back to quiz history
          </button>

        </section>

      ) : activeQuiz ? (

        /* ================================================= */
        /* ACTIVE QUIZ */
        /* ================================================= */

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-8">

          <button
            onClick={backToQuizzes}
            className="mb-6 text-sm text-cyan-400 hover:text-cyan-300"
          >
            ← Back to quizzes
          </button>

          {/* QUIZ HEADER */}
          <div className="flex flex-wrap items-start justify-between gap-4">

            <div>
              <h2 className="text-2xl font-bold">
                {activeQuiz.title}
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                {activeQuiz.subject} · {activeQuiz.topic}
              </p>
            </div>

            <div className="rounded-xl border border-orange-400/20 bg-orange-400/10 px-4 py-3 text-center">

              <p className="text-xs text-slate-400">
                Time taken
              </p>

              <p className="mt-1 font-mono text-xl font-bold text-orange-300">
                {formatTime(timeTaken)}
              </p>

            </div>
          </div>

          {/* QUIZ PROGRESS */}
          <div className="mt-7 rounded-xl bg-white/5 p-4">

            <div className="flex justify-between text-sm">
              <span className="text-slate-400">
                Questions answered
              </span>

              <span className="font-semibold">
                {answeredCount} / {questions.length}
              </span>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-orange-400 transition-all"
                style={{
                  width: `${progressPercentage}%`,
                }}
              />
            </div>

          </div>

          {/* QUESTION NAVIGATION */}
          <div className="mt-7">

            <p className="mb-3 text-sm font-semibold text-slate-300">
              Question navigation
            </p>

            <div className="flex flex-wrap gap-2">

              {questions.map((item, index) => {

                const answered = Boolean(answers[item._id]);

                const isCurrent = currentQuestion === index;

                let className =
                  "h-10 w-10 rounded-lg border text-sm font-semibold transition ";

                if (isCurrent) {
                  className +=
                    "border-orange-400 bg-orange-400 text-white";
                } else if (answered) {
                  className +=
                    "border-emerald-400/40 bg-emerald-400/10 text-emerald-300";
                } else {
                  className +=
                    "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10";
                }

                return (
                  <button
                    key={item._id}
                    onClick={() => goToQuestion(index)}
                    className={className}
                  >
                    {index + 1}
                  </button>
                );
              })}

            </div>

            <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400">
              <span>🟠 Current</span>
              <span>🟢 Answered</span>
              <span>⚪ Not answered</span>
            </div>

          </div>

          {/* QUESTION */}
          {question && (

            <div className="mt-8 rounded-2xl border border-white/10 bg-[#0b1020] p-5 sm:p-7">

              <div className="flex items-center justify-between gap-3">

                <span className="text-sm font-semibold text-orange-400">
                  Question {currentQuestion + 1}
                </span>

                <span className="text-xs text-slate-400">
                  {currentQuestion + 1} of {questions.length}
                </span>

              </div>

              <h3 className="mt-5 text-lg font-semibold leading-relaxed sm:text-xl">
                {question.question}
              </h3>

              {/* OPTIONS */}
              <div className="mt-7 space-y-3">

                {question.options.map((option, index) => {

                  const letter = LETTERS[index];

                  const selected =
                    answers[question._id] === letter;

                  const result = resultMap.get(
                    String(question._id)
                  );

                  const correct =
                    score && result?.correctAnswer === letter;

                  const incorrect =
                    score &&
                    result?.selectedAnswer === letter &&
                    !result?.isCorrect;

                  let optionClass =
                    "border-white/10 hover:bg-white/5";

                  if (!score && selected) {
                    optionClass =
                      "border-cyan-400 bg-cyan-400/10";
                  }

                  if (score && correct) {
                    optionClass =
                      "border-emerald-400 bg-emerald-400/10";
                  }

                  if (score && incorrect) {
                    optionClass =
                      "border-red-400 bg-red-400/10";
                  }

                  return (
                    <button
                      key={letter}
                      type="button"
                      disabled={Boolean(score)}
                      onClick={() =>
                        selectAnswer(question._id, letter)
                      }
                      className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition ${optionClass}`}
                    >

                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                          selected
                            ? "bg-cyan-400 text-slate-950"
                            : "bg-white/10 text-slate-300"
                        }`}
                      >
                        {letter}
                      </span>

                      <span className="flex-1 text-sm leading-relaxed text-slate-200">
                        {option}
                      </span>

                      {score && correct && (
                        <span className="text-sm font-semibold text-emerald-400">
                          ✓ Correct
                        </span>
                      )}

                      {score && incorrect && (
                        <span className="text-sm font-semibold text-red-400">
                          ✕ Incorrect
                        </span>
                      )}

                    </button>
                  );
                })}

              </div>

              {/* RESULT EXPLANATION */}
              {score && resultMap.has(String(question._id)) && (

                <div className="mt-6 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-5">

                  <p className="font-semibold text-cyan-300">
                    Correct answer: {resultMap.get(String(question._id)).correctAnswer}
                  </p>

                  <p className="mt-2 text-sm text-slate-300">
                    {question.options[
                      LETTERS.indexOf(
                        resultMap.get(String(question._id)).correctAnswer
                      )
                    ]}
                  </p>

                  {resultMap.get(String(question._id)).explanation && (
                    <>
                      <p className="mt-4 font-semibold text-cyan-300">
                        Explanation
                      </p>

                      <p className="mt-2 text-sm leading-relaxed text-slate-300">
                        {resultMap.get(String(question._id)).explanation}
                      </p>
                    </>
                  )}

                </div>
              )}

            </div>
          )}

          {/* NAVIGATION BUTTONS */}
          {!score && (

            <div className="mt-6 flex flex-wrap justify-between gap-3">

              <button
                disabled={currentQuestion === 0}
                onClick={() =>
                  goToQuestion(currentQuestion - 1)
                }
                className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold transition hover:bg-white/5 disabled:opacity-30"
              >
                ← Previous
              </button>

              {currentQuestion < questions.length - 1 ? (

                <button
                  onClick={() =>
                    goToQuestion(currentQuestion + 1)
                  }
                  className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold transition hover:bg-orange-400"
                >
                  Next question →
                </button>

              ) : (

                <button
                  onClick={submitQuiz}
                  disabled={submitting}
                  className="rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-7 py-3 font-semibold transition hover:opacity-90 disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit quiz"}
                </button>

              )}

            </div>
          )}

          {/* RESULT SUMMARY */}
          {score && (

            <div className="mt-8 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-6 sm:p-8">

              <div className="text-center">

                <p className="text-5xl">🏆</p>

                <h3 className="mt-4 text-2xl font-bold text-emerald-300">
                  Quiz completed!
                </h3>

                <p className="mt-3 text-slate-300">
                  {getPerformanceMessage(score.scorePercentage)}
                </p>

                <div className="mt-7 grid gap-4 sm:grid-cols-4">

                  <div className="rounded-xl bg-white/5 p-5">
                    <p className="text-sm text-slate-400">
                      Correct
                    </p>

                    <p className="mt-2 text-3xl font-bold text-emerald-400">
                      {score.correctAnswers}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white/5 p-5">
                    <p className="text-sm text-slate-400">
                      Incorrect
                    </p>

                    <p className="mt-2 text-3xl font-bold text-red-400">
                      {score.wrongAnswers}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white/5 p-5">
                    <p className="text-sm text-slate-400">
                      Percentage
                    </p>

                    <p className="mt-2 text-3xl font-bold text-cyan-400">
                      {score.scorePercentage}%
                    </p>
                  </div>

                  <div className="rounded-xl bg-white/5 p-5">
                    <p className="text-sm text-slate-400">
                      Time taken
                    </p>

                    <p className="mt-2 text-2xl font-bold">
                      {formatTime(score.timeTakenSeconds)}
                    </p>
                  </div>

                </div>

                <p className="mt-5 text-sm text-emerald-300">
                  ✓ Your result and Study Progress have been saved.
                </p>

                <div className="mt-7 flex flex-wrap justify-center gap-3">

                  <button
                    onClick={retryQuiz}
                    className="rounded-xl bg-orange-500 px-6 py-3 font-semibold hover:bg-orange-400"
                  >
                    Retake quiz
                  </button>

                  <button
                    onClick={backToQuizzes}
                    className="rounded-xl border border-white/10 px-6 py-3 font-semibold hover:bg-white/5"
                  >
                    Back to quizzes
                  </button>

                  <Link
                    to="/progress"
                    className="rounded-xl border border-cyan-400/30 px-6 py-3 font-semibold text-cyan-300 hover:bg-cyan-400/10"
                  >
                    View progress
                  </Link>

                </div>

              </div>
            </div>
          )}

        </section>

      ) : (

        /* ================================================= */
        /* GENERATOR AND SAVED QUIZZES */
        /* ================================================= */

        <div className="space-y-10">

          <div className="grid items-start gap-8 lg:grid-cols-[380px_1fr]">

            {/* AI GENERATOR */}
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-400/10 text-2xl">
                ✨
              </div>

              <h2 className="mt-5 text-xl font-semibold">
                Generate AI Quiz
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                Generate examination-level MCQs using Gemini AI.
              </p>

              <form
                onSubmit={generateQuiz}
                className="mt-6 space-y-5"
              >

                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Quiz title (optional)
                  </label>

                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Digital Electronics"
                    className="w-full rounded-xl border border-white/10 bg-[#0b1020] px-4 py-3 outline-none focus:border-orange-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Subject *
                  </label>

                  <input
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Electronics"
                    className="w-full rounded-xl border border-white/10 bg-[#0b1020] px-4 py-3 outline-none focus:border-orange-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Topic *
                  </label>

                  <input
                    required
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Digital Modulation"
                    className="w-full rounded-xl border border-white/10 bg-[#0b1020] px-4 py-3 outline-none focus:border-orange-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Difficulty
                  </label>

                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#0b1020] px-4 py-3 text-white outline-none focus:border-orange-400"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Number of questions
                  </label>

                  <select
                    value={numberOfQuestions}
                    onChange={(e) =>
                      setNumberOfQuestions(Number(e.target.value))
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#0b1020] px-4 py-3 text-white outline-none focus:border-orange-400"
                  >
                    {[5, 10, 15, 20].map((number) => (
                      <option key={number} value={number}>
                        {number} Questions
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={generating}
                  className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-4 py-4 font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {generating
                    ? "Generating quiz..."
                    : "✨ Generate & Start Quiz"}
                </button>

                {generating && (
                  <p className="text-center text-xs text-slate-400">
                    Gemini is preparing your questions. Please wait...
                  </p>
                )}

              </form>
            </section>

            {/* SAVED QUIZZES */}
            <section>

              <div className="mb-5">
                <h2 className="text-xl font-semibold">
                  Your saved quizzes
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  {quizzes.length} saved quiz(es)
                </p>
              </div>

              {quizzes.length === 0 ? (

                <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center">
                  <p className="text-4xl">🎯</p>

                  <h3 className="mt-4 font-semibold">
                    No quizzes yet
                  </h3>

                  <p className="mt-2 text-sm text-slate-400">
                    Generate your first AI quiz.
                  </p>
                </div>

              ) : (

                <div className="grid gap-5 sm:grid-cols-2">

                  {quizzes.map((quiz) => (

                    <article
                      key={quiz._id}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-orange-400/30"
                    >

                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-400/10 text-2xl">
                        🎯
                      </div>

                      <h3 className="mt-4 text-lg font-semibold">
                        {quiz.title}
                      </h3>

                      <p className="mt-2 text-sm text-slate-400">
                        {quiz.subject || "General"} · {quiz.topic}
                      </p>

                      <p className="mt-2 text-xs capitalize text-orange-300">
                        {quiz.difficulty} difficulty
                      </p>

                      <div className="mt-4 grid grid-cols-2 gap-3">

                        <div className="rounded-lg bg-white/5 p-3">
                          <p className="text-xs text-slate-400">
                            Questions
                          </p>

                          <p className="mt-1 font-bold">
                            {quiz.questionCount}
                          </p>
                        </div>

                        <div className="rounded-lg bg-white/5 p-3">
                          <p className="text-xs text-slate-400">
                            Attempts
                          </p>

                          <p className="mt-1 font-bold">
                            {quiz.attempts || 0}
                          </p>
                        </div>

                        <div className="rounded-lg bg-white/5 p-3">
                          <p className="text-xs text-slate-400">
                            Best score
                          </p>

                          <p className="mt-1 font-bold text-emerald-400">
                            {quiz.bestScore || 0}%
                          </p>
                        </div>

                        <div className="rounded-lg bg-white/5 p-3">
                          <p className="text-xs text-slate-400">
                            Latest score
                          </p>

                          <p className="mt-1 font-bold text-cyan-400">
                            {quiz.latestScore || 0}%
                          </p>
                        </div>

                      </div>

                      <div className="mt-5 flex flex-wrap items-center gap-4">

                        <button
                          onClick={() => openQuiz(quiz)}
                          className="rounded-lg bg-orange-400/10 px-4 py-2 text-sm font-semibold text-orange-300 hover:bg-orange-400/20"
                        >
                          Start quiz →
                        </button>

                        <button
                          onClick={() => deleteQuiz(quiz._id)}
                          disabled={deleting === quiz._id}
                          className="text-sm text-red-400 hover:text-red-300 disabled:opacity-50"
                        >
                          {deleting === quiz._id ? "Deleting..." : "Delete"}
                        </button>

                      </div>

                    </article>
                  ))}

                </div>
              )}

            </section>
          </div>

          {/* ================================================= */}
          {/* ATTEMPT HISTORY */}
          {/* ================================================= */}

          <section>

            <div className="mb-5">
              <h2 className="text-xl font-semibold">
                Quiz attempt history 📊
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Review your previous quiz attempts and scores.
              </p>
            </div>

            {attempts.length === 0 ? (

              <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center">
                <p className="text-3xl">📚</p>

                <h3 className="mt-3 font-semibold">
                  No attempts yet
                </h3>

                <p className="mt-2 text-sm text-slate-400">
                  Your quiz results will appear here after submission.
                </p>
              </div>

            ) : (

              <div className="overflow-hidden rounded-2xl border border-white/10">

                <div className="overflow-x-auto">

                  <table className="w-full min-w-[800px] text-left">

                    <thead className="bg-white/5 text-xs uppercase text-slate-400">

                      <tr>
                        <th className="px-5 py-4">Quiz</th>
                        <th className="px-5 py-4">Subject</th>
                        <th className="px-5 py-4">Score</th>
                        <th className="px-5 py-4">Correct</th>
                        <th className="px-5 py-4">Time</th>
                        <th className="px-5 py-4">Date</th>
                        <th className="px-5 py-4">Review</th>
                      </tr>

                    </thead>

                    <tbody className="divide-y divide-white/10">

                      {attempts.map((attempt) => (

                        <tr
                          key={attempt._id}
                          className="transition hover:bg-white/[0.03]"
                        >

                          <td className="px-5 py-4">
                            <p className="font-semibold">
                              {attempt.quizTitle ||
                                attempt.quiz?.title ||
                                "Deleted quiz"}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              {attempt.topic}
                            </p>
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-300">
                            {attempt.subject || "General"}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`rounded-full px-3 py-1 text-sm font-semibold ${
                                attempt.scorePercentage >= 70
                                  ? "bg-emerald-400/10 text-emerald-400"
                                  : attempt.scorePercentage >= 40
                                  ? "bg-yellow-400/10 text-yellow-400"
                                  : "bg-red-400/10 text-red-400"
                              }`}
                            >
                              {attempt.scorePercentage}%
                            </span>
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-300">
                            {attempt.correctAnswers}/{attempt.totalQuestions}
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-300">
                            {formatTime(attempt.timeTakenSeconds || 0)}
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-400">
                            {new Date(
                              attempt.createdAt
                            ).toLocaleDateString("en-IN")}
                          </td>

                          <td className="px-5 py-4">
                            <button
                              onClick={() => openAttemptReview(attempt)}
                              disabled={!attempt.reviewQuestions?.length}
                              className="rounded-lg border border-cyan-400/30 px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Review →
                            </button>
                          </td>

                        </tr>
                      ))}

                    </tbody>

                  </table>

                </div>
              </div>
            )}

          </section>

        </div>
      )}

    </main>
  </div>
);
 
}

export default Quizzes;