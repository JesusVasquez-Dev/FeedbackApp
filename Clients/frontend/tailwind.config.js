/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef6ff',
          100: '#d9eefe',
          200: '#baddfd',
          300: '#8ac6fb',
          400: '#57a8f7',
          500: '#318df2',
          600: '#1f6fd6',
          700: '#1c59ac',
          800: '#1d4c8b',
          900: '#1e416f',
        },
      },
      boxShadow: {
        card: '0 4px 14px rgba(0,0,0,0.08)'
      },
      borderRadius: {
        xl: '0.9rem'
      }
    },
  },
  plugins: [],
}
