/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#090d1a",
        panel: "#11182a",
        line: "#273452",
        glow: "#6d7dff",
      },
    },
  },
  plugins: [
    require('tailwind-scrollbar'),
  ],
};

