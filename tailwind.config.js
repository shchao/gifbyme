/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js}", "./public/**/*.{html,js}", "./views/**/*.{html,js}"],
  theme: {
    extend: {
      colors: {
            clifford: '#da373d',
          },
          minHeight: {
            '10': '10rem', // Define a custom minimum height class
            '20': '20rem', // Define a custom minimum height class
          },
    },
  },
  plugins: [],
}

