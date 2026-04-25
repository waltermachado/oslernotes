/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0d1520',
          card: '#111926',
          input: '#1B2431',
        },
        brand: {
          green: '#16a34a',
          blue: '#007AFF',
        }
      }
    },
  },
  plugins: [],
}