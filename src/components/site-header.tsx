import Link from "next/link";
import Image from "next/image";
import { NavActions } from "./nav-actions";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[rgb(var(--border))] bg-[rgb(var(--background))]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-xl transition-transform duration-150 ease-out active:scale-[0.97]"
        >
          <Image
            src="/logo.png"
            alt="Memora"
            width={44}
            height={44}
            className="rounded-xl"
          />
          <span className="text-xl font-bold tracking-tight text-[rgb(var(--foreground))] max-[374px]:hidden">
            memora
          </span>
        </Link>
        <NavActions />
      </div>
    </header>
  );
}
