import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#f0f7f2",
          100: "#dfeee3",
          200: "#bfdcc7",
          300: "#9ecab1",
          400: "#7eb99b",
          500: "#4CAF62",
          600: "#2D7A3A",
          700: "#1B5426",
          800: "#0f351a",
          900: "#061a0e",
        },
        accent: {
          50: "#fffbf5",
          100: "#fef5ea",
          200: "#fce8d4",
          300: "#fabbac",
          400: "#f4a228",
          500: "#fbbf5c",
          600: "#e88e1a",
          700: "#c26f10",
          800: "#9a520b",
          900: "#7a3f08",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        heading: ["var(--font-jakarta)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        brand: "0.75rem",
      },
      boxShadow: {
        card: "0 2px 8px rgba(0, 0, 0, 0.06)",
        brand: "0 4px 12px rgba(45, 122, 58, 0.15)",
      },
    },
  },
  plugins: [animate],
};

export default config;
