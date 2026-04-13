"use client";

/**
 * Global error boundary — catches errors in the root layout itself.
 * Must render its own <html>/<body> since the root layout may have failed.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "2rem", textAlign: "center" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>Something went wrong</h1>
        <p style={{ marginTop: "0.5rem", color: "#666" }}>
          An unexpected error occurred. Please try again.
        </p>
        {error.digest && (
          <p style={{ marginTop: "0.25rem", color: "#999", fontSize: "0.75rem" }}>
            Error ID: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          style={{
            marginTop: "1.5rem",
            padding: "0.5rem 1.5rem",
            backgroundColor: "#059669",
            color: "white",
            border: "none",
            borderRadius: "0.5rem",
            cursor: "pointer",
            fontSize: "0.875rem",
            fontWeight: 600,
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
