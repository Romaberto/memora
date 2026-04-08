"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

const fade = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.5 },
};

const features = [
  {
    icon: "⚡",
    title: "Instant AI Quizzes",
    body: "Paste notes or name a topic — Memora generates sharp, targeted questions in seconds.",
  },
  {
    icon: "🧠",
    title: "Active Recall Training",
    body: "Retrieval practice is proven to boost long-term memory far better than re-reading.",
  },
  {
    icon: "🏆",
    title: "Earn Points & Rank Up",
    body: "Every quiz completed earns XP. Climb the leaderboard and compete with other learners.",
  },
  {
    icon: "📈",
    title: "Track Your Progress",
    body: "Your dashboard shows streaks, accuracy trends, and personal bests over time.",
  },
  {
    icon: "🔄",
    title: "Instant Feedback",
    body: "See explanations right after each answer. Correct mistakes before they stick.",
  },
  {
    icon: "🌍",
    title: "Learn Anything",
    body: "Books, courses, articles, study notes — if you can read it, Memora can quiz you on it.",
  },
];

const steps = [
  { n: "01", title: "Paste your material", body: "Drop in notes, a book summary, or just a topic name." },
  { n: "02", title: "Generate the quiz", body: "AI creates focused multiple-choice questions in seconds." },
  { n: "03", title: "Play & remember", body: "Answer questions, earn points, and watch your knowledge grow." },
];

const faqs = [
  {
    q: "What is retrieval practice?",
    a: "Retrieval practice means actively recalling information—like answering questions—rather than only re-reading. Research shows this improves long-term retention significantly more than passive review.",
  },
  {
    q: "Is this a replacement for reading?",
    a: "No. Memora is a complement: it helps you consolidate what you already engaged with by prompting recall in a structured, game-like way.",
  },
  {
    q: "How many questions should I generate?",
    a: "Start with 10 for a quick check, or 20–30 for a deeper pass. Longer sets are useful when you have rich notes and want broader coverage.",
  },
  {
    q: "Do I need an OpenAI API key?",
    a: "For real AI-generated quizzes, yes — configure it in your environment. Without a key, the app uses a built-in sample quiz so you can still test the full flow.",
  },
];

