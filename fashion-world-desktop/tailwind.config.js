/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
       // Add print variants for hiding elements during print
      screens: {
        'print': {'raw': 'print'},
      },
    },
  },
  plugins: [],
}
