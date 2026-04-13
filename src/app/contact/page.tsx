"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus("loading");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Something went wrong.");
        setStatus("error");
        return;
      }
      setStatus("success");
    } catch {
      setError("Network error. Please try again.");
      setStatus("error");
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Get in touch</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Have a question, feedback, or feature request? We&apos;d love to hear from you.
        </p>
      </div>

      {status === "success" ? (
        <Card className="text-center">
          <div className="py-6">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-bold">Message sent</h2>
            <p className="mt-2 text-sm text-slate-500">
              Thanks for reaching out. We&apos;ll get back to you as soon as we can.
            </p>
            <Link href="/" className="mt-6 inline-block">
              <Button type="button" variant="outline">
                Back to home
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <Card>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Your name
              </label>
              <input
                id="name"
                type="text"
                required
                maxLength={200}
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition-[border-color,box-shadow] duration-150 ease-out focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                placeholder="Jane Doe"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                maxLength={320}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition-[border-color,box-shadow] duration-150 ease-out focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="message"
                className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Message
              </label>
              <textarea
                id="message"
                required
                minLength={10}
                maxLength={5000}
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition-[border-color,box-shadow] duration-150 ease-out focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                placeholder="Tell us what's on your mind..."
              />
            </div>

            {error && (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={status === "loading"}
              className="w-full justify-center"
            >
              {status === "loading" ? "Sending..." : "Send message"}
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
