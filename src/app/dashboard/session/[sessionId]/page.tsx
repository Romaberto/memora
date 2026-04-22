import prisma from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { encouragingMessage } from "@/lib/ranks";
import { formatDateTimeStable } from "@/lib/format-date";
import { formatDurationHuman } from "@/lib/format-quiz-clock";
import { getUserSubscription } from "@/lib/subscription";
import { RelatedTopicsCard } from "@/components/dashboard/related-topics-card";

type PageProps = { params: { sessionId: string } };

export default async function SessionReviewPage({ params }: PageProps) {
  const userId = await requireUserId();
  const { sessionId } = params;

  const [row, subscriptionTier] = await Promise.all([
    prisma.quizSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        quizRequest: true,
        answers: { include: { quizQuestion: true } },
      },
    }),
    getUserSubscription(userId),
  ]);

  if (!row) notFound();

  const ordered = [...row.answers].sort(
    (a, b) => a.quizQuestion.order - b.quizQuestion.order,
  );

  const pct = Math.round(row.percentage);
  const msg = encouragingMessage(row.percentage);

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6">
      <Link href="/dashboard">
        <Button type="button" variant="ghost" className="!px-0 !text-sm">
          ← Back to dashboard
        </Button>
      </Link>

      <Card>
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">
          Session review
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          {row.quizRequest.title ?? row.quizRequest.topic}
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {formatDateTimeStable(row.createdAt)} · {row.questionCount}{" "}
          questions
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-slate-500">Score</p>
            <p className="text-xl font-bold">{row.score}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Correct</p>
            <p className="text-xl font-bold">
              {ordered.filter((a) => a.isCorrect).length} / {row.questionCount}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Rank</p>
            <p className="text-xl font-bold">{row.rankName}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Time</p>
            <p className="text-xl font-bold">
              {row.durationSeconds != null && row.durationSeconds > 0
                ? formatDurationHuman(row.durationSeconds)
                : "–"}
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
          {pct}% · {msg}
        </p>
      </Card>

      <RelatedTopicsCard
        sessionId={row.id}
        subscriptionTier={subscriptionTier}
      />

      <section className="space-y-4">
        <CardTitle className="text-lg">Question breakdown</CardTitle>
        <ul className="space-y-4">
          {ordered.map((a, i) => {
            const q = a.quizQuestion;
            let opts: string[];
            try {
              const parsed = JSON.parse(q.options);
              opts = Array.isArray(parsed) ? (parsed as string[]) : [];
            } catch {
              opts = [];
            }
            return (
              <li key={a.id}>
                <Card className="border-slate-200/90 dark:border-slate-700">
                  <p className="text-xs font-semibold text-slate-500">
                    Question {i + 1}
                  </p>
                  <p className="mt-1 font-medium">{q.question}</p>
                  <ul className="mt-3 space-y-1 text-sm">
                    {a.selectedIndex < 0 ? (
                      <li className="rounded-lg bg-rose-50 px-2 py-1 text-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
                        Timed out before an answer was selected.
                      </li>
                    ) : null}
                    {opts.map((opt, j) => {
                      const isCorrect = j === q.correctIndex;
                      const picked = j === a.selectedIndex;
                      return (
                        <li
                          key={j}
                          className={`rounded-lg px-2 py-1 ${
                            isCorrect
                              ? "bg-emerald-50 font-medium text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
                              : picked
                                ? "bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-100"
                                : "text-slate-600 dark:text-slate-300"
                          }`}
                        >
                          {String.fromCharCode(65 + j)}. {opt}
                          {isCorrect ? " ✓" : ""}
                          {picked && !isCorrect ? " (your answer)" : ""}
                        </li>
                      );
                    })}
                  </ul>
                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                    {q.explanation}
                  </p>
                </Card>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href={`/dashboard/quiz/${row.quizRequestId}`}>
          <Button type="button">Retry this quiz</Button>
        </Link>
        <Link href="/dashboard">
          <Button type="button" variant="outline">
            New quiz
          </Button>
        </Link>
      </div>
    </div>
  );
}
