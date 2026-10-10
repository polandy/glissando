import type { PlayerAsset } from "../ports";

/**
 * The export player built by `build/export-player-plugin.ts`, in its own chunk: fetched on the
 * first export, and precached for offline use like every built file (ADR-0005).
 */
export const bundledPlayerAsset: PlayerAsset = {
  load: async () => (await import("virtual:glissando-export-player")).default,
};
