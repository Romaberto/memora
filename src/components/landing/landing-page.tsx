"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { NeuronNetwork } from "./neuron-network";
import { HeroQuizDemo } from "./hero-quiz-demo";
import { MetricStrip } from "./metric-strip";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

const fade = {
  initial: { opacity: 0, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-40px" },
  transition: { duration: 0.3, ease: EASE_OUT },
};

const features = [
  {
    icon: "⚡",
    title: "Instant AI Quizzes",
    body: "Paste notes or name a topic — sharp questions generated in seconds.",
    bg: "bg-amber-50",
    iconBg: "bg-amber-100",
  },
  {
    icon: "🧠",
    title: "Active Recall",
    body: "Retrieval practice is proven to boost memory better than re-reading.",
    bg: "bg-emerald-50",
    iconBg: "bg-emerald-100",
  },
  {
    icon: "🏆",
    title: "Earn Points",
    body: "Every quiz earns XP. Climb the leaderboard against other learners.",
    bg: "bg-blue-50",
    iconBg: "bg-blue-100",
  },
  {
    icon: "📈",
    title: "Track Progress",
    body: "See streaks, accuracy trends, and personal bests on your dashboard.",
    bg: "bg-purple-50",
    iconBg: "bg-purple-100",
  },
  {
    icon: "🔄",
    title: "Instant Feedback",
    body: "Explanations after each answer help you correct mistakes fast.",
    bg: "bg-rose-50",
    iconBg: "bg-rose-100",
  },
  {
    icon: "🌍",
    title: "Learn Anything",
    body: "Books, podcasts, lectures, videos, conversations — any topic, any format.",
    bg: "bg-teal-50",
    iconBg: "bg-teal-100",
  },
];

const steps = [
  { n: "1", title: "Paste your material", body: "Notes from a lecture, a podcast transcript, a book summary, or just a topic name.", color: "bg-emerald-100 text-emerald-700" },
  { n: "2", title: "Generate the quiz", body: "AI creates focused multiple-choice questions in seconds.", color: "bg-amber-100 text-amber-700" },
  { n: "3", title: "Play & remember", body: "Answer questions, earn points, and watch your knowledge grow.", color: "bg-blue-100 text-blue-700" },
];

const faqs = [
  {
    q: "What is retrieval practice?",
    a: "Retrieval practice means actively recalling information — like answering questions — rather than only re-reading. Research shows this improves long-term retention significantly.",
  },
  {
    q: "Is this a replacement for reading?",
    a: "No. Memora complements your reading by prompting recall in a structured, game-like way that makes knowledge stick.",
  },
  {
    q: "How many questions should I generate?",
    a: "Start with 10 for a quick check, or 20–30 for deeper coverage. The more notes you provide, the better the questions.",
  },
];

export function LandingPage() {
  return (
    <div className="overflow-x-hidden">

      {/* ── HERO ── */}
      <section className="relative overflow-hidden">
        {/* Animated neuron network */}
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
                Turn anything you read, watch, or listen to into a quiz —
                books, podcasts, lectures, even a great film. Earn points,
                beat your scores, and build real long-term memory.
              </p>

              <div className="mt-6 flex flex-wrap gap-3 sm:mt-8">
                <Link href="/dashboard">
                  <Button type="button" className="!px-7 !py-3 !text-base !rounded-2xl">
                    Start for free →
                  </Button>
                </Link>
                <Link href="/dashboard">
                  <Button type="button" variant="outline" className="!px-7 !py-3 !text-base !rounded-2xl">
                    Try a quiz
                  </Button>
                </Link>
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

      {/* ── METRIC STRIP — research-backed proof ── */}
      <MetricStrip />

      {/* ── HOW IT WORKS ── */}
      <section className="py-12 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <motion.div {...fade} className="mb-8 text-center sm:mb-12">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-emerald-600 sm:text-sm">
              How it works
            </p>
            <h2 className="text-2xl font-bold sm:text-4xl">
              Three steps to remember more
            </h2>
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

      {/* ── FEATURES ── */}
      <section className="py-12 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <motion.div {...fade} className="mb-8 text-center sm:mb-12">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-amber-600 sm:text-sm">
              Features
            </p>
            <h2 className="text-2xl font-bold sm:text-4xl">
              Built for serious learners
            </h2>
          </motion.div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                {...fade}
                transition={{ duration: 0.3, ease: EASE_OUT, delay: i * 0.05 }}
                className="card-soft group flex flex-col gap-2 rounded-2xl p-4 sm:flex-row sm:gap-4 sm:p-5"
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl sm:h-12 sm:w-12 sm:text-2xl ${f.iconBg}`}>
                  {f.icon}
                </span>
                <div>
                  <h3 className="text-sm font-bold leading-snug">{f.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-[rgb(var(--muted))] sm:text-sm">{f.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── THE SCIENCE ── */}
      <section className="py-12 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <motion.div
            {...fade}
            className="overflow-hidden rounded-3xl border border-[rgb(var(--border))] bg-white p-5 shadow-soft sm:p-10"
          >
            <div className="max-w-2xl">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-emerald-600 sm:text-sm">
                The science
              </p>
              <h2 className="text-xl font-bold sm:text-3xl">
                Why quizzes outperform re-reading
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[rgb(var(--muted))] sm:mt-4 sm:text-base">
                When you pull information out of memory rather than recognizing it,
                you strengthen the neural pathways you will need later. Short questions
                with immediate feedback let you correct mistakes early and reinforce recall.
              </p>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-2.5 sm:mt-8 sm:gap-3">
              {[
                { label: "Retrieval over recognition", body: "Questions push you to produce answers, not just nod along.", bg: "bg-emerald-50" },
                { label: "Feedback that teaches", body: "Explanations connect each choice back to the core idea.", bg: "bg-blue-50" },
                { label: "Spaced repetition", body: "Retake quizzes over time to lock knowledge permanently.", bg: "bg-amber-50" },
                { label: "Gamification works", body: "Points and streaks turn learning into a daily habit.", bg: "bg-rose-50" },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`rounded-xl ${item.bg} p-3 sm:p-4`}
                >
                  <p className="text-xs font-semibold leading-snug text-[rgb(var(--foreground))] sm:text-sm">{item.label}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-[rgb(var(--muted))] sm:text-xs">{item.body}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FAQ ── */}
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

      {/* ── CTA ── */}
      <section className="pb-16 pt-4 sm:pb-24 sm:pt-8">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <motion.div
            {...fade}
            className="overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-500 p-6 text-center text-white sm:p-14"
          >
            <h2 className="text-2xl font-extrabold sm:text-4xl">
              Ready to level up your memory?
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm text-emerald-100 sm:mt-4 sm:text-base">
              Join Memora and turn every study session into a game you want to play.
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

      {/* ── FOOTER ── */}
      <footer className="border-t border-[rgb(var(--border))] py-8 text-center text-sm text-[rgb(var(--muted))]">
        <p>
          © {new Date().getFullYear()}{" "}
          <span className="font-semibold text-[rgb(var(--foreground))]">memora</span>
          {" "}· Make knowledge stick.
        </p>
      </footer>
    </div>
  );
}
