import Link from "next/link";
import { cookies } from "next/headers";
import { Button } from "./ui/button";
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

export async function NavActions() {
  const user = await getNavUser();

  if (!user) {
    return (
      <>
        {/* Desktop */}
        <div className="hidden items-center gap-2 sm:flex">
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

        {/* Mobile */}
        <MobileMenu user={null} />
      </>
    );
  }

  const displayName = user.nickname || user.name || user.email;

  return (
    <>
      {/* Desktop */}
      <div className="hidden items-center gap-2 sm:flex sm:gap-3">
        <Link href="/dashboard">
          <Button type="button" variant="primary" className="!py-2 !text-sm">
            Dashboard
          </Button>
        </Link>

        <Link
          href="/leaderboard"
          className="text-sm font-medium text-[rgb(var(--muted))] transition-colors duration-150 ease-out hover:text-[rgb(var(--foreground))]"
        >
          Leaderboard
        </Link>

        {/* Avatar + name → profile page */}
        <Link
          href="/profile"
          className="group flex items-center gap-2 rounded-xl px-2 py-1 transition-[background-color,transform] duration-150 ease-out hover:bg-black/5 active:scale-[0.97]"
          title="Your profile"
        >
          <UserAvatar
            src={user.avatarUrl || null}
            name={displayName}
            size="sm"
          />
          <span className="text-sm font-medium text-[rgb(var(--muted))] transition-colors duration-150 ease-out group-hover:text-[rgb(var(--foreground))]">
            {displayName}
          </span>
        </Link>

        <LogoutButton />
      </div>

      {/* Mobile */}
      <div className="flex items-center gap-1 sm:hidden">
        <Link
          href="/profile"
          aria-label={`${displayName} — your profile`}
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
