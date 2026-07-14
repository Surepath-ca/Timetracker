/**
 * SurePath logo. Renders the official artwork from /public as-is
 * (transparent PNG, dark wordmark + "Valuation & Advisory"). Size via `className`
 * (set a height; width scales automatically).
 */
export default function Logo({ className = "h-9" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/surepath-logo.png"
      alt="SurePath Valuation & Advisory"
      className={`${className} w-auto`}
    />
  );
}
