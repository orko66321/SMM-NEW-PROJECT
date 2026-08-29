/**
 * Tokens transcribed from stitch_ai_instruction_design/sovereign_fintech/DESIGN.md
 * (customer panel) — kept as the single source of truth for the palette so
 * future phases (admin-specific overrides) extend rather than fork it.
 */
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#031427",
        "surface-deep": "#020617",
        surface: "#031427",
        "surface-container": "#102034",
        "surface-container-high": "#1b2b3f",
        "surface-container-highest": "#26364a",
        "on-surface": "#d3e4fe",
        "on-surface-variant": "#c7c4d7",
        outline: "#908fa0",
        "outline-variant": "#464554",
        primary: "#6D28D9",
        "primary-container": "#8B5CF6",
        "on-primary": "#ffffff",
        success: "#10B981",
        warning: "#F59E0B",
        error: "#EF4444",
        info: "#3B82F6",
        bkash: "#E2136E",
        nagad: "#F7941D",
      },
      fontFamily: {
        display: ["Hanken Grotesk", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        sm: "0.25rem",
        DEFAULT: "0.5rem",
        md: "0.75rem",
        lg: "1rem",
        xl: "1.5rem",
      },
      maxWidth: {
        container: "1280px",
      },
      keyframes: {
        "fade-scale-in": {
          "0%": { opacity: "0", transform: "translateY(10px) scale(0.96)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(245, 158, 11, 0.28)" },
          "50%": { boxShadow: "0 0 28px 6px rgba(245, 158, 11, 0.28)" },
        },
      },
      animation: {
        "fade-scale-in": "fade-scale-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
