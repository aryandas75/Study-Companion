import Navbar from "../components/Navbar";
import BookLogo from "../components/BookLogo";
import FeatureCard from "../components/FeatureCard";

function AuthLayout({ children }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050816] text-white">
      {/* Background glow */}
      <div className="pointer-events-none absolute -left-40 top-40 h-96 w-96 rounded-full bg-indigo-600/15 blur-[120px]" />

      <div className="pointer-events-none absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-purple-600/15 blur-[120px]" />

      {/* Navigation */}
      <Navbar />

      {/* Main content */}
      <main
        id="home"
        className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-5 py-12 sm:px-8 lg:min-h-[calc(100vh-80px)] lg:grid-cols-2 lg:gap-16 lg:py-10"
      >
        {/* Left section */}
        <section className="min-w-0">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-4 py-2 text-[10px] font-bold tracking-[2px] text-indigo-300">
            <span className="text-base">✦</span>
            AI POWERED · SMART LEARNING
          </div>

          <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl xl:text-6xl">
            Your Personal
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-cyan-300 to-purple-400 bg-clip-text text-transparent">
              Study Companion.
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-sm leading-7 text-slate-400 sm:text-base">
            Everything you need to learn smarter, stay organized, and
            achieve more — all in one beautiful workspace.
          </p>

          {/* Features */}
          <div
            id="features"
            className="mt-9 grid grid-cols-1 gap-6 sm:grid-cols-2"
          >
            <FeatureCard
              icon="▤"
              title="Study Materials"
              description="Keep PDFs and notes organized."
              color="blue"
            />

            <FeatureCard
              icon="✎"
              title="Smart Notes"
              description="Save your ideas in one place."
              color="purple"
            />

            <FeatureCard
              icon="✧"
              title="AI Assistant"
              description="Get summaries and instant answers."
              color="cyan"
            />

            <FeatureCard
              icon="↗"
              title="Track Progress"
              description="Build habits and reach your goals."
              color="green"
            />
          </div>

          {/* Decorative study workspace */}
          <div className="relative mt-10 hidden h-56 overflow-hidden rounded-2xl border border-indigo-400/15 bg-gradient-to-br from-slate-900 via-[#11172f] to-[#171127] shadow-2xl shadow-indigo-950/20 sm:block">
            <div className="absolute right-8 top-6 h-28 w-36 rounded-xl border border-indigo-400/20 bg-indigo-500/10 shadow-[0_0_50px_rgba(99,102,241,0.12)]" />

            <div className="absolute right-20 top-12 h-16 w-16 rounded-full bg-purple-500/10 blur-2xl" />

            {/* Books */}
            <div className="absolute bottom-7 left-6 flex w-28 flex-col gap-1">
              <div className="rounded-r-md border-l-4 border-cyan-300 bg-cyan-900/70 px-3 py-2 text-[8px] font-bold tracking-widest text-cyan-100">
                MATHEMATICS
              </div>

              <div className="rounded-r-md border-l-4 border-purple-300 bg-purple-900/70 px-3 py-2 text-[8px] font-bold tracking-widest text-purple-100">
                PHYSICS
              </div>

              <div className="rounded-r-md border-l-4 border-orange-300 bg-orange-900/70 px-3 py-2 text-[8px] font-bold tracking-widest text-orange-100">
                PROGRAMMING
              </div>
            </div>

            {/* Laptop */}
            <div className="absolute bottom-7 left-1/2 w-44 -translate-x-1/2">
              <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-t-xl border-2 border-indigo-300/40 bg-[#080d20] shadow-[0_0_30px_rgba(99,102,241,0.12)]">
                <BookLogo size={43} />

                <span className="text-[8px] font-bold tracking-[3px] text-indigo-300">
                  FOCUS MODE
                </span>

                <div className="h-1 w-16 rounded-full bg-indigo-400/30" />
              </div>

              <div className="h-2 rounded-b-lg bg-gradient-to-r from-slate-500 via-slate-300 to-slate-600" />
            </div>

            {/* Floating study goal */}
            <div className="absolute left-[43%] top-6 rounded-lg border border-purple-300/20 bg-[#201b36]/95 p-3 shadow-xl">
              <p className="text-[8px] font-bold tracking-widest text-purple-300">
                ✦ TODAY'S GOAL
              </p>

              <p className="mt-2 text-xs font-semibold text-white">
                Learn something
              </p>

              <p className="text-xs font-semibold text-white">
                amazing.
              </p>

              <p className="mt-2 text-[9px] text-emerald-300">
                ✓ Stay consistent
              </p>
            </div>
          </div>

          <p
            id="about"
            className="mt-7 text-[9px] font-bold tracking-[2px] text-slate-500"
          >
            YOUR GOALS. YOUR PACE. YOUR FUTURE.
          </p>
        </section>

        {/* Right section */}
        <section className="mx-auto w-full max-w-md lg:justify-self-end">
          {children}
        </section>
      </main>
    </div>
  );
}

export default AuthLayout;