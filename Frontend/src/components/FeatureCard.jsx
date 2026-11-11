function FeatureCard({ icon, title, description, color }) {
  const colors = {
    blue: "bg-blue-500/10 text-blue-300 ring-blue-400/20",
    purple: "bg-purple-500/10 text-purple-300 ring-purple-400/20",
    cyan: "bg-cyan-500/10 text-cyan-300 ring-cyan-400/20",
    green: "bg-emerald-500/10 text-emerald-300 ring-emerald-400/20",
  };

  const colorClass = colors[color] || colors.blue;

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl ring-1 ${colorClass}`}
      >
        {icon}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-100">
          {title}
        </h3>

        <p className="mt-1 text-xs leading-5 text-slate-400">
          {description}
        </p>
      </div>
    </div>
  );
}

export default FeatureCard;