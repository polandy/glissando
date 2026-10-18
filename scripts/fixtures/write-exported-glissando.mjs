#!/usr/bin/env node
// Writes a .glissando file exactly as the app's export would, by loading
// src/glissando-file/testing/glissando-fixtures.ts through Vite's SSR module loader (so its
// TypeScript and relative imports resolve without a build step) and awaiting its exportedFile().
// Used by scripts/fixtures/repack-glissando.sh to get the bytes a real ZIP tool then repacks.
//
//   node scripts/fixtures/write-exported-glissando.mjs <output-path>
/* global process, console */
import { writeFile } from "node:fs/promises";
import { createServer } from "vite";

const outputPath = process.argv[2];
if (!outputPath) {
  console.error("usage: write-exported-glissando.mjs <output-path>");
  process.exit(2);
}

const server = await createServer({ server: { middlewareMode: true, hmr: false } });
try {
  const fixtures = await server.ssrLoadModule("/src/glissando-file/testing/glissando-fixtures.ts");
  const file = await fixtures.exportedFile();
  await writeFile(outputPath, new Uint8Array(await file.arrayBuffer()));
} finally {
  await server.close();
}
