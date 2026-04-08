import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: "#22c55e",      // green-500 — matches logo
          foreground: "#ffffff",
          muted: "#052e16",        // dark green tint for backgrounds
          light: "#4ade80",        // green-400 for gradients
        },
        secondary: {
          DEFAULT: "#06b6d4",      // cyan-500 — matches logo
          foreground: "#ffffff",
          muted: "#164e63",
        },
        game: {
          bg:      "#090b14",      // near-black with blue tint
          card:    "#0f1120",      // card background
          "card-2":"#141728",      // slightly lighter card
          border:  "#1e2235",      // subtle border
          "border-bright": "#2a3050",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      backgroundImage: {
        "gradient-brand": "linear-gradient(135deg, #22c55e 0%, #06b6d4 100%)",
        "gradient-brand-r": "linear-gradient(135deg, #06b6d4 0%, #22c55e 100%)",
        "gradient-dark": "linear-gradient(160deg, #090b14 0%, #0d1025 50%, #090b14 100%)",
        "glow-green": "radial-gradient(circle, rgba(34,197,94,0.15) 0%, transparent 70%)",
        "glow-cyan": "radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%)",
      },
      boxShadow: {
        "glow-sm":  "0 0 12px rgba(34, 197, 94, 0.25)",
        "glow-md":  "0 0 24px rgba(34, 197, 94, 0.3)",
        "glow-lg":  "0 0 48px rgba(34, 197, 94, 0.2)",
        "glow-cyan":"0 0 24px rgba(6, 182, 212, 0.3)",
        "card-game":"0 0 0 1px rgba(34,197,94,0.08), 0 4px 24px rgba(0,0,0,0.6)",
        "card-hover":"0 0 0 1px rgba(34,197,94,0.25), 0 8px 32px rgba(0,0,0,0.7), 0 0 20px rgba(34,197,94,0.1)",
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
        "glow-pulse": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "border-spin": {
          "100%": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "score-pop": "score-pop 0.45s ease-out",
        shimmer: "shimmer 1.2s infinite",
        "generation-indeterminate": "generation-indeterminate 1.35s ease-in-out infinite",
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        "border-spin": "border-spin 4s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
