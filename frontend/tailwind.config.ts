import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "#1E293B",
        input: "#0A0A18",
        ring: "#F5C518",
        background: "#06060C",
        foreground: "#F8FAFC",
        primary: {
          DEFAULT: "#F5C518",
          foreground: "#06060C",
          light: "#FFD95A",
          dark: "#B8960F",
        },
        dragon: {
          DEFAULT: "#3B82F6",
          glow: "rgba(59,130,246,0.4)",
          dark: "#1D4ED8",
        },
        tiger: {
          DEFAULT: "#EF4444",
          glow: "rgba(239,68,68,0.4)",
          dark: "#B91C1C",
        },
        tie: {
          DEFAULT: "#10B981",
          glow: "rgba(16,185,129,0.4)",
          dark: "#047857",
        },
        surface: {
          primary: "#06060C",
          secondary: "#0D0D1A",
          card: "#141428",
          cardHover: "#1A1A35",
          elevated: "#1E1E3F",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Rajdhani", "Inter", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.8", transform: "scale(1.03)" },
        },
        "card-flip": {
          "0%": { transform: "rotateY(0deg)" },
          "100%": { transform: "rotateY(180deg)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-glow": "pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "card-flip": "card-flip 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
