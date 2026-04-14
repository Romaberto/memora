/**
 * Editorial card surface — no border by default, subtle ink-shadow for
 * figure/ground separation. Tighter radius (lg / 8px) to match the
 * rest of the editorial system. Hover is gated by the global
 * `hoverOnlyWhenSupported` Tailwind flag so it doesn't stick on mobile.
 */
export function Card({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-lg bg-white p-5 shadow-[0_1px_2px_rgba(26,26,32,0.04)] transition-shadow duration-200 ease-[var(--ease-out)] hover:shadow-[0_2px_6px_rgba(26,26,32,0.08)] ${className}`}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3
      className={`font-editorial text-xl leading-none tracking-tight text-[rgb(var(--foreground))] ${className}`}
    >
      {children}
    </h3>
  );
}
