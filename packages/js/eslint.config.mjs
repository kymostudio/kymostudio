// Flat ESLint config for the TypeScript source. Uses the (non-type-checked)
// recommended presets — fast, and enough to catch unused vars, unsafe
// patterns, and obvious mistakes without requiring a full type graph.
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/", "node_modules/", "scripts/", "src/drawio2svg/"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts"],
  },
);
