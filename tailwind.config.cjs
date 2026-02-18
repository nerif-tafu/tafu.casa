/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,svelte,ts,js}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace']
      }
    }
  },
  plugins: []
};
