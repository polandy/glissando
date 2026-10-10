import js from "@eslint/js";
import svelte from "eslint-plugin-svelte";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/", "dist-server/", "playwright-report/", "test-results/"] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  ...svelte.configs.recommended,
  {
    files: ["**/*.svelte", "**/*.svelte.ts"],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
    // TypeScript resolves globals (svelte-check); no-undef only knows a fixed list.
    rules: { "no-undef": "off" },
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
);
