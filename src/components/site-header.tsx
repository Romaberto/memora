import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";
import { NavActions } from "./nav-actions";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[rgb(var(--border))] bg-[rgb(var(--background))]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          {/* Gradient logo mark */}
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-green-400 to-cyan-500 text-sm font-bold text-white shadow-glow-sm">
            M
          </span>
          <span className="text-lg font-bold tracking-tight gradient-text">
            memora
          </span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <NavActions />
        </div>
      </div>
    </header>
  );
}
