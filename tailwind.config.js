/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // Disable automatic media-query dark mode inversion
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // High-Contrast Yellow, Black & White Corporate Palette
        brand: {
          yellow: '#FACC15',       // High-Visibility Yellow Accent
          yellowLight: '#FEF9C3',  // Soft Yellow Tint
          yellowDark: '#CA8A04',   // Dark Amber/Yellow
          black: '#0F172A',        // Deep Solid Black/Slate
          white: '#FFFFFF',        // Pure White
        },
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
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',
          500: '#0f172a', // Deep solid black accent
          600: '#020617',
          700: '#020617',
          800: '#000000',
          900: '#000000',
        },
        paytm: {
          royal: '#0f172a',
          dark: '#020617',
          cyan: '#0f172a',
          cyanDark: '#020617',
          sky: '#3b82f6',
          light: '#f8fafc',
          bg: '#ffffff',
          green: '#16a34a',
          greenLight: '#f0fdf4',
          gold: '#facc15',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Mukta', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        marathi: ['Mukta', 'Inter', 'sans-serif'],
        hindi: ['Mukta', 'Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
