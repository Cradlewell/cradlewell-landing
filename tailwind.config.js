/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/components/ops/**/*.{ts,tsx}",
    "./src/app/operations/**/*.{ts,tsx}",
  ],
  corePlugins: {
    preflight: false,
  },
};
