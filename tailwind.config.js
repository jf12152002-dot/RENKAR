/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#0f172a',
        ink: '#1f2937',
        violet: '#047857',
        neon: '#16a34a',
        gold: '#c69214'
      },
      boxShadow: {
        glow: '0 16px 38px rgba(22,163,74,.18)',
        violet: '0 24px 70px rgba(15,23,42,.12)'
      }
    }
  },
  plugins: []
};
