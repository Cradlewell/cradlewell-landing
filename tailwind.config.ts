/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./src/components/ops/**/*.{ts,tsx}",
    "./src/app/operations/**/*.{ts,tsx}",
  ],
  corePlugins: {
    preflight: false,
  },
};

export default config;
