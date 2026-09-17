/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Sora", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
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
        // Dimmer than slate-600 (body copy) - reserved for captions,
        // timestamps, and other genuinely secondary/meta text.
        tertiary: "#94a3b8",
      },
      // Tinted toward the brand navy instead of Tailwind's neutral-black
      // default shadow scale. Only the keys actually used across the site
      // (sm/lg/xl) are overridden.
      boxShadow: {
        sm: "0 1px 2px 0 rgba(3, 32, 76, 0.06)",
        lg: "0 10px 20px -5px rgba(3, 32, 76, 0.16), 0 4px 8px -4px rgba(3, 32, 76, 0.1)",
        xl: "0 20px 30px -8px rgba(3, 32, 76, 0.2), 0 8px 12px -6px rgba(3, 32, 76, 0.12)",
        // Named tokens for elevation parity across cards/overlays, so later
        // usages reference one name instead of a hand-rolled inline value.
        "card-rest": "0 1px 2px rgba(3,32,76,.06), 0 1px 3px rgba(3,32,76,.08)",
        "card-featured": "0 10px 20px -5px rgba(3,32,76,.16), 0 4px 8px -4px rgba(3,32,76,.1)",
        overlay: "0 20px 40px -8px rgba(3,32,76,.2), 0 8px 16px -8px rgba(3,32,76,.12)",
      },
      // The navy-to-slate diagonal used on the Marketplace/Expert Directory
      // cards, promoted to a shared utility so it reads as one deliberate
      // surface treatment instead of one-off gradients per section.
      backgroundImage: {
        "brand-gradient": "linear-gradient(to bottom right, #010d1e, #031b41, #4f6382)",
      },
    },
  },
  plugins: [],
};
