/** Tailwind config for the CRM only (loaded via `@config` in src/app/crm/crm.css).
 *  Theme mirrors the Cradlewell CRM design: warm-neutral ink/line/surface scales
 *  as RGB channels (so opacity modifiers work) and one brand accent. */
const rgb = (v) => `rgb(var(${v}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/components/crm-v2/**/*.{js,jsx,ts,tsx}", "./src/app/crm/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: rgb("--cw-ink"),
          2: rgb("--cw-ink-2"),
          3: rgb("--cw-ink-3"),
          4: rgb("--cw-ink-4"),
          placeholder: rgb("--cw-ink-placeholder"),
          faint: rgb("--cw-ink-faint"),
        },
        line: {
          DEFAULT: rgb("--cw-line"),
          subtle: rgb("--cw-line-subtle"),
          control: rgb("--cw-line-control"),
          strong: rgb("--cw-line-strong"),
          heavy: rgb("--cw-line-heavy"),
        },
        surface: {
          subtle: rgb("--cw-surface-subtle"),
          hover: rgb("--cw-surface-hover"),
          active: rgb("--cw-surface-active"),
          sidebar: rgb("--cw-surface-sidebar"),
        },
        brand: {
          DEFAULT: rgb("--cw-brand"),
          strong: rgb("--cw-brand-strong"),
          tint: rgb("--cw-brand-tint"),
          line: rgb("--cw-brand-line"),
        },
      },
      fontSize: {
        micro: "10px",
        caption: "11px",
        small: "12px",
        body: "13px",
        "body-lg": "14px",
        "title-sm": "16px",
        title: "20px",
        h1: "24px",
        stat: "28px",
        display: "32px",
      },
      boxShadow: {
        pop: "0 8px 24px rgba(0,0,0,.08)",
        modal: "0 16px 48px rgba(0,0,0,.12)",
        float: "0 12px 32px rgba(0,0,0,.18)",
        lift: "0 10px 24px -14px rgba(16,24,40,.25)",
        raise: "0 2px 10px rgba(0,0,0,.04)",
        panel: "-12px 0 32px rgba(0,0,0,.04)",
        "ring-line": "0 0 0 1px rgb(var(--cw-line-control))",
        xs: "0 1px 2px rgba(16,24,40,.05)",
      },
    },
  },
  plugins: [],
};
