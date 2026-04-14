import type { Metadata } from "next";
import { cookies } from "next/headers";
import prisma from "@/lib/db";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { PricingTable } from "@/components/pricing/pricing-table";
import { PricingWaitlistCta } from "@/components/pricing/pricing-waitlist-cta";

export const metadata: Metadata = {
  title: "Pricing · Memora",
  description:
    "Start free with 25 topic libraries. Upgrade to turn your own notes, books, and lectures into custom quizzes.",
};

/**
 * /pricing — public tier comparison page.
 *
 * Server component so we can render the "Current plan" state for logged-in
 * users without a client-side flicker. Unauth visitors still get the full
 * page; their "current plan" is effectively free.
 *
 * We also look up the waitlist row (by the logged-in user's email, if any)
 * so the "Join the waitlist" CTA can render in its already-joined state
 * instead of asking the user for an email they've already given us on the
 * dashboard. Same table, same backend — one waitlist, two surfaces.
 */
export default async function PricingPage() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  let currentTier: string | null = null;
  let userEmail: string | null = null;
  let alreadyOnWaitlist = false;

  if (token) {
    const userId = await verifySessionToken(token);
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { subscriptionTier: true, email: true },
      });
      // Map any legacy `pro` rows to `master` for correct "current plan"
      // highlighting before the migration runs.
      currentTier =
        user?.subscriptionTier === "pro"
          ? "master"
          : user?.subscriptionTier ?? null;
      userEmail = user?.email ?? null;

      if (userEmail) {
        const existing = await prisma.waitlistSignup.findUnique({
          where: { email: userEmail },
          select: { id: true },
        });
        alreadyOnWaitlist = !!existing;
      }
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="mx-auto max-w-2xl text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[rgb(var(--accent-ink))]">
          Pricing
        </p>
        <h1 className="mt-3 text-4xl font-extrabold leading-[1.1] tracking-tight text-[rgb(var(--foreground))] sm:text-5xl">
          Start free.{" "}
          <span className="gradient-text">Pick a plan when you’re ready.</span>
        </h1>
        <p className="mt-4 text-base leading-relaxed text-[rgb(var(--muted))]">
          Free forever to play the pre-made library. Paid plans unlock custom
          quizzes from your own books, notes, and lectures.
        </p>
      </header>

      {/* Shared waitlist CTA — same modal + endpoint as the dashboard upsell.
          No tier selection; this is the general "tell me when paid plans
          launch" capture. Sits ABOVE the pricing table while we're still
          pre-launch: paid tiers are all "Coming soon" so the waitlist is
          the only live conversion path on this page. When plans go live,
          flip the order (or drop this block entirely). */}
      <div className="mt-10">
        <PricingWaitlistCta
          userEmail={userEmail}
          alreadyOnWaitlist={alreadyOnWaitlist}
        />
      </div>

      <div className="mt-10">
        <PricingTable currentTier={currentTier} />
      </div>

      {/* FAQ — four questions people actually ask */}
      <section className="mx-auto mt-20 max-w-3xl">
        <h2 className="text-center text-2xl font-bold tracking-tight text-[rgb(var(--foreground))] sm:text-3xl">
          Questions, answered.
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <FaqItem q="Can I cancel anytime?">
            Yes. Month-to-month with a one-click cancel. Annual plans stop
            renewing at the end of the year; you keep access until then.
          </FaqItem>
          <FaqItem q="Will the free tier always be free?">
            Always. All 25 topic libraries with 10 quizzes each — about 250
            quizzes — stay free with full leaderboard and streak support.
          </FaqItem>
          <FaqItem q="What happens if I downgrade?">
            You keep your history and scores. Custom-quiz generation pauses,
            but everything you’ve played stays intact and pre-made quizzes
            remain open.
          </FaqItem>
          <FaqItem q="Do you offer student discounts?">
            Yes. Email us from your .edu address and we’ll send you a code for
            50% off any paid plan.
          </FaqItem>
        </div>
      </section>
    </main>
  );
}

function FaqItem({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[rgb(var(--border))] bg-white p-5 shadow-[0_1px_2px_rgba(26,26,32,0.04)]">
      <p className="font-semibold text-[rgb(var(--foreground))]">{q}</p>
      <p className="mt-2 text-sm leading-relaxed text-[rgb(var(--muted))]">
        {children}
      </p>
    </div>
  );
}
