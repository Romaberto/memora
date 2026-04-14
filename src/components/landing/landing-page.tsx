"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { NeuronNetwork } from "./neuron-network";
import { HeroQuizDemo } from "./hero-quiz-demo";
import { MetricStrip } from "./metric-strip";

/* ------------------------------------------------------------------ */
/*  Shared animation preset                                            */
/* ------------------------------------------------------------------ */

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

const fade = {
  initial: { opacity: 0, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-40px" },
  transition: { duration: 0.3, ease: EASE_OUT },
};

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const steps = [
  {
    n: "1",
    title: "Paste anything",
    body: "Drop in lecture notes, a podcast transcript, a book summary, or just a topic name. AI builds focused questions tailored to your material, not generic trivia.",
    color: "bg-emerald-100 text-emerald-700",
  },
  {
    n: "2",
    title: "Remember 2\u00d7 more",
    body: "Active recall is proven to double retention versus re-reading. Every question you answer strengthens the neural pathways you\u2019ll need later.",
    color: "bg-amber-100 text-amber-700",
  },
  {
    n: "3",
    title: "Watch yourself improve",
    body: "Earn points, track streaks and accuracy trends on your dashboard. See exactly where you\u2019re growing, and where to focus next.",
    color: "bg-blue-100 text-blue-700",
  },
];

const faqs = [
  {
    q: "Is Memora free?",
    a: "Yes. You get 3 quizzes per day for free, with up to 10 questions each. That\u2019s plenty for a daily study habit. A Pro plan is coming for power users who want more.",
  },
  {
    q: "What kind of material can I paste in?",
    a: "Anything text-based: lecture notes, book highlights, podcast transcripts, meeting notes, Wikipedia articles, even just a topic name like \u201cPhotosynthesis.\u201d The more context you give, the sharper the questions.",
  },
  {
    q: "Does it work on my phone?",
    a: "Yes. Memora is fully responsive. Just open it in your mobile browser, no app install required.",
  },
  {
    q: "What happens to my notes after I paste them?",
    a: "Your text is sent to the AI model to generate questions, then the quiz is saved to your account. We don\u2019t sell or share your content.",
  },
  {
    q: "How is this different from flashcards?",
    a: "Flashcards test recall of isolated facts. Memora generates contextual multiple-choice questions with explanations, closer to how exams and real understanding work. Plus you earn points, compete on the leaderboard, and get a progress dashboard.",
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function LandingPage({
  quizCount = 0,
  userCount = 0,
}: {
  quizCount?: number;
  userCount?: number;
}) {
  return (
    <div className="overflow-x-hidden">

      {/* ── HERO ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <NeuronNetwork className="opacity-40" />

        {/* Soft gradient blobs */}
        <div className="pointer-events-none absolute -top-20 right-0 h-[400px] w-[400px] rounded-full bg-emerald-100/50 blur-[100px]" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-[300px] w-[300px] rounded-full bg-amber-100/40 blur-[80px]" />

        <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-8 sm:px-6 sm:pb-24 sm:pt-20">
          <div className="grid items-center gap-8 sm:gap-12 lg:grid-cols-2">
            {/* Left — copy */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: EASE_OUT }}
            >
              <div className="mb-5 inline-flex max-w-full items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-700">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500 animate-pulse" />
                <span className="truncate">
                  Quizzes <span className="font-bold">double</span> what you remember
                </span>
              </div>

              <h1 className="text-[2.25rem] font-extrabold leading-[1.1] tracking-tight text-[rgb(var(--foreground))] sm:text-5xl lg:text-6xl">
                Make knowledge{" "}
                <span className="gradient-text">stick.</span>
              </h1>

              <p className="mt-4 max-w-lg text-base leading-relaxed text-[rgb(var(--muted))] sm:mt-5 sm:text-lg">
                Turn anything you read, watch, or listen to into a quiz.
                Books, podcasts, lectures, even a great film. Earn points,
                beat your scores, and build real long-term memory.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-4 sm:mt-8">
                <Link href="/dashboard">
                  <Button type="button" className="!px-7 !py-3 !text-base !rounded-2xl">
                    Start for free →
                  </Button>
                </Link>
                {quizCount >= 50 && (
                  <span className="text-sm text-[rgb(var(--muted))]">
                    <span className="font-semibold text-[rgb(var(--foreground))] tabular-nums">
                      {quizCount.toLocaleString()}
                    </span>{" "}
                    quizzes generated
                  </span>
                )}
              </div>
            </motion.div>

            {/* Right — live quiz demo */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.1, ease: EASE_OUT }}
              className="flex justify-center lg:justify-end"
            >
              <HeroQuizDemo />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── METRIC STRIP — research proof ────────────────────── */}
      <MetricStrip />

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section className="py-12 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <motion.div {...fade} className="mb-8 text-center sm:mb-12">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-emerald-600 sm:text-sm">
              How it works
            </p>
            <h2 className="text-2xl font-bold sm:text-4xl">
              Not another flashcard app
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-[rgb(var(--muted))] sm:text-base">
              Flashcards test isolated facts. Memora generates contextual
              questions from <em>your</em> material, with explanations,
              gamification, and a dashboard that shows you growing.
            </p>
          </motion.div>

          <div className="grid gap-4 md:grid-cols-3">
            {steps.map((s, i) => (
              <motion.div
                key={s.n}
                {...fade}
                transition={{ duration: 0.3, ease: EASE_OUT, delay: i * 0.06 }}
                className="card-soft flex flex-col gap-3 rounded-2xl p-5"
              >
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg font-bold ${s.color}`}>
                  {s.n}
                </span>
                <h3 className="text-lg font-bold">{s.title}</h3>
                <p className="text-sm leading-relaxed text-[rgb(var(--muted))]">{s.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF ─────────────────────────────────────── */}
      {/* Only show live counters once they look credible (>50 quizzes). */}
      {/* Below that threshold we just lean on the MetricStrip research stats. */}
      {(quizCount >= 50 || userCount >= 20) && (
        <section className="py-10 sm:py-16">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <motion.div
              {...fade}
              className="flex items-center justify-center gap-10 rounded-2xl border border-[rgb(var(--border))] bg-white px-6 py-8 text-center shadow-soft sm:gap-16 sm:px-10 sm:py-10"
            >
              {quizCount >= 50 && (
                <div>
                  <p className="text-3xl font-extrabold tabular-nums gradient-text sm:text-4xl">
                    {quizCount.toLocaleString()}
                  </p>
                  <p className="mt-1 text-sm font-medium text-[rgb(var(--muted))]">
                    quizzes generated
                  </p>
                </div>
              )}
              {userCount >= 20 && (
                <div>
                  <p className="text-3xl font-extrabold tabular-nums gradient-text sm:text-4xl">
                    {userCount.toLocaleString()}
                  </p>
                  <p className="mt-1 text-sm font-medium text-[rgb(var(--muted))]">
                    learners joined
                  </p>
                </div>
              )}
              <div>
                <p className="text-3xl font-extrabold tabular-nums gradient-text sm:text-4xl">
                  100+
                </p>
                <p className="mt-1 text-sm font-medium text-[rgb(var(--muted))]">
                  studies behind the method
                </p>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <section className="py-12 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <motion.div {...fade} className="mb-6 text-center sm:mb-10">
            <h2 className="text-xl font-bold sm:text-3xl">
              Frequently asked questions
            </h2>
          </motion.div>
          <div className="space-y-2.5 sm:space-y-3">
            {faqs.map((f) => (
              <details
                key={f.q}
                className="group card-soft rounded-2xl px-4 py-3.5 sm:px-5 sm:py-4"
              >
                <summary className="cursor-pointer list-none text-sm font-semibold outline-none marker:content-none [&::-webkit-details-marker]:hidden sm:text-base">
                  <span className="flex items-center justify-between gap-4">
                    {f.q}
                    <span className="text-emerald-500 transition-transform duration-200 ease-out group-open:rotate-45">+</span>
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-[rgb(var(--muted))]">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ───────────────────────────────────────── */}
      <section className="pb-16 pt-4 sm:pb-24 sm:pt-8">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <motion.div
            {...fade}
            className="overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-500 p-6 text-center text-white sm:p-14"
          >
            <h2 className="text-2xl font-extrabold sm:text-4xl">
              Ready to remember more?
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm text-emerald-100 sm:mt-4 sm:text-base">
              Three free quizzes a day. No credit card. Start building
              real long-term memory in under a minute.
            </p>
            <Link href="/dashboard" className="mt-6 inline-block sm:mt-8">
              <Button
                type="button"
                className="!bg-white !text-emerald-700 hover:!bg-emerald-50 !px-8 !py-3 !text-base !rounded-2xl !shadow-soft-md"
              >
                Start for free →
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer now lives in the root layout (see src/components/
          site-footer.tsx) so every page gets contact / privacy / terms
          links, not just the landing page. */}
    </div>
  );
}
