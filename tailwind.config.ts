import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-jakarta)', 'sans-serif'],
      },
      colors: {
        payterm: {
          DEFAULT: '#10214b', // Your Deep Navy Background
          accent: '#38bdf8',  // REPLACE THIS with your exact unique blue hex
        }
      }
    },
  },
  plugins: [],
};
export default config;