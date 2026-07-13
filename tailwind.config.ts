import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // SurePath Valuation & Advisory brand palette
        navy: {
          50: "#f0f5fa",
          100: "#dbe7f2",
          200: "#bcd2e6",
          300: "#8fb3d4",
          400: "#5c8dbd",
          500: "#3a6fa5",
          600: "#2b578a",
          700: "#254770",
          800: "#223d5e",
          900: "#16324f",
          950: "#0e2138",
        },
        gold: {
          50: "#fbf8eb",
          100: "#f5eecb",
          200: "#ecdc99",
          300: "#e1c45f",
          400: "#d7ad35",
          500: "#c9a227",
          600: "#ad7f1f",
          700: "#8a5d1c",
          800: "#734a1e",
          900: "#633e1e",
        },
      },
    },
  },
  plugins: [],
};
export default config;
