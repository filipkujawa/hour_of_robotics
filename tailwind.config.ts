import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx,mdx}",
    "./components/**/*.{ts,tsx}",
    "./content/**/*.{mdx,ts}"
  ],
  theme: {
    extend: {
      colors: {
        base: "#ffffff",
        surface: "#f7f6f3",
        border: "#e5e3de",
        text: "#1a1a1a",
        muted: "#6b7280",
        primary: "#5b21b6",
        accent: "#7c3aed",
        tint: "#ede9fe",
        tintSoft: "#f5f3ff"
      },
      fontFamily: {
        display: ["var(--font-fraunces)"],
        sans: ["var(--font-dm-sans)"],
        mono: ["var(--font-jetbrains-mono)"]
      },
      boxShadow: {
        card: "0 18px 40px -26px rgba(17, 24, 39, 0.22)",
        glow: "0 0 0 1px rgba(124, 58, 237, 0.08), 0 24px 70px -36px rgba(91, 33, 182, 0.35)"
      },
      backgroundImage: {
        "hero-grid":
          "radial-gradient(circle at top left, rgba(124,58,237,0.12), transparent 30%), linear-gradient(rgba(229,227,222,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(229,227,222,0.8) 1px, transparent 1px)"
      },
      backgroundSize: {
        "hero-grid": "auto, 40px 40px, 40px 40px"
      },
      keyframes: {
        "check-stroke": {
          "0%": { strokeDashoffset: "22" },
          "100%": { strokeDashoffset: "0" }
        },
        glow: {
          "0%, 100%": { opacity: "0.35", transform: "scale(0.96)" },
          "50%": { opacity: "0.8", transform: "scale(1)" }
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" }
        }
      },
      animation: {
        "check-stroke": "check-stroke 0.55s ease forwards",
        glow: "glow 0.8s ease-out",
        shimmer: "shimmer 2.2s linear infinite"
      }
    }
  },
  plugins: []
};

export default config;
