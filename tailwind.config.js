/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        primary: 'rgb(250, 210, 0)',
        secondary: 'rgb(115, 115, 200)',
        tertiary: 'rgb(155, 200, 115)',
      },
      animation: {
        'scanline': 'scanline 10s linear infinite',
        'pulse': 'pulse 4s ease-in-out infinite',
      },
      keyframes: {
        scanline: {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(4px)' }
        },
        pulse: {
          '0%, 100%': { opacity: 0.8 },
          '50%': { opacity: 1 }
        }
      }
    }
  }
}
