"use client";

/**
 * Tiny dependency-free confetti.
 *
 * Parent passes a numeric `trigger` — whenever the value changes, a fresh burst
 * of particles is generated and animated outward from the center of the nearest
 * positioned ancestor. The host element should be `relative`.
 *
 * Two variants:
 *  - "mini"        — small inline burst (correct-answer feedback)
 *  - "celebration" — larger burst (results page for high scores)
 *
 * Honors `prefers-reduced-motion`: renders nothing.
 */

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";

const COLORS = ["#10b981", "#34d399", "#f59e0b", "#fb923c", "#8b5cf6", "#06b6d4", "#ec4899"];

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

type Particle = {
  id: number;
  dx: number;
  dyUp: number;
  dyDown: number;
  color: string;
  size: number;
  rotate: number;
  shape: "circle" | "square";
};

function makeParticles(count: number, spread: number, seed: number): Particle[] {
  // Simple deterministic-ish rng so repeated bursts don't flicker identically
  let s = seed * 9301 + 49297;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };

  return Array.from({ length: count }).map((_, i) => {
    // Aim upward (negative y) with a ±80° cone
    const angle = -Math.PI / 2 + (rand() - 0.5) * Math.PI * 0.9;
    const velocity = spread * (0.6 + rand() * 0.7);
    return {
      id: i,
      dx: Math.cos(angle) * velocity,
      dyUp: Math.sin(angle) * velocity,
      dyDown: 140 + rand() * 90,
      color: COLORS[Math.floor(rand() * COLORS.length)]!,
      size: 5 + rand() * 6,
      rotate: (rand() - 0.5) * 540,
      shape: rand() > 0.5 ? "circle" : "square",
    };
  });
}

export function Confetti({
  trigger,
  variant = "mini",
}: {
  /** Any monotonically increasing number — change it to fire a new burst. */
  trigger: number;
  variant?: "mini" | "celebration";
}) {
  const reduce = useReducedMotion();

  const { count, spread, duration } =
    variant === "celebration"
      ? { count: 38, spread: 180, duration: 1.4 }
      : { count: 14, spread: 90, duration: 0.85 };

  // Generate new particles whenever trigger changes
  const particles = useMemo(
    () => makeParticles(count, spread, trigger),
    [count, spread, trigger],
  );

  if (reduce || trigger <= 0) return null;

  return (
    <div
      key={trigger}
      className="pointer-events-none absolute left-1/2 top-1/2 z-20"
      aria-hidden
    >
      {particles.map((p) => (
        <motion.span
          key={p.id}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0.6, rotate: 0 }}
          animate={{
            x: p.dx,
            y: [0, p.dyUp, p.dyUp + p.dyDown],
            opacity: [1, 1, 0],
            scale: [0.6, 1, 0.5],
            rotate: p.rotate,
          }}
          transition={{
            duration,
            ease: EASE_OUT,
            times: [0, 0.5, 1],
          }}
          style={{
            position: "absolute",
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.shape === "circle" ? "50%" : 2,
            willChange: "transform, opacity",
          }}
        />
      ))}
    </div>
  );
}
