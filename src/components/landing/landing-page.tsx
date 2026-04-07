"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";

const fade = {
  initial: { opacity: 0, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.45 },
};

const blocks = [
  {
    title: "From notes to questions",
    body: "Paste a summary, add optional notes, or name a book or article. Memorize builds a quiz that mirrors what you actually studied.",
  },
  {
    title: "Active recall, powered by AI",
    body: "Practice testing is widely supported as an effective learning strategy. Short, focused questions help you retrieve ideas instead of skimming them.",
  },
  {
    title: "Built for real study workflows",
    body: "Great for books, courses, articles, study notes, and teaching prep—whenever you want durable memory, not a one-time highlight.",
  },
  {
    title: "Clear feedback, fast cycles",
    body: "See explanations right after each answer, track your score, and revisit past attempts to spot what still needs reinforcement.",
  },
  {
    title: "Local-first history",
    body: "Quizzes and scores are stored in your local database. In this no-auth setup, everyone using the same instance shares one guest profile.",
  },
];

const faqs = [
  {
    q: "What is retrieval practice?",
    a: "Retrieval practice means actively recalling information—like answering questions—rather than only re-reading. Research on retrieval practice shows that actively recalling information improves long-term retention better than passive re-reading alone.",
  },
  {
    q: "Is this a replacement for reading?",
    a: "No. Memorize is a complement: it helps you consolidate what you already engaged with by prompting recall in a structured way.",
  },
  {
    q: "How many questions should I generate?",
    a: "Start with 10 for a quick check, or 20–30 for a deeper pass. Longer sets are useful when you have rich notes and want broader coverage.",
  },
  {
    q: "Do I need an OpenAI API key?",
    a: "For real AI-generated quizzes, yes—configure it in your environment. Without a key, the app uses a built-in sample quiz so you can still test the full flow locally.",
  },
];

export function LandingPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6 sm:pt-14">
      <section className="relative overflow-hidden rounded-3xl border border-[rgb(var(--border))] bg-gradient-to-br from-white via-slate-50 to-blue-50 px-6 py-16 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 sm:px-12 sm:py-20">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-indigo-400/10 blur-3xl" />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative max-w-2xl"
        >
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">
            Learn better · Remember more
          </p>
          <h1 className="mt-3 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Turn what you read into what you remember.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-slate-600 dark:text-slate-300">
            Generate quizzes from books, notes, and learning materials. Train
            memory with retrieval practice instead of passive rereading.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/dashboard">
              <Button type="button">Start learning smarter</Button>
            </Link>
            <Link href="/dashboard">
              <Button type="button" variant="outline">
                Generate a quiz
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      <section className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {blocks.map((b, i) => (
          <motion.div key={b.title} {...fade} transition={{ delay: i * 0.05 }}>
            <Card className="h-full hover:border-accent/30 hover:shadow-md transition-shadow">
              <CardTitle>{b.title}</CardTitle>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {b.body}
              </p>
            </Card>
          </motion.div>
        ))}
      </section>

      <section className="mt-24 rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-6 py-12 sm:px-10">
        <motion.div {...fade}>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Why quizzes help you remember
          </h2>
          <p className="mt-4 max-w-3xl text-slate-600 dark:text-slate-300">
            Practice testing is widely supported as an effective learning
            strategy. When you pull information out of memory—rather than
            recognizing it in a paragraph—you strengthen the pathways you will
            need later. Memorize is built around that idea: short, targeted
            questions with immediate feedback so you can correct mistakes early
            and reinforce accurate recall.
          </p>
          <ul className="mt-6 grid gap-3 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-2">
            <li className="rounded-xl border border-slate-200/80 p-4 dark:border-slate-700">
              <span className="font-semibold text-slate-900 dark:text-white">
                Retrieval over recognition
              </span>
              <br />
              Questions push you to produce answers, not just nod along while
              rereading.
            </li>
            <li className="rounded-xl border border-slate-200/80 p-4 dark:border-slate-700">
              <span className="font-semibold text-slate-900 dark:text-white">
                Feedback that teaches
              </span>
              <br />
              Brief explanations connect each choice back to the underlying
              idea—useful for books, courses, and dense articles alike.
            </li>
          </ul>
        </motion.div>
      </section>

      <section className="mt-24">
        <motion.h2
          {...fade}
          className="text-2xl font-bold tracking-tight sm:text-3xl"
        >
          Frequently asked questions
        </motion.h2>
        <div className="mt-8 space-y-3">
          {faqs.map((f) => (
            <details
              key={f.q}
              className="group rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-5 py-4 open:shadow-sm"
            >
              <summary className="cursor-pointer list-none text-base font-semibold text-slate-900 outline-none marker:content-none dark:text-white [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-4">
                  {f.q}
                  <span className="text-slate-400 transition group-open:rotate-45">
                    +
                  </span>
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      <section className="mt-24 rounded-3xl bg-slate-900 px-6 py-12 text-center text-white dark:bg-slate-950 sm:px-10">
        <motion.div {...fade}>
          <h2 className="text-2xl font-bold sm:text-3xl">
            Ready to train long-term memory?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-300">
            Turn reading into recall with quizzes you can take anywhere—desktop
            or mobile.
          </p>
          <Link href="/dashboard" className="mt-8 inline-block">
            <Button
              type="button"
              className="!bg-white !text-slate-900 hover:!bg-slate-100"
            >
              Go to dashboard
            </Button>
          </Link>
        </motion.div>
      </section>

      <footer className="mt-16 border-t border-[rgb(var(--border))] pt-8 text-center text-sm text-slate-500 dark:text-slate-400">
        <p>
          © {new Date().getFullYear()} Memorize · Built for learners who prefer
          evidence-backed study habits.
        </p>
      </footer>
    </div>
  );
}