export function LandingPage() {
  return (
    <div className="relative overflow-x-hidden">

      {/* ── HERO ── */}
      <section className="relative min-h-[92vh] flex items-center">
        {/* Grid background */}
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />

        {/* Glow orbs */}
        <div className="pointer-events-none absolute -top-40 left-1/4 h-[500px] w-[500px] rounded-full bg-green-500/10 blur-[120px] animate-glow-pulse" />
        <div className="pointer-events-none absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-cyan-500/10 blur-[100px] animate-glow-pulse" style={{ animationDelay: "1.5s" }} />

        <div className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-green-500/20 bg-green-500/10 px-4 py-1.5 text-sm font-medium text-green-400">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              AI-powered memory training
            </div>

            <h1 className="text-5xl font-extrabold leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl">
              Make knowledge{" "}
              <span className="gradient-text">stick.</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-[rgb(var(--muted))]">
              Turn anything you read into a quiz. Earn points, beat your scores,
              and build real long-term memory — not just highlights.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link href="/register">
                <Button
                  type="button"
                  className="!rounded-xl !px-8 !py-3 !text-base btn-glow"
                >
                  Start for free →
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button
                  type="button"
                  variant="outline"
                  className="!rounded-xl !border-white/10 !bg-white/5 !px-8 !py-3 !text-base !text-white hover:!border-green-500/30 hover:!bg-white/10"
                >
                  Try a quiz
                </Button>
              </Link>
            </div>

            {/* Social proof pills */}
            <div className="mt-12 flex flex-wrap gap-3 text-sm text-[rgb(var(--muted))]">
              {["🧠 Retrieval practice", "⚡ Instant generation", "🏆 Leaderboards", "📱 Works everywhere"].map((t) => (
                <span key={t} className="rounded-full border border-white/8 bg-white/4 px-3 py-1">
                  {t}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="relative py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div {...fade} className="text-center mb-16">
            <p className="text-sm font-semibold uppercase tracking-widest text-green-400 mb-3">
              How it works
            </p>
            <h2 className="text-3xl font-bold sm:text-4xl">
              Three steps to <span className="gradient-text">remember more</span>
            </h2>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((s, i) => (
              <motion.div
                key={s.n}
                {...fade}
                transition={{ delay: i * 0.1 }}
                className="glass-card rounded-2xl p-6 transition-all duration-300"
              >
                <span className="text-4xl font-extrabold gradient-text opacity-60">{s.n}</span>
                <h3 className="mt-3 text-lg font-bold text-white">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[rgb(var(--muted))]">{s.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="relative py-24">
        {/* Section glow */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-cyan-500/5 blur-[100px]" />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div {...fade} className="text-center mb-16">
            <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400 mb-3">
              Features
            </p>
            <h2 className="text-3xl font-bold sm:text-4xl">
              Built for <span className="gradient-text-r">serious learners</span>
            </h2>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                {...fade}
                transition={{ delay: i * 0.07 }}
                className="glass-card group rounded-2xl p-6 transition-all duration-300 cursor-default"
              >
                <span className="text-3xl">{f.icon}</span>
                <h3 className="mt-3 text-base font-bold text-white">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[rgb(var(--muted))]">{f.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── THE SCIENCE ── */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div
            {...fade}
            className="glass-card rounded-3xl p-8 sm:p-12"
          >
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-widest text-green-400 mb-3">
                The science
              </p>
              <h2 className="text-3xl font-bold sm:text-4xl">
                Why quizzes <span className="gradient-text">outperform re-reading</span>
              </h2>
              <p className="mt-5 text-[rgb(var(--muted))] leading-relaxed">
                When you pull information out of memory rather than just recognizing it,
                you strengthen the neural pathways you will need later. Short, targeted
                questions with immediate feedback let you correct mistakes early and
                reinforce accurate recall — that is the entire premise behind Memora.
              </p>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                { label: "Retrieval over recognition", body: "Questions push you to produce answers, not just nod along while rereading." },
                { label: "Feedback that teaches", body: "Brief explanations connect each choice back to the underlying idea." },
                { label: "Spaced repetition built in", body: "Retake quizzes over time to lock knowledge into long-term memory." },
                { label: "Gamification boosts motivation", body: "Points and streaks keep you coming back — learning becomes a daily habit." },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-[rgb(var(--border))] bg-white/[0.02] p-4"
                >
                  <p className="font-semibold text-white text-sm">{item.label}</p>
                  <p className="mt-1 text-xs leading-relaxed text-[rgb(var(--muted))]">{item.body}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <motion.div {...fade} className="text-center mb-12">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Frequently asked <span className="gradient-text">questions</span>
            </h2>
          </motion.div>
          <div className="space-y-3">
            {faqs.map((f) => (
              <details
                key={f.q}
                className="group glass-card rounded-2xl px-5 py-4 transition-all"
              >
                <summary className="cursor-pointer list-none text-base font-semibold text-white outline-none marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center justify-between gap-4">
                    {f.q}
                    <span className="text-green-400 transition-transform group-open:rotate-45">+</span>
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-[rgb(var(--muted))]">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="pb-32 pt-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <motion.div
            {...fade}
            className="relative overflow-hidden rounded-3xl p-[1px]"
          >
            {/* Gradient border */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-green-500 via-cyan-500 to-green-500 opacity-30" />

            <div className="relative rounded-3xl bg-game-card px-8 py-16 text-center sm:px-16">
              {/* Glow behind CTA */}
              <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-green-500/15 blur-[60px]" />

              <div className="relative">
                <h2 className="text-3xl font-extrabold sm:text-4xl">
                  Ready to <span className="gradient-text">level up</span> your memory?
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-[rgb(var(--muted))]">
                  Join Memora and turn every study session into a game you actually want to play.
                </p>
                <Link href="/register" className="mt-8 inline-block">
                  <Button
                    type="button"
                    className="!rounded-xl !px-10 !py-3 !text-base btn-glow"
                  >
                    Start for free →
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-[rgb(var(--border))] py-8 text-center text-sm text-[rgb(var(--muted))]">
        <p>
          © {new Date().getFullYear()}{" "}
          <span className="gradient-text font-semibold">memora</span>
          {" "}· Make knowledge stick.
        </p>
      </footer>
    </div>
  );
}
