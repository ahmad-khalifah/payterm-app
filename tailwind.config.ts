import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // This globally scales up your text classes
      fontSize: {
        'xs': '0.85rem',   // Slightly larger than default 0.75rem
        'sm': '0.95rem',   // Slightly larger than default 0.875rem
        'base': '1.05rem', // Slightly larger than default 1rem
        'lg': '1.2rem',
      },
    },
  },
  plugins: [],
}
export default config