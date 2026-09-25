import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: [".build/**", "dist/**", "node_modules/**", "test-results/**"] },
  js.configs.recommended,
  {
    files: ["**/*.js", "**/*.mjs"],
    languageOptions: {
      globals: { ...globals.es2025, ...globals.node, ...globals.browser },
    },
  },
  { files: ["src/*.js"], rules: { "no-console": ["error", { allow: ["warn", "error"] }] } },
];
