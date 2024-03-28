/** @type {import('tailwindcss').Config} */
export default {
  content: [
    // We only use tailwind for some minor DOM styling.
    "./index.html"
  ],

  theme: {
    fontFamily: {
      sans: ['"Inter"', "sans-serif"]
    }
  }
};
