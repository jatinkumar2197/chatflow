/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#dbe6fe",
          400: "#5f8cff",
          500: "#3366ff",
          600: "#254edb",
          700: "#1c3cb0",
        },
      },
    },
  },
  plugins: [],
};
