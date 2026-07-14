import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // SurePath brand blue (#355E8C) scale
        surepath: {
          50: "#f2f6fa",
          100: "#e2ebf3",
          200: "#c7d9e8",
          300: "#9fbdd6",
          400: "#6b93b8",
          500: "#355e8c", // brand
          600: "#2e5179",
          700: "#284465",
          800: "#243a54",
          900: "#1f3145",
          950: "#131f2d",
        },
      },
      fontFamily: {
        // Corporate serif for headings/wordmark; clean neutral sans for UI text.
        serif: ["Georgia", "Cambria", "Times New Roman", "serif"],
        sans: [
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
export default config;
