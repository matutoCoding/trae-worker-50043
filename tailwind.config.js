/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        'deep-sea': {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc7fb',
          400: '#36a5f6',
          500: '#0c86e2',
          600: '#006bc0',
          700: '#00559c',
          800: '#0F2B4A',
          900: '#0a1e35',
          950: '#071424',
        },
        'rapid': {
          50: '#fff4ed',
          100: '#ffe5d4',
          200: '#ffc6a9',
          300: '#ff9d72',
          400: '#ff6B35',
          500: '#f94b0f',
          600: '#ea3105',
          700: '#c22306',
          800: '#9a1f0d',
          900: '#7c1d10',
          950: '#430a05',
        },
      },
      fontFamily: {
        display: ['"Roboto Slab"', 'serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 4px 6px -1px rgba(15, 43, 74, 0.1), 0 2px 4px -2px rgba(15, 43, 74, 0.1)',
        'card-hover': '0 10px 15px -3px rgba(15, 43, 74, 0.15), 0 4px 6px -4px rgba(15, 43, 74, 0.1)',
        'glow': '0 0 20px rgba(12, 134, 226, 0.3)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'water-pattern': 'linear-gradient(135deg, rgba(12, 134, 226, 0.1) 0%, rgba(15, 43, 74, 0.2) 100%)',
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'wave': 'wave 2s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        wave: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
      },
    },
  },
  plugins: [],
};
