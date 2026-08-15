/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        corporate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        vyapar: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#64748b',
          500: '#0f172a', // Clean Corporate Slate / Black Accent
          600: '#020617',
          700: '#020617',
          800: '#000000',
          900: '#000000',
        },
        paytm: {
          royal: '#0f172a',
          dark: '#020617',
          cyan: '#2563eb', // Clean Corporate Blue
          cyanDark: '#1d4ed8',
          sky: '#3b82f6',
          light: '#f1f5f9',
          bg: '#ffffff',
          green: '#16a34a',
          greenLight: '#f0fdf4',
          gold: '#d97706',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
