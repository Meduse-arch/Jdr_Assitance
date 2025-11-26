/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",      // Pour les fichiers à la racine de client/
    "./src/**/*.{js,ts,jsx,tsx}", // Au cas où tu mettrais des fichiers dans src/
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}