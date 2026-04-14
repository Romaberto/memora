import Link from "next/link";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

/**
 * Site-wide footer.
 *
 * Mounted once in the root layout so every page gets the legal + contact
 * links (Contact / Privacy / Terms). This is a server component so we can
 * read the session cookie and swap "Sign in" for "Dashboard" without a
 * client-side flicker. Visual style mirrors the footer that used to live
 * inside landing-page.tsx (the original canonical treatment).
 *
 * The root layout uses `flex min-h-screen flex-col` with `flex-1` on the
 * main element, so this footer auto-sticks to the viewport bottom when
 * page content is short.
 */
export async function SiteFooter() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const isLoggedIn = !!(token && (await verifySessionToken(token)));

  return (
    <footer className="mt-auto border-t border-[rgb(var(--border))] py-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 sm:flex-row sm:justify-between sm:px-6">
        <p className="text-sm text-[rgb(var(--muted))]">
          © {new Date().getFullYear()}{" "}
          <span className="font-semibold text-[rgb(var(--foreground))]">
            memora
          </span>{" "}
          · Make knowledge stick.
        </p>
        <nav
          aria-label="Footer"
          className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-[rgb(var(--muted))]"
        >
          {isLoggedIn ? (
            <FooterLink href="/dashboard">Dashboard</FooterLink>
          ) : (
            <FooterLink href="/login">Sign in</FooterLink>
          )}
          <FooterLink href="/pricing">Pricing</FooterLink>
          <FooterLink href="/contact">Contact</FooterLink>
          <FooterLink href="/privacy">Privacy</FooterLink>
          <FooterLink href="/terms">Terms</FooterLink>
        </nav>
      </div>
    </footer>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="transition-colors duration-150 ease-out hover:text-[rgb(var(--foreground))]"
    >
      {children}
    </Link>
  );
}
