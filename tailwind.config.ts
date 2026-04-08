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
          DEFAULT: "#10b981",      // emerald-500 — friendly green
          foreground: "#ffffff",
          muted: "#d1fae5",        // emerald-100
          light: "#34d399",        // emerald-400
        },
        secondary: {
          DEFAULT: "#f59e0b",      // amber — warm & playful
          foreground: "#ffffff",
        },
        warm: {
          bg:     "#FBF7F0",       // cream background
          card:   "#FFFFFF",
          border: "#E8E0D4",
          "border-hover": "#D4CCC0",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      borderRadius: {
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      boxShadow: {
        "soft":    "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)",
        "soft-md": "0 2px 8px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.06)",
        "soft-lg": "0 4px 12px rgba(0,0,0,0.08), 0 16px 40px rgba(0,0,0,0.08)",
        "pastel":  "0 2px 12px rgba(16,185,129,0.1)",
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
        "score-pop": "score-pop 0.45s ease-out",
        shimmer: "shimmer 1.2s infinite",
        "generation-indeterminate": "generation-indeterminate 1.35s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        "bounce-soft": "bounce-soft 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
