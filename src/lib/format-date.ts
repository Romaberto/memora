/**
 * Fixed locale + UTC so server and browser render the same string (avoids hydration errors).
 * Default `toLocaleString()` uses the runtime locale/time zone and differs between Node and Chrome.
 */
export function formatDateTimeStable(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(d);
}
