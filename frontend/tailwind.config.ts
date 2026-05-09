import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: {
          deep: "#121212",
          dark: "#1a1a1a",
          card: "#1e1e1e",
          surface: "#252525",
          hover: "#2a2a2a",
        },
        neon: {
          navy: "#2563eb",
          blue: "#3b82f6",
          cyan: "#06b6d4",
          red: "#ef4444",
          green: "#22c55e",
          yellow: "#eab308",
        },
        text: {
          primary: "#e8edf5",
          secondary: "#a0b0c8",
          muted: "#6b7d98",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      backgroundImage: {
        "neon-gradient": "linear-gradient(135deg, #2563eb, #06b6d4)",
      },
      boxShadow: {
        "neon-glow": "0 0 6px rgba(37, 99, 235, 0.2)",
      },
      animation: {
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "pulse-soft": "pulse-soft 1.5s ease-in-out infinite",
        "slide-up": "slide-up 0.3s ease-out",
        "slide-down": "slide-down 0.35s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
      },
      keyframes: {
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 4px rgba(37, 99, 235, 0.15)" },
          "50%": { boxShadow: "0 0 10px rgba(37, 99, 235, 0.3)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "slide-down": {
          "0%": { transform: "translateY(-20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
