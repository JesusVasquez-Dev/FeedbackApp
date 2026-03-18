/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Add DEFAULT for bg-primary and keep scale for -50..-900
        primary: {
          DEFAULT: '#318df2',
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
        // Basic tokens used by components (bg-background, bg-card, text-muted-foreground, etc.)
        background: '#f7f9fc',
        foreground: '#0f172a',
        card: '#ffffff',
        'card-foreground': '#0f172a',
        muted: '#f1f5f9',
        'muted-foreground': '#64748b',
        border: '#e5e7eb',
        input: '#e5e7eb',
        ring: '#93c5fd',
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
