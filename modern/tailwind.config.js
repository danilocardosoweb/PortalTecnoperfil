/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563EB', // blue-600
          hover: '#1D4ED8',   // blue-700
        },
        surface: '#FFFFFF',
        border: '#E5E7EB',
        text: '#111827',
        success: '#16A34A',
        danger: '#DC2626',
        warning: '#D97706',
      },
      boxShadow: {
        card: '0 10px 25px rgba(0,0,0,.08)',
        cardHover: '0 12px 28px rgba(0,0,0,.12)'
      },
      borderRadius: {
        xl: '16px',
        pill: '999px'
      },
      transitionDuration: {
        fast: '150ms',
        normal: '200ms'
      }
    },
  },
  plugins: [],
}
