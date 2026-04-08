"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { NeuronNetwork } from "./neuron-network";

const fade = {
  initial: { opacity: 0, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-40px" },
  transition: { duration: 0.45 },
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
    body: "Books, courses, articles — if you can read it, Memora quizzes you.",
    bg: "bg-teal-50",
    iconBg: "bg-teal-100",
  },
];

const steps = [
  { n: "1", title: "Paste your material", body: "Drop in notes, a book summary, or just a topic name.", color: "bg-emerald-100 text-emerald-700" },
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
        <NeuronNetwork className="opacity-60" />

        {/* Soft gradient blobs */}
        <div className="pointer-events-none absolute -top-20 right-0 h-[400px] w-[400px] rounded-full bg-emerald-100/50 blur-[100px]" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-[300px] w-[300px] rounded-full bg-amber-100/40 blur-[80px]" />

        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-12 sm:px-6 sm:pb-24 sm:pt-20">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Left — copy */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                AI-powered memory training
              </div>

              <h1 className="text-4xl font-extrabold leading-[1.15] tracking-tight text-[rgb(var(--foreground))] sm:text-5xl lg:text-6xl">
                Make knowledge{" "}
                <span className="gradient-text">stick.</span>
              </h1>

              <p className="mt-5 max-w-lg text-lg leading-relaxed text-[rgb(var(--muted))]">
                Turn anything you read into a quiz. Earn points, beat your scores,
                and build real long-term memory — not just highlights.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
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

            {/* Right — logo (desktop only) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="hidden justify-center lg:flex"
            >
              <div className="relative">
                <div className="absolute inset-0 scale-75 rounded-full bg-emerald-200/40 blur-[80px]" />
                <Image
                  src="/logo.png"
                  alt="Memora"
                  width={360}
                  height={360}
                  className="relative animate-float mix-blend-multiply"
                  priority
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <motion.div {...fade} className="mb-12 text-center">
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-emerald-600">
              How it works
            </p>
            <h2 className="text-3xl font-bold sm:text-4xl">
              Three steps to remember more
            </h2>
          </motion.div>

          <div className="grid gap-4 md:grid-cols-3">
            {steps.map((s, i) => (
              <motion.div
                key={s.n}
                {...fade}
                transition={{ delay: i * 0.1 }}
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
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <motion.div {...fade} className="mb-12 text-center">
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-amber-600">
              Features
            </p>
            <h2 className="text-3xl font-bold sm:text-4xl">
              Built for serious learners
            </h2>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                {...fade}
                transition={{ delay: i * 0.06 }}
                className="card-soft group flex gap-4 rounded-2xl p-5"
              >
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl ${f.iconBg}`}>
                  {f.icon}
                </span>
                <div>
                  <h3 className="text-sm font-bold">{f.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-[rgb(var(--muted))]">{f.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── THE SCIENCE ── */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <motion.div
            {...fade}
            className="overflow-hidden rounded-3xl border border-[rgb(var(--border))] bg-white p-6 shadow-soft sm:p-10"
          >
            <div className="max-w-2xl">
              <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-emerald-600">
                The science
              </p>
              <h2 className="text-2xl font-bold sm:text-3xl">
                Why quizzes outperform re-reading
              </h2>
              <p className="mt-4 leading-relaxed text-[rgb(var(--muted))]">
                When you pull information out of memory rather than recognizing it,
                you strengthen the neural pathways you will need later. Short questions
                with immediate feedback let you correct mistakes early and reinforce recall.
              </p>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                { label: "Retrieval over recognition", body: "Questions push you to produce answers, not just nod along.", bg: "bg-emerald-50" },
                { label: "Feedback that teaches", body: "Explanations connect each choice back to the core idea.", bg: "bg-blue-50" },
                { label: "Spaced repetition", body: "Retake quizzes over time to lock knowledge permanently.", bg: "bg-amber-50" },
                { label: "Gamification works", body: "Points and streaks turn learning into a daily habit.", bg: "bg-rose-50" },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`rounded-xl ${item.bg} p-4`}
                >
                  <p className="text-sm font-semibold text-[rgb(var(--foreground))]">{item.label}</p>
                  <p className="mt-1 text-xs leading-relaxed text-[rgb(var(--muted))]">{item.body}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <motion.div {...fade} className="mb-10 text-center">
            <h2 className="text-2xl font-bold sm:text-3xl">
              Frequently asked questions
            </h2>
          </motion.div>
          <div className="space-y-3">
            {faqs.map((f) => (
              <details
                key={f.q}
                className="group card-soft rounded-2xl px-5 py-4"
              >
                <summary className="cursor-pointer list-none text-base font-semibold outline-none marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center justify-between gap-4">
                    {f.q}
                    <span className="text-emerald-500 transition-transform group-open:rotate-45">+</span>
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-[rgb(var(--muted))]">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="pb-24 pt-8">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <motion.div
            {...fade}
            className="overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-500 p-8 text-center text-white sm:p-14"
          >
            <h2 className="text-3xl font-extrabold sm:text-4xl">
              Ready to level up your memory?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-emerald-100">
              Join Memora and turn every study session into a game you want to play.
            </p>
            <Link href="/dashboard" className="mt-8 inline-block">
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
