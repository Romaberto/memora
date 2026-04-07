import Link from "next/link";
import { cookies } from "next/headers";
import { Button } from "./ui/button";
import { UserAvatar } from "./user-avatar";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { findById } from "@/lib/csv-users";
import { LogoutButton } from "./logout-button";

async function getNavUser() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const userId = await verifySessionToken(token);
  if (!userId) return null;
  return await findById(userId);
}

export async function NavActions() {
  const user = await getNavUser();

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/login">
          <Button type="button" variant="ghost" className="!py-2 !text-sm">
            Sign in
          </Button>
        </Link>
        <Link href="/register">
          <Button type="button" variant="primary" className="!py-2 !text-sm">
            Register
          </Button>
        </Link>
      </div>
    );
  }

  const displayName = user.nickname || user.name || user.email;

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <Link href="/dashboard">
        <Button type="button" variant="primary" className="!py-2 !text-sm">
          Dashboard
        </Button>
      </Link>

      <Link
        href="/leaderboard"
        className="hidden text-sm font-medium text-slate-600 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white sm:block"
      >
        Leaderboard
      </Link>

      {/* Avatar + name → profile page */}
      <Link
        href="/profile"
        className="group flex items-center gap-2 rounded-xl px-2 py-1 transition hover:bg-slate-100 dark:hover:bg-slate-800"
        title="Your profile"
      >
        <UserAvatar
          src={user.avatarUrl || null}
          name={displayName}
          size="sm"
        />
        <span className="hidden text-sm font-medium text-slate-700 group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-white sm:block">
          {displayName}
        </span>
      </Link>

      <LogoutButton />
    </div>
  );
}
