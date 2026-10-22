import type { Message } from "./messages.ts";

/** German copy of the sample-music credit (library/SAMPLE_MUSIC.md, ADR-0042). */
export const deSampleMusicCredit = {
  "sampleMusic.credit": "Musik: Glissando, CC BY-NC 4.0",
} as const satisfies Record<string, Message>;
