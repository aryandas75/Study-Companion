import { Link } from "react-router-dom";
import BookLogo from "./BookLogo";

function Navbar() {
  return (
    <header className="border-b border-white/5">
      <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-3">
          <BookLogo size={40} />

          <span className="text-lg font-bold tracking-tight text-white sm:text-xl">
            Study <span className="text-blue-400">Companion</span>
          </span>
        </Link>

        <nav className="flex flex-wrap items-center gap-1 sm:gap-3">
          <Link
            to="/"
            className="rounded-xl bg-indigo-500/15 px-3 py-2 text-xs font-medium text-indigo-300 transition hover:bg-indigo-500/25 sm:px-4 sm:text-sm"
          >
            Home
          </Link>

          <a
            href="/#features"
            className="rounded-xl px-3 py-2 text-xs text-slate-400 transition hover:bg-white/5 hover:text-white sm:px-4 sm:text-sm"
          >
            Features
          </a>

          <a
            href="/#about"
            className="hidden rounded-xl px-3 py-2 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white sm:block"
          >
            About
          </a>

          <Link
            to="/study-planner"
            className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs font-medium text-cyan-300 transition hover:bg-cyan-400/20 sm:px-4 sm:text-sm"
          >
            Study Planner
          </Link>
        </nav>

        <div className="hidden items-center gap-2 text-xs text-slate-400 lg:flex">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.7)]" />
          Your learning space
        </div>
      </div>
    </header>
  );
}

export default Navbar;