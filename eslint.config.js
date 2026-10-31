import js from "@eslint/js";
import svelte from "eslint-plugin-svelte";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    // src/import/libav/ is the built music decoder (ADR-0020).
    ignores: [
      "dist/",
      "dist-server/",
      "playwright-report/",
      "test-results/",
      "src/import/libav/*.mjs",
      "src/import/libav/*.wasm",
    ],
  },
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
  {
    // The UX screenshot tour is a Node script whose page.evaluate callbacks run in the browser;
    // no-undef only knows a fixed list, so both sides' globals are named here.
    files: ["scripts/ux-tour/*.mjs"],
    languageOptions: {
      globals: {
        process: "readonly",
        Buffer: "readonly",
        console: "readonly",
        URL: "readonly",
        document: "readonly",
        Element: "readonly",
        Event: "readonly",
        StorageManager: "readonly",
        getComputedStyle: "readonly",
        innerHeight: "readonly",
      },
    },
  },
  {
    // Raw HTML insertion bypasses Svelte's escaping; a .glissando file's own README.txt or
    // index.html (ADR-0038) must never reach the DOM through it.
    rules: {
      "no-restricted-properties": [
        "error",
        {
          property: "innerHTML",
          message: "Setting innerHTML bypasses escaping; build DOM nodes or use Svelte binding.",
        },
        {
          property: "outerHTML",
          message: "Setting outerHTML bypasses escaping; build DOM nodes or use Svelte binding.",
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.property.name='insertAdjacentHTML']",
          message: "insertAdjacentHTML bypasses escaping; build DOM nodes or use Svelte binding.",
        },
        {
          selector: "CallExpression[callee.object.name='document'][callee.property.name='write']",
          message: "document.write bypasses escaping; build DOM nodes or use Svelte binding.",
        },
      ],
    },
  },
);
