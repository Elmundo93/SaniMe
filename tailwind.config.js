/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#005FCC',
          light: '#E8F0FE',
          dark: '#003D8A',
        },
        surface: '#F7F9FC',
        border: '#E2E8F0',
        ink: {
          DEFAULT: '#0F172A',
          secondary: '#475569',
          tertiary: '#94A3B8',
        },
        status: {
          pending: '#D97706',
          pendingBg: '#FEF3C7',
          progress: '#2563EB',
          progressBg: '#DBEAFE',
          done: '#16A34A',
          doneBg: '#DCFCE7',
          error: '#DC2626',
          errorBg: '#FEE2E2',
        },
      },
    },
  },
  plugins: [],
}
