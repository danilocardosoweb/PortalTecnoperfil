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
          DEFAULT: '#533483', // roxo vibrante
          hover: '#e94560',   // coral
          light: '#7b4fb5',
          dark: '#3a2459',
        },
        glass: {
          white: 'rgba(255,255,255,0.08)',
          dark: 'rgba(0,0,0,0.2)',
          border: 'rgba(255,255,255,0.15)',
          surface: 'rgba(255,255,255,0.05)',
        },
        accent: {
          blue: '#0f3460',    // azul profundo
          purple: '#533483',  // roxo vibrante
          pink: '#e94560',    // coral
          green: '#4ecca3',   // verde água
          orange: '#ff6348',  // laranja coral
        },
        surface: '#FFFFFF',
        border: '#E5E7EB',
        text: '#111827',
        success: '#16A34A',
        danger: '#DC2626',
        warning: '#D97706',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'glass-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
      },
      backdropBlur: {
        xs: '2px',
        '3xl': '64px',
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
        'glass-hover': '0 12px 40px 0 rgba(31, 38, 135, 0.25)',
        'glass-inset': 'inset 0 0 20px rgba(255,255,255,0.05)',
        glow: '0 0 20px rgba(139, 92, 246, 0.3)',
        'glow-lg': '0 0 40px rgba(139, 92, 246, 0.4)',
      },
      borderRadius: {
        xl: '20px',
        '2xl': '24px',
        '3xl': '32px',
        pill: '999px'
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'gradient': 'gradient 15s ease infinite',
        'glass-shine': 'glass-shine 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        gradient: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        'glass-shine': {
          '0%': { transform: 'translateX(-100%) skewX(-15deg)' },
          '100%': { transform: 'translateX(200%) skewX(-15deg)' },
        },
      },
    },
  },
  plugins: [],
}
