import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx,mdx}",
    "./components/**/*.{ts,tsx}",
    "./content/**/*.{mdx,ts}",
  ],
  theme: {
    extend: {
      colors: {
        base: "#ffffff",
        surface: "#fafaf9",
        border: "#e2e1de",
        text: "#1a1a19",
        muted: "#6b6b69",
        primary: "#d97706",
        accent: "#b45309",
        tint: "#fef8f0",
        tintSoft: "#fffbf5",
      },
      fontFamily: {
        display: ["var(--font-fraunces)"],
        sans: ["var(--font-dm-sans)"],
        mono: ["var(--font-jetbrains-mono)"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)",
        glow: "0 0 0 1px rgba(217,119,6,0.12), 0 4px 16px -4px rgba(217,119,6,0.15)",
      },
      backgroundImage: {
        "hero-grid":
          "radial-gradient(circle at top left, rgba(217,119,6,0.06), transparent 30%), linear-gradient(rgba(226,225,222,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(226,225,222,0.5) 1px, transparent 1px)",
      },
      backgroundSize: {
        "hero-grid": "auto, 40px 40px, 40px 40px",
      },
      keyframes: {
        "check-stroke": {
          "0%": { strokeDashoffset: "22" },
          "100%": { strokeDashoffset: "0" },
        },
        glow: {
          "0%, 100%": { opacity: "0.35", transform: "scale(0.96)" },
          "50%": { opacity: "0.8", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "check-stroke": "check-stroke 0.55s ease forwards",
        glow: "glow 0.8s ease-out",
        shimmer: "shimmer 2.2s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
