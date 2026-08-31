/** @type {import('tailwindcss').Config} */
export default {
  // Tailwind v3 — scans these files for class names to include in the bundle
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      // Brand colour palette (indigo/violet dark-mode focused)
      colors: {
        brand: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',   // primary accent
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        surface: {
          DEFAULT: '#0f0f1e',   // main page background
          50:  '#1a1a2e',       // card background
          100: '#16213e',       // elevated card
          200: '#0d0d1a',       // deepest background
        },
      },
      // Font stack — Inter loaded via Google Fonts in index.html
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      // Glassmorphism backdrop utility
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
