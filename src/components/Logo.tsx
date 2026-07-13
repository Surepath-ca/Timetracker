export default function Logo({ light = false, size = "md" }: { light?: boolean; size?: "md" | "lg" }) {
  const textColor = light ? "text-white" : "text-navy-900";
  const subColor = light ? "text-navy-200" : "text-slate-500";
  const nameSize = size === "lg" ? "text-2xl" : "text-lg";
  return (
    <div className="flex items-center gap-3">
      <svg
        viewBox="0 0 40 40"
        className={size === "lg" ? "h-11 w-11" : "h-9 w-9"}
        aria-hidden="true"
      >
        <rect x="1" y="1" width="38" height="38" rx="6" fill="#16324f" />
        {/* rising path with checkpoint dots — "sure path" */}
        <path
          d="M8 30 L17 21 L23 25 L32 12"
          fill="none"
          stroke="#c9a227"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="32" cy="12" r="3" fill="#c9a227" />
      </svg>
      <div className="leading-tight">
        <div className={`${nameSize} font-bold tracking-tight ${textColor}`}>
          SurePath
          <span className={light ? "text-gold-300" : "text-gold-600"}> Time</span>
        </div>
        <div className={`text-[11px] uppercase tracking-[0.18em] ${subColor}`}>
          Valuation &amp; Advisory
        </div>
      </div>
    </div>
  );
}
