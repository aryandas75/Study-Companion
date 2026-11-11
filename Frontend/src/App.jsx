
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import StudyMaterials from "./pages/StudyMaterials";
import Notes from "./pages/Notes";
import AIAssistant from "./pages/AIAssistant";
import Quizzes from "./pages/Quizzes";
import Progress from "./pages/Progress";
import StudyPlanner from "./pages/StudyPlanner";
import StudyCalendar from "./pages/StudyCalendar";
import Analytics from "./pages/Analytics";
import Pomodoro from "./pages/Pomodoro";
import StudyGoals from "./pages/StudyGoals";
import Flashcards from "./pages/Flashcards";
function Home() {
  return (
    <>
      <Navbar />

      <main
        id="home"
        className="min-h-screen bg-[#050816] px-6 py-20 text-white"
      >
        <section className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <span className="inline-block rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-300">
              Your personal AI-powered learning space
            </span>

            <h1 className="mt-8 text-4xl font-bold leading-tight sm:text-6xl">
              Study smarter.
              <br />
              <span className="bg-linear-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Learn faster.
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400">
              Organize your study materials, create notes, generate summaries,
              practice quizzes, and track your learning progress—all in one
              place.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <a
                href="/register"
                className="rounded-xl bg-linear-to-r from-cyan-500 to-blue-600 px-7 py-3.5 font-semibold text-white transition hover:opacity-90"
              >
                Get Started
              </a>

              <a
                href="/login"
                className="rounded-xl border border-white/10 bg-white/5 px-7 py-3.5 font-semibold text-white transition hover:bg-white/10"
              >
                Sign In
              </a>
            </div>
          </div>

          <div
            id="features"
            className="mt-20 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {[
              {
                number: "01",
                title: "Study Materials",
                description:
                  "Keep your learning resources organized in one place.",
              },
              {
                number: "02",
                title: "AI Assistant",
                description:
                  "Summarize study content and ask questions about it.",
              },
              {
                number: "03",
                title: "Smart Quizzes",
                description:
                  "Generate questions and test your understanding.",
              },
              {
                number: "04",
                title: "Personal Notes",
                description:
                  "Write, organize, and revisit your important notes.",
              },
              {
                number: "05",
                title: "Track Progress",
                description:
                  "Monitor your learning activities and study goals.",
              },
              {
                number: "06",
                title: "One Workspace",
                description:
                  "Bring your study workflow together in a single app.",
              },
            ].map((feature) => (
              <article
                key={feature.number}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-cyan-400/30 hover:bg-white/[0.05]"
              >
                <span className="text-sm font-semibold text-cyan-400">
                  {feature.number}
                </span>

                <h2 className="mt-4 text-xl font-semibold text-white">
                  {feature.title}
                </h2>

                <p className="mt-3 leading-7 text-slate-400">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>

          <footer
            id="about"
            className="mt-20 border-t border-white/10 py-8 text-center text-sm text-slate-500"
          >
            Study Companion — Make every study session count.
          </footer>
        </section>
      </main>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/login" element={<Login />} />

        <Route path="/register" element={<Register />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/materials"
          element={
            <ProtectedRoute>
              <StudyMaterials />
            </ProtectedRoute>
          }
        />

        <Route
          path="/notes"
          element={
            <ProtectedRoute>
              <Notes />
            </ProtectedRoute>
          }
        />

        <Route
          path="/ai"
          element={
            <ProtectedRoute>
              <AIAssistant />
            </ProtectedRoute>
          }
        />

        <Route
          path="/quizzes"
          element={
            <ProtectedRoute>
              <Quizzes />
            </ProtectedRoute>
          }
        />

        <Route
          path="/progress"
          element={
            <ProtectedRoute>
              <Progress />
            </ProtectedRoute>
          }
        />

        {/* Study Planner */}
        <Route
          path="/study-planner"
          element={
            <ProtectedRoute>
              <StudyPlanner />
            </ProtectedRoute>
          }
        />
        <Route
  path="/study-calendar"
  element={
    <ProtectedRoute>
      <StudyCalendar />
    </ProtectedRoute>
  }
/>
        <Route
  path="/analytics"
  element={
    <ProtectedRoute>
      <Analytics />
    </ProtectedRoute>
  }
/>
<Route
  path="/pomodoro"
  element={
    <ProtectedRoute>
      <Pomodoro />
    </ProtectedRoute>
  }
/>
<Route
  path="/study-goals"
  element={
    <ProtectedRoute>
      <StudyGoals />
    </ProtectedRoute>
  }
/>
<Route
  path="/flashcards"
  element={
    <ProtectedRoute>
      <Flashcards />
    </ProtectedRoute>
  }
/>
        {/* Keep the wildcard route last */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

