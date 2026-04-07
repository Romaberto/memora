import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";
import { NavActions } from "./nav-actions";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[rgb(var(--border))] bg-[rgb(var(--card))]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-sm font-bold text-white">
            M
          </span>
          <span className="text-lg font-semibold tracking-tight">Memorize</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <NavActions />
        </div>
      </div>
    </header>
  );
}
