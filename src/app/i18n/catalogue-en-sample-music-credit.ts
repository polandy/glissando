import type { Catalogue } from "./messages.ts";
import type { deSampleMusicCredit } from "./catalogue-de-sample-music-credit.ts";

/** English copy of the sample-music credit; typed to the German keys. */
export const enSampleMusicCredit: Pick<Catalogue, keyof typeof deSampleMusicCredit> = {
  "sampleMusic.credit": "Music: Glissando, CC BY-NC 4.0",
};
