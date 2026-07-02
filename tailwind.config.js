/** @type {import('tailwindcss').Config} */
// Farbwerte gespiegelt aus packages/@sanime/design-system/colors.ts — bei Änderungen dort
// synchron halten. Kein Bare-Specifier-`require()` des TS-Pakets hier, da Tailwind dieses
// Config-File außerhalb von Metros Transform-Pipeline lädt (kein automatisches TS-Parsing).
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2F6FE4',
          light: '#EAF4FF',
          dark: '#1F4FAE',
        },
        surface: '#F5F8FC',
        border: '#E1E8F2',
        ink: {
          DEFAULT: '#0B1220',
          secondary: '#3A4B66',
          tertiary: '#5C7093',
        },
        status: {
          pending: '#F0A020',
          pendingBg: 'rgba(240,160,32,0.12)',
          progress: '#3E8EFF',
          progressBg: 'rgba(62,142,255,0.12)',
          done: '#2FA968',
          doneBg: 'rgba(47,169,104,0.12)',
          error: '#E5484D',
          errorBg: 'rgba(229,72,77,0.12)',
        },
      },
    },
  },
  plugins: [],
}
