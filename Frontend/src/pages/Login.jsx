import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import AuthLayout from "../layouts/AuthLayout";
import BookLogo from "../components/BookLogo";

const API_URL = "http://localhost:3000/api";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed.");
      }

      setMessage("Login successful! Opening your dashboard...");

      navigate("/dashboard");
    } catch (error) {
      setMessage(
        error.message === "Failed to fetch"
          ? "Cannot connect to the server. Check your backend and CORS settings."
          : error.message
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <div className="mb-4 flex items-center justify-center gap-2 text-[10px] font-bold tracking-[2px] text-slate-400">
        <span className="text-lg text-purple-400">✦</span>
        A BETTER WAY TO STUDY
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-indigo-400/25 bg-linear-to-br from-[#10172e] to-[#090d1e] p-6 shadow-2xl shadow-black/30 sm:p-9">
        {/* Subtle gradient highlight */}
        <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl" />

        <div className="relative">
          <div className="mb-4 flex justify-center">
            <div className="rounded-2xl border border-indigo-300/15 bg-indigo-500/10 p-2 shadow-[0_0_35px_rgba(99,102,241,0.12)]">
              <BookLogo size={48} />
            </div>
          </div>

          <h2 className="text-center text-3xl font-extrabold tracking-tight text-white">
            Welcome Back!
          </h2>

          <p className="mt-3 text-center text-xs leading-6 text-slate-400">
            Your next learning breakthrough starts here.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-xs font-semibold text-slate-200"
              >
                Email Address
              </label>

              <div className="flex items-center gap-3 rounded-xl border border-slate-700/80 bg-[#070c1b]/80 px-4 transition focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/10">
                <span className="text-lg text-blue-300">✉</span>

                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                  className="h-12 w-full min-w-0 bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-xs font-semibold text-slate-200"
              >
                Password
              </label>

              <div className="flex items-center gap-3 rounded-xl border border-slate-700/80 bg-[#070c1b]/80 px-4 transition focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/10">
                <span className="text-lg text-blue-300">♙</span>

                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                  className="h-12 w-full min-w-0 bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((previous) => !previous)}
                  className="text-[10px] font-semibold text-blue-300 transition hover:text-white"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 text-[11px]">
              <label className="flex cursor-pointer items-center gap-2 text-slate-400">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 accent-indigo-500"
                />
                Remember me
              </label>

              <button
                type="button"
                onClick={() =>
                  setMessage("Password recovery is not implemented yet.")
                }
                className="font-medium text-purple-300 transition hover:text-purple-200"
              >
                Forgot password?
              </button>
            </div>

            {/* Feedback */}
            {message && (
              <div
                role="status"
                className={`rounded-lg border p-3 text-xs leading-5 ${
                  message.startsWith("Login successful")
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border-red-500/30 bg-red-500/10 text-red-300"
                }`}
              >
                {message}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-950/40 transition hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign In"}

              {!loading && <span className="text-lg">→</span>}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-700/70" />

            <span className="text-[9px] font-bold tracking-widest text-slate-500">
              YOUR LEARNING JOURNEY
            </span>

            <div className="h-px flex-1 bg-slate-700/70" />
          </div>

          <div className="rounded-xl border border-indigo-400/10 bg-indigo-400/4 p-3">
            <p className="text-xs font-semibold text-slate-200">
              ✦ Your space, your progress
            </p>

            <p className="mt-1 text-[10px] leading-5 text-slate-400">
              Your personal learning workspace starts here.
            </p>
          </div>

          <p className="mt-7 text-center text-xs text-slate-400">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="font-bold text-purple-300 transition hover:text-purple-200"
            >
              Sign Up
            </Link>
          </p>
        </div>
      </div>

      <p className="mt-5 text-center text-[8px] font-bold tracking-[1.5px] text-slate-500">
        BUILT FOR CURIOUS MINDS · POWERED BY YOUR AMBITION
      </p>
    </AuthLayout>
  );
}

export default Login;