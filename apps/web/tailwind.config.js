/**
 * Tokens transcribed from stitch_ai_instruction_design/sovereign_fintech/DESIGN.md
 * (customer panel) and the "All in One Service Design System" skill folder.
 *
 * Surface / foreground / line colours resolve through CSS custom properties
 * defined in src/styles/tokens.css (space-separated RGB channels, so the
 * `/opacity` modifier still works). `.theme-admin` swaps those channels to
 * the obsidian scale; the violet brand palette is theme-independent.
 */
const channel = (v) => `rgb(var(${v}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Themeable surfaces (navy for customer, obsidian under .theme-admin)
        background: channel("--sf-page"),
        surface: channel("--sf-page"),
        "surface-deep": channel("--sf-deep"),
        "surface-lowest": channel("--sf-lowest"),
        "surface-low": channel("--sf-low"),
        "surface-container": channel("--sf-card"),
        "surface-container-high": channel("--sf-raised"),
        "surface-container-highest": channel("--sf-highest"),
        // Design-system semantic aliases (preferred name going forward)
        page: channel("--sf-page"),
        "surface-card": channel("--sf-card"),
        "surface-raised": channel("--sf-raised"),
        "surface-input": channel("--sf-raised"),
        "surface-highest": channel("--sf-highest"),

        // Themeable foreground + lines
        "on-surface": channel("--fg-1"),
        "on-surface-variant": channel("--fg-2"),
        content: channel("--fg-1"),
        "content-muted": channel("--fg-2"),
        outline: channel("--line-strong-1"),
        "outline-variant": channel("--line-1"),
        line: channel("--line-1"),
        "line-strong": channel("--line-strong-1"),

        // Brand violet — same in every theme
        primary: "#6D28D9",
        "primary-hover": "#8B5CF6",
        "primary-container": "#8B5CF6",
        "on-primary": "#ffffff",
        accent: "#6D28D9",
        "accent-hover": "#8B5CF6",
        "accent-on-dark": channel("--accent-on-dark"),

        // Semantic status
        success: "#10B981",
        warning: "#F59E0B",
        error: "#EF4444",
        info: "#3B82F6",

        // Payment-gateway brands — payment tiles only
        bkash: "#E2136E",
        nagad: "#F7941D",
        rocket: "#8C3494",
        upay: "#00A651",
      },
      fontFamily: {
        brand: ["Jost", "Helvetica Neue", "Arial", "sans-serif"],
        display: ["Hanken Grotesk", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
        bengali: ["Noto Sans Bengali", "Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "0.25rem",
        DEFAULT: "0.5rem",
        md: "0.75rem",
        lg: "1rem",
        xl: "1.5rem",
        control: "var(--radius-control)",
        card: "var(--radius-card)",
      },
      boxShadow: {
        ambient: "var(--shadow-ambient)",
        raised: "var(--shadow-raised)",
        overlay: "var(--shadow-overlay)",
      },
      maxWidth: {
        container: "1280px",
      },
      transitionTimingFunction: {
        ds: "cubic-bezier(0.4, 0, 0.2, 1)",
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
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-scale-in": "fade-scale-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
        shimmer: "shimmer 1.6s infinite",
      },
    },
  },
  plugins: [],
};
