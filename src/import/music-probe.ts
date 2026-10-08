import { MILLISECONDS_PER_SECOND } from "../player/slideshow";

export interface MusicProbe {
  readonly durationMs: number;
}

export class UnreadableMusicError extends Error {
  constructor(
    readonly fileName: string,
    options?: ErrorOptions,
  ) {
    super(`the browser cannot play the music file "${fileName}"`, options);
    this.name = "UnreadableMusicError";
  }
}

/** Loads a music file's metadata the way the player will play it, to learn its length. */
export async function probeMusic(file: File): Promise<MusicProbe> {
  const url = URL.createObjectURL(file);
  const audio = document.createElement("audio");
  try {
    const durationSeconds = await new Promise<number>((resolve, reject) => {
      audio.onloadedmetadata = () => resolve(audio.duration);
      audio.onerror = () => reject(new UnreadableMusicError(file.name, { cause: audio.error }));
      audio.preload = "metadata";
      audio.src = url;
    });
    // Streams without a known end report Infinity; a slideshow cannot be fitted to them.
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
      throw new UnreadableMusicError(file.name);
    }
    return { durationMs: Math.round(durationSeconds * MILLISECONDS_PER_SECOND) };
  } finally {
    audio.removeAttribute("src");
    audio.load();
    URL.revokeObjectURL(url);
  }
}
