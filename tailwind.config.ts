import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      boxShadow: {
        soft: "0 4px 24px -4px rgba(15, 23, 42, 0.07), 0 0 0 1px rgba(15, 23, 42, 0.04)",
        "soft-lg": "0 12px 40px -12px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(15, 23, 42, 0.04)",
        glow: "0 8px 32px -8px rgba(124, 58, 237, 0.35)"
      }
    }
  },
  plugins: []
};

export default config;
