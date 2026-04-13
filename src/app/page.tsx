import prisma from "@/lib/db";
import { LandingPage } from "@/components/landing/landing-page";

export default async function Home() {
  // Fetch live stats for the social proof section. Each query is wrapped
  // so a DB hiccup doesn't break the landing page — we just hide the
  // counter and show a static fallback instead.
  const [quizCount, userCount] = await Promise.all([
    prisma.quizRequest
      .count({ where: { usedFallback: false } })
      .catch(() => 0),
    prisma.user.count().catch(() => 0),
  ]);

  return <LandingPage quizCount={quizCount} userCount={userCount} />;
}
