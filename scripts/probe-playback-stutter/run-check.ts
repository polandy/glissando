// Checks that a probe run measured what it claims: a GPU, and a show that played.

const SOFTWARE_RENDERER = /swiftshader|llvmpipe|softpipe|lavapipe|software/i;

/** Why frame times on `renderer` say nothing about Glissando, or null on a real GPU. */
export function softwareRendererReason(renderer: string | null): string | null {
  if (renderer === null) return "no WebGL2 context: the player draws with its DOM fallback";
  if (SOFTWARE_RENDERER.test(renderer))
    return `${renderer} renders in software: frame times measure the rasteriser, not Glissando`;
  return null;
}

export interface ShowRun {
  /** Picture textures allocated after play was pressed. */
  readonly pictureStartsAfterPlay: number;
  /** `playing` events of the music element after play was pressed. */
  readonly musicPlaying: number;
}

/** What says the show did not run, so the numbers measure an idle page. */
export function showRunWarnings({ pictureStartsAfterPlay, musicPlaying }: ShowRun): string[] {
  return [
    ...(pictureStartsAfterPlay === 0 ? ["no picture was prepared after play"] : []),
    ...(musicPlaying === 0 ? ["the music never played"] : []),
  ];
}
