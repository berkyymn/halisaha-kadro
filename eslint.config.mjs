import { globalIgnores } from "eslint/config";
import next from "eslint-config-next";

/** @type {import('eslint').Linter.Config[]} */
const config = [
  globalIgnores([
    ".next/**",
    "dist/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "*.min.js",
  ]),
  ...next,
  {
    rules: {
      // Data URLs and user uploads require native img, not next/image.
      "@next/next/no-img-element": "off",
    },
  },
];

export default config;
