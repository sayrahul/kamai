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
        paytm: {
          royal: '#002970',
          dark: '#001F54',
          cyan: '#00BAF2',
          cyanDark: '#0096C7',
          sky: '#00B9F1',
          light: '#E8F6FE',
          bg: '#F5F8FE',
          green: '#00B050',
          greenLight: '#E6F8ED',
          gold: '#FFB800',
        },
        vyapar: {
          50: '#E8F6FE',
          100: '#D0EEFD',
          200: '#A1DCFB',
          300: '#72CAF9',
          400: '#00BAF2', // Paytm Cyan
          500: '#002970', // Paytm Royal Blue
          600: '#001F54', // Paytm Deep Navy
          700: '#00173D',
          800: '#000F26',
          900: '#000814',
        },
        emerald_custom: {
          500: '#00B050',
          600: '#009443',
          700: '#007836',
        },
        slate_custom: {
          850: '#18202f',
          900: '#0f172a',
          950: '#090d16',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
