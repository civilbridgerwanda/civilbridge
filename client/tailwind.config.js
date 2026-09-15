/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Derived directly from the CivilBridge bridge logo's navy (#03204C)
        brand: {
          50: "#f2f4f6",
          100: "#e1e4ea",
          200: "#bdc5d0",
          300: "#8e9bae",
          400: "#4f6382",
          500: "#03204c",
          600: "#031b41",
          700: "#021635",
          800: "#02122a",
          900: "#010d1e",
        },
        ink: {
          900: "#0f172a",
        },
        // Sparingly used accent for the trust/stats band - a classic
        // navy + gold pairing that reads as "established, credible"
        // without competing with the brand navy everywhere else.
        gold: {
          300: "#fcd979",
          400: "#f6c453",
          500: "#eba82c",
        },
      },
    },
  },
  plugins: [],
};
