import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "./theme-toggle";
import { NavActions } from "./nav-actions";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[rgb(var(--border))] bg-[rgb(var(--background))]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="Memora" width={44} height={44} className="mix-blend-screen" />
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
