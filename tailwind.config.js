/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        dyod: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc7fb',
          400: '#38a8f6',
          500: '#0e8ce4',
          600: '#026fc3',
          700: '#03589e',
          800: '#074b82',
          900: '#0c3f6c',
          950: '#082847',
        },
        academic: {
          navy: '#0f172a',
          surface: '#1e293b',
          card: '#0b1324',
          border: '#334155',
          text: '#f8fafc',
          muted: '#94a3b8',
          accent: '#38bdf8',
          emerald: '#10b981',
          gold: '#f59e0b',
          rose: '#f43f5e',
          purple: '#8b5cf6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};
