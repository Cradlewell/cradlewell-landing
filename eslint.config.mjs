import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

// Next.js recommended rules (including Core Web Vitals) for every JS, JSX, TS
// and TSX file, the large CRM .jsx files included.
export default defineConfig([
  ...nextVitals,
  {
    // These rules check code for the React Compiler, which this project doesn't
    // use; the code they flag works correctly without it. They stay visible as
    // warnings so they can be tidied over time without blocking lint.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/use-memo": "warn",
      "react-hooks/refs": "warn",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "node_modules/**"]),
]);
