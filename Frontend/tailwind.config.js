/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        // "Dokan Taka" only supplies the ৳ character; see index.css.
        sans: ['"Dokan Taka"', '"Manrope Variable"', 'Manrope', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
      },
      colors: {
        // Deep cosmic midnight navy. Change these and the accents below to re-theme the app.
        cosmos: {
          950: '#040817',
          900: '#070D22',
          800: '#0E1630',
          700: '#162142',
          600: '#22305A',
        },
        // Frosted white text steps
        frost: {
          DEFAULT: '#F1F5FB',
          soft: '#C6D0E2',
          muted: '#94A3BD',
        },
        brand: {
          cyan: '#22D3EE',
          orange: '#FB923C',
          roof: '#F97316',
          emerald: '#34D399',
          rose: '#FB7185',
          amber: '#FBBF24',
        },
      },
      boxShadow: {
        'glow-cyan': '0 0 0 1px rgba(34,211,238,.35), 0 10px 32px -8px rgba(34,211,238,.55)',
        'glow-orange': '0 0 0 1px rgba(251,146,60,.35), 0 10px 32px -8px rgba(251,146,60,.5)',
      },
      keyframes: {
        'modal-in': {
          from: { opacity: 0, transform: 'translateY(10px) scale(.98)' },
          to: { opacity: 1, transform: 'translateY(0) scale(1)' },
        },
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'page-in': {
          from: { opacity: 0, transform: 'translateY(6px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        'toast-in': {
          from: { opacity: 0, transform: 'translateX(16px)' },
          to: { opacity: 1, transform: 'translateX(0)' },
        },
      },
      animation: {
        'modal-in': 'modal-in .22s cubic-bezier(.2,.8,.2,1)',
        'fade-in': 'fade-in .18s ease-out',
        'page-in': 'page-in .32s cubic-bezier(.2,.8,.2,1)',
        'toast-in': 'toast-in .24s cubic-bezier(.2,.8,.2,1)',
      },
    },
  },
  plugins: [],
}
