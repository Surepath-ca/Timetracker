/**
 * SurePath wordmark. Recreated as SVG so it scales crisply and adapts to light
 * or dark backgrounds. The signature blue rule (#355E8C) runs through the word.
 */
export default function Logo({
  variant = "dark",
  showTagline = false,
  className = "h-8",
}: {
  variant?: "dark" | "light";
  showTagline?: boolean;
  className?: string;
}) {
  const letters = variant === "light" ? "#ffffff" : "#243a54";
  const tagline = variant === "light" ? "#c7d9e8" : "#5b6b7d";
  return (
    <span className="inline-flex flex-col items-start leading-none">
      <svg
        viewBox="0 0 300 52"
        className={className}
        role="img"
        aria-label="SurePath"
        preserveAspectRatio="xMinYMid meet"
      >
        <text
          x="2"
          y="40"
          textLength="296"
          lengthAdjust="spacingAndGlyphs"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontWeight="700"
          fontSize="44"
          fill={letters}
        >
          SUREPATH
        </text>
        <rect x="2" y="23" width="296" height="4.5" fill="#355e8c" />
      </svg>
      {showTagline && (
        <span
          className="mt-1.5 w-full text-center text-[10px] font-medium uppercase tracking-[0.35em]"
          style={{ color: tagline }}
        >
          Valuation &amp; Advisory
        </span>
      )}
    </span>
  );
}
