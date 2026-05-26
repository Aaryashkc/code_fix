import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default [
  ...defineConfig([
    ...nextVitals,
    ...nextTypescript,
    {
      files: ["**/*.{js,jsx,ts,tsx}"],
      rules: {
        "@typescript-eslint/no-explicit-any": "warn",
        "@typescript-eslint/no-require-imports": "warn",
        "react/no-unescaped-entities": "warn",
        "react-hooks/immutability": "warn",
        "react-hooks/set-state-in-effect": "warn",
      },
    },
    globalIgnores([
      ".next/**",
      "node_modules/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "tsconfig.tsbuildinfo",
      "eslint.config.mjs",
    ]),
  ]),
];
