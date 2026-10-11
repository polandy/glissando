import type { MusicBeats } from "../../beats";
import { BeatPass, type BeatPassPorts } from "../beat-pass";
import type { FakeBeatDetector } from "./fake-beat-detector";
import { musicBlob, slideshow } from "./library-store-contract";
import { MemoryLibraryStore } from "./memory-store";

export const DRUMS: MusicBeats = { kind: "beats", beatsMs: [500, 1000, 1500], beatsPerMinute: 120 };
export const NO_CLEAR_BEAT: MusicBeats = { kind: "none" };

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
export function answersBy(files: Map<string, Blob>, beats: Record<string, MusicBeats>) {
  return (blob: Blob): MusicBeats => {
    const id = [...files].find(([, candidate]) => candidate === blob)?.[0];
    const answer = id === undefined ? undefined : beats[id];
    if (answer === undefined) {
      throw new Error(`no detection answer for music "${id ?? "unknown"}"`);
    }
    return answer;
  };
}

export function passOver(store: BeatPassPorts["store"], detector: FakeBeatDetector) {
  const logged: unknown[] = [];
  const reported: unknown[] = [];
  const pass = new BeatPass({
    store,
    detector,
    log: (error) => logged.push(error),
    reportError: (error) => reported.push(error),
  });
  return { pass, logged, reported };
}
