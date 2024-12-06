/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'primary': '#2D3748',
        'secondary': '#4A5568',
        'accent': '#0000FF',
        dark: {
          DEFAULT: '#0F172A',  // Dark navy blue
          lighter: '#1E293B'   // Slightly lighter navy blue
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
} 