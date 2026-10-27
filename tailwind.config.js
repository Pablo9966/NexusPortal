/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Swiss Life Primärfarben
        brand: {
          DEFAULT: '#D82034',
          dark: '#A11C36',
          soft: '#FBE9EB',
          tint: '#FDF4F5',
        },
        ink: {
          DEFAULT: '#141414',
          soft: '#3A3A3A',
          muted: '#808080',
        },
        line: {
          DEFAULT: '#DADADA',
          strong: '#B9B9B9',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F6F5F3',
          sunken: '#EFEDEA',
        },
        // Swiss Life Sekundärfarben (sparsam, max. 10 %)
        sunflower: '#FCC52D',
        terracotta: '#C45417',
        desert: '#DDBD88',
        flamingo: '#FD8182',
        blossom: '#ECBDAB',
        sea: '#15847B',
        sky: '#83CEC5',
        stone: '#9DBDBC',
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'Arial', 'sans-serif'],
        serif: ['"Source Serif 4"', '"Times New Roman"', 'serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(20,20,20,0.04), 0 8px 24px -12px rgba(20,20,20,0.10)',
        lift: '0 2px 4px rgba(20,20,20,0.05), 0 18px 40px -16px rgba(20,20,20,0.22)',
        brand: '0 10px 30px -10px rgba(216,32,52,0.55)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.4s ease-out both',
        shimmer: 'shimmer 1.4s linear infinite',
      },
    },
  },
  plugins: [],
};
