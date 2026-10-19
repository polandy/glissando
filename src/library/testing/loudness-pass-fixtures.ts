import type { MusicLoudness } from "../../loudness";
import { LoudnessPass, type LoudnessPassPorts } from "../loudness-pass";
import type { FakeLoudnessMeter } from "./fake-loudness-meter";
import { musicBlob, slideshow } from "./library-store-contract";
import { MemoryLibraryStore } from "./memory-store";

export const MEASURED: MusicLoudness = {
  blockMeanSquares: new Float32Array([0.01, 0.02]),
  hopPeaks: new Float32Array([0.5, 0.6, 0.7, 0.8, 0.9]),
};
export const QUIET: MusicLoudness = {
  blockMeanSquares: new Float32Array([0.001]),
  hopPeaks: new Float32Array([0.1, 0.2, 0.3, 0.4]),
};

/**
 * A store holding a slideshow per entry with the songs named, each created a day after the one
 * before; each music file is the blob returned.
 */
export async function storeWith(
  shows: Record<string, string | readonly string[]>,
): Promise<{ store: MemoryLibraryStore; files: Map<string, Blob> }> {
  const store = new MemoryLibraryStore();
  const files = new Map<string, Blob>();
  for (const [day, [id, musicId]] of Object.entries(shows).entries()) {
    await addShow(store, files, id, musicId, day);
  }
  return { store, files };
}

export async function addShow(
  store: MemoryLibraryStore,
  files: Map<string, Blob>,
  id: string,
  musicIds: string | readonly string[],
  day: number,
): Promise<void> {
  const songs = [];
  for (const musicId of typeof musicIds === "string" ? [musicIds] : musicIds) {
    const file = files.get(musicId) ?? musicBlob(musicId);
    files.set(musicId, file);
    await store.putMusic(musicId, file);
    songs.push({
      id: musicId,
      fileName: `${musicId}.mp3`,
      durationMs: 2000,
      mimeType: "audio/mpeg",
    });
  }
  const createdAt = new Date(Date.UTC(2025, 6, 1 + day)).toISOString();
  await store.saveSlideshow(slideshow({ id, createdAt, songs }));
}

/** Answers by which music file it is given; throws for one it does not know. */
export function answersBy(files: Map<string, Blob>, loudness: Record<string, MusicLoudness>) {
  return (blob: Blob): MusicLoudness => {
    const id = [...files].find(([, candidate]) => candidate === blob)?.[0];
    const answer = id === undefined ? undefined : loudness[id];
    if (answer === undefined) {
      throw new Error(`no measurement answer for music "${id ?? "unknown"}"`);
    }
    return answer;
  };
}

export function passOver(store: LoudnessPassPorts["store"], meter: FakeLoudnessMeter) {
  const logged: unknown[] = [];
  const reported: unknown[] = [];
  const pass = new LoudnessPass({
    store,
    meter,
    log: (error) => logged.push(error),
    reportError: (error) => reported.push(error),
  });
  return { pass, logged, reported };
}
