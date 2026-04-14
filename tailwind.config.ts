import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  // Tailwind 3.4+: only emit hover: rules on devices that truly support hover.
  // Prevents sticky tap-hover states on mobile and aligns with Emil's guidance
  // to gate hover effects behind (hover: hover) and (pointer: fine).
  future: { hoverOnlyWhenSupported: true },
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Single ink-red accent. Emerald is retired from the design system;
        // any stray `bg-emerald-*` classes in the tree still resolve via
        // Tailwind's default palette, but app-level chrome should use `accent`.
        accent: {
          DEFAULT: "rgb(var(--accent))",
          ink:     "rgb(var(--accent-ink))",
          foreground: "#ffffff",
          muted:   "rgb(var(--accent) / 0.10)",
          light:   "rgb(var(--accent) / 0.20)",
        },
        secondary: {
          DEFAULT: "rgb(var(--foreground))",
          foreground: "#ffffff",
        },
        warm: {
          bg:     "rgb(var(--background))",
          card:   "rgb(var(--card))",
          border: "rgb(var(--border))",
          surface2: "rgb(var(--surface-2))",
        },
        ink: {
          DEFAULT: "rgb(var(--foreground))",
          muted:   "rgb(var(--muted))",
        },
        paper: "rgb(var(--background))",
      },
      fontFamily: {
        // Single Inter stack — body copy AND display. The display/body
        // hierarchy is created by weight + tracking (see .font-editorial
        // in globals.css), not a second face.
        sans:  ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono:  ["var(--font-geist-mono)", "monospace"],
        serif: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        // Editorial direction keeps radii tight. Cards land on `lg` (8px),
        // inputs/buttons on `md` (6px). `2xl` is reserved for the single
        // primary CTA / hero treatment.
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      boxShadow: {
        // Softer, more ink-like shadow — no green cast, no heavy drop.
        "soft":    "0 1px 2px rgba(26,26,32,0.04), 0 2px 8px rgba(26,26,32,0.04)",
        "soft-md": "0 1px 3px rgba(26,26,32,0.06), 0 6px 16px rgba(26,26,32,0.06)",
        "soft-lg": "0 2px 6px rgba(26,26,32,0.08), 0 12px 32px rgba(26,26,32,0.08)",
        "pastel":  "0 2px 12px rgba(178,58,72,0.08)",
      },
      transitionTimingFunction: {
        // Expose our custom easings to Tailwind so `ease-[var(--ease-out)]`
        // is usable app-wide. Prefer these over the built-in `ease-out`.
        "editorial":     "var(--ease-out)",
        "editorial-bi":  "var(--ease-in-out)",
      },
      keyframes: {
        "score-pop": {
          "0%": { transform: "scale(1)" },
          "40%": { transform: "scale(1.15)" },
          "100%": { transform: "scale(1)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "generation-indeterminate": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(350%)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "bounce-soft": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
      },
      animation: {
        "score-pop": "score-pop 0.3s cubic-bezier(0.23, 1, 0.32, 1)",
        shimmer: "shimmer 1.2s infinite",
        "generation-indeterminate": "generation-indeterminate 1.1s cubic-bezier(0.65, 0, 0.35, 1) infinite",
        float: "float 6s ease-in-out infinite",
        "bounce-soft": "bounce-soft 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
