import { defineConfig } from "vite";

/**
 * Bundles the library service into one ESM file the image's Node runs (`npm run build:server`);
 * Node's own modules stay imports.
 */
export default defineConfig({
  publicDir: false,
  build: {
    ssr: "server/main.ts",
    outDir: "dist-server",
    emptyOutDir: true,
    target: "node26",
    rolldownOptions: { output: { entryFileNames: "glissando-library.mjs" } },
  },
  ssr: { target: "node", noExternal: true },
});
