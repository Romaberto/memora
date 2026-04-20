import Link from "next/link";
import { cookies } from "next/headers";
import { UserAvatar } from "./user-avatar";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { findById } from "@/lib/csv-users";
import { LogoutButton } from "./logout-button";
import { MobileMenu } from "./mobile-menu";

async function getNavUser() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const userId = await verifySessionToken(token);
  if (!userId) return null;
  return await findById(userId);
}

function NavLink({
  href,
  children,
  variant = "default",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "default" | "primary";
}) {
  return (
    <Link
      href={href}
      className={
        variant === "primary"
          ? "rounded-xl border border-[rgb(var(--accent)/0.24)] bg-[rgb(var(--accent)/0.10)] px-3 py-2 text-sm font-semibold text-[rgb(var(--accent-ink))] shadow-[0_1px_2px_rgba(26,26,32,0.04)] transition-[background-color,border-color,transform] duration-150 ease-out hover:border-[rgb(var(--accent)/0.34)] hover:bg-[rgb(var(--accent)/0.16)] active:scale-[0.97]"
          : "rounded-lg px-3 py-2 text-sm font-medium text-[rgb(var(--foreground))]/70 transition-colors duration-150 ease-out hover:bg-black/5 hover:text-[rgb(var(--foreground))] dark:hover:bg-white/5"
      }
    >
      {children}
    </Link>
  );
}

export async function NavActions() {
  const user = await getNavUser();

  if (!user) {
    return (
      <>
        {/* Desktop */}
        <div className="hidden items-center gap-1 md:flex">
          <NavLink href="/topics">Topics</NavLink>
          <NavLink href="/leaderboard">Leaderboard</NavLink>
          <NavLink href="/pricing">Pricing</NavLink>
          <div className="ml-2 h-5 w-px bg-slate-200 dark:bg-slate-700" />
          <Link
            href="/login"
            className="ml-2 rounded-lg px-3 py-2 text-sm font-medium text-[rgb(var(--foreground))]/70 transition-colors duration-150 ease-out hover:text-[rgb(var(--foreground))]"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm transition-[background-color,transform] duration-150 ease-out hover:bg-emerald-600 active:scale-[0.97]"
          >
            Register
          </Link>
        </div>

        {/* Mobile + Tablet */}
        <MobileMenu user={null} />
      </>
    );
  }

  const displayName = user.nickname || user.name || user.email;

  return (
    <>
      {/* Desktop */}
      <div className="hidden items-center gap-1 md:flex">
        <NavLink href="/dashboard" variant="primary">
          Dashboard
        </NavLink>
        <NavLink href="/topics">Topics</NavLink>
        <NavLink href="/leaderboard">Leaderboard</NavLink>
        <NavLink href="/pricing">Pricing</NavLink>

        <div className="ml-2 h-5 w-px bg-slate-200 dark:bg-slate-700" />

        {/* Avatar + name → profile page */}
        <Link
          href="/profile"
          className="group ml-2 flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors duration-150 ease-out hover:bg-black/5 dark:hover:bg-white/5"
          title="Your profile"
        >
          <UserAvatar
            src={user.avatarUrl || null}
            name={displayName}
            size="sm"
          />
          <span className="text-sm font-medium text-[rgb(var(--foreground))]/70 transition-colors duration-150 ease-out group-hover:text-[rgb(var(--foreground))]">
            {displayName}
          </span>
        </Link>

        <LogoutButton />
      </div>

      {/* Mobile + Tablet */}
      <div className="flex items-center gap-1 md:hidden">
        <Link
          href="/dashboard"
          className="inline-flex h-10 items-center justify-center rounded-xl border border-[rgb(var(--accent)/0.24)] bg-[rgb(var(--accent)/0.10)] px-3 text-xs font-semibold text-[rgb(var(--accent-ink))] shadow-[0_1px_2px_rgba(26,26,32,0.04)] transition-[background-color,border-color,transform] duration-150 ease-out hover:border-[rgb(var(--accent)/0.34)] hover:bg-[rgb(var(--accent)/0.16)] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Dashboard
        </Link>
        <Link
          href="/profile"
          aria-label={`${displayName} · your profile`}
          title="Your profile"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl transition-[background-color,transform] duration-150 ease-out hover:bg-black/5 active:scale-[0.94]"
        >
          <UserAvatar
            src={user.avatarUrl || null}
            name={displayName}
            size="sm"
          />
        </Link>
        <MobileMenu
          user={{
            displayName,
            avatarUrl: user.avatarUrl || null,
          }}
        />
      </div>
    </>
  );
}
