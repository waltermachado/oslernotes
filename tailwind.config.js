/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        cream:  { 50:'#FBF9F2', 100:'#F6F2E7', 200:'#EFE9D8', 300:'#E4DBC4', 400:'#C8BB9C' },
        ink:    { 400:'#9BAEC3', 500:'#6E869F', 600:'#486583', 700:'#2B4865', 800:'#1F3147', 900:'#14253A' },
        navy:   { 50:'#EEF2F8', 100:'#D9E1EE', 200:'#B3C3DC', 300:'#7E9AC0', 400:'#4F73A0', 500:'#345783', 600:'#284568', 700:'#1F3450', 800:'#16253A' },
        gold:   { 50:'#F7F1DF', 100:'#EFE3BD', 200:'#DCC685', 300:'#C8AB5A', 400:'#B8A16A', 500:'#9C8347', 600:'#735E2C' },
        sage:   { 50:'#EEF3EE', 100:'#D6E3D6', 200:'#ADC7AE', 300:'#84A98C', 400:'#5F8669' },
        clay:   { 50:'#FAEEE6', 100:'#F1D6C2', 200:'#E0B193', 300:'#C88461', 400:'#A4623F' },
        rose:   { 50:'#FAE9E9', 100:'#F1C9C9', 200:'#E29797', 300:'#C76A6A', 400:'#9E4848' },

        // Semantic aliases — uses CSS vars so dark-mode flip is automatic.
        canvas:  'rgb(var(--bg-paper) / <alpha-value>)',
        surface: 'rgb(var(--bg-surface) / <alpha-value>)',
        sunken:  'rgb(var(--bg-sunken) / <alpha-value>)',

        // Legacy compat aliases — keep while migrating, then remove.
        brand: {
          blue:  '#345783',   // navy-500
          green: '#84A98C',   // sage-300
        },
        dark: {
          bg:    '#F6F2E7',   // cream-100 (inverted meaning for compat)
          card:  '#FBF9F2',   // cream-50
          input: '#EFE9D8',   // cream-200
        },
      },
      fontFamily: {
        display: ['Courgette', 'cursive'],
        sans:    ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        serif:   ['Fraunces', 'serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        '2xl': '24px',
      },
      boxShadow: {
        soft:   '0 1px 3px rgba(20,37,58,0.06), 0 1px 2px rgba(20,37,58,0.04)',
        lift:   '0 4px 12px rgba(20,37,58,0.07), 0 2px 4px rgba(20,37,58,0.04)',
        ring:   '0 0 0 3px rgba(78,115,160,0.28)',
        gold:   '0 0 0 1px #C8AB5A, 0 0 0 4px rgba(184,161,106,0.16)',
      },
    },
  },
  plugins: [],
}
