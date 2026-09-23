/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
      },
      fontSize: {
        xs: ['0.875rem', { lineHeight: '1.35rem' }],
        sm: ['0.975rem', { lineHeight: '1.5rem' }],
        base: ['1.0625rem', { lineHeight: '1.7rem' }],
        lg: ['1.175rem', { lineHeight: '1.8rem' }],
        xl: ['1.3rem', { lineHeight: '1.9rem' }],
      },
      colors: {
        mti: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        slate: {
          850: '#151f32',
          900: '#0f172a',
          950: '#0a101c',
        }
      },
      boxShadow: {
        glass: '0 14px 40px rgba(0, 0, 0, 0.34), 0 0 24px rgba(14, 165, 233, 0.12)',
        glow: '0 8px 28px rgba(14, 165, 233, 0.32), 0 0 40px rgba(14, 165, 233, 0.14)',
        'glow-strong': '0 16px 44px rgba(0, 0, 0, 0.4), 0 0 40px rgba(14, 165, 233, 0.36), 0 0 72px rgba(14, 165, 233, 0.16)',
      },
    },
  },
  plugins: [],
};
