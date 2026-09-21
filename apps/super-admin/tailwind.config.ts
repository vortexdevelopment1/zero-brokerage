import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        ink: {
          950: "#0B1220",
          900: "#111827",
          800: "#1F2937",
          700: "#374151",
          600: "#4B5563",
          500: "#6B7280",
          400: "#9CA3AF",
          300: "#D1D5DB",
          200: "#E5E7EB",
          100: "#F1F3F6",
          50: "#F8F9FB",
        },
        brand: {
          950: "#031B2E",
          900: "#062A45",
          800: "#0A3C61",
          700: "#0E4F80",
          600: "#12639F",
          500: "#1877BE",
          400: "#3D92D4",
          300: "#7BB7E3",
          200: "#B8D9F0",
          100: "#E3F0FA",
          50: "#F2F8FD",
        },
        accent: {
          600: "#B4690E",
          500: "#D3822A",
          400: "#E4A159",
        },
        success: { 600: "#0F7A4E", 500: "#159862", 100: "#E1F5EB" },
        danger: { 600: "#B3261E", 500: "#D33A2E", 100: "#FBE7E5" },
        warning: { 600: "#9A5B00", 500: "#C07A00", 100: "#FCEFD8" },
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(11, 18, 32, 0.04), 0 1px 3px 0 rgba(11, 18, 32, 0.06)",
        popover: "0 8px 24px -4px rgba(11, 18, 32, 0.16), 0 2px 6px -2px rgba(11, 18, 32, 0.08)",
      },
      borderRadius: {
        xl: "10px",
        "2xl": "14px",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          "0%": { transform: "translateX(100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "slide-in-left": {
          "0%": { transform: "translateX(-100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.18s ease-out",
        "slide-in": "slide-in 0.22s ease-out",
        "slide-in-left": "slide-in-left 0.22s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
