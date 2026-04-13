"use client";

/**
 * Catch-all error boundary for the app. Shows a user-friendly message
 * instead of a blank screen or framework error details.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        Something went wrong
      </h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        An unexpected error occurred. Please try again, or contact support if
        the problem persists.
      </p>
      {error.digest && (
        <p className="mt-1 text-xs text-slate-400">Error ID: {error.digest}</p>
      )}
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}
