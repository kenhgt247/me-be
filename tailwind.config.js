/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",           
    "./components/**/*.{js,ts,jsx,tsx}", 
    "./pages/**/*.{js,ts,jsx,tsx}",      
    "./layouts/**/*.{js,ts,jsx,tsx}",   
    "./hooks/**/*.{js,ts,jsx,tsx}",     
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Quicksand', 'sans-serif'],
      },
      colors: {
        primary: '#2EC4B6',
        secondary: '#CBF3F0',
        cream: '#F7F7F5',
        accent: '#FFBF69',
        textDark: '#1F2937',
        textGray: '#6B7280',
        dark: {
          bg: '#0f172a',
          card: '#1e293b',
          text: '#f1f5f9',
          muted: '#94a3b8',
          border: '#334155'
        }
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
    },
  },
  plugins: [],
}