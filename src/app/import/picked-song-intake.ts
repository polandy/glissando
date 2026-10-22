import { readPickedMusic, type MusicPickPorts } from "./music-pick";
import { replaceRow, type SongRowHost } from "./song-row-host";

/** Runs one read after another, in the order picked: a conversion takes the device's power. */
export interface SongReadQueue {
  next(step: () => Promise<void>): Promise<void>;
}

/**
 * Appends the files to the song list, each read in turn: chosen as it is or as its FLAC copy
 * when a target browser cannot decode it (ADR-0020), or found unusable. Resolves once all are
 * read, rejecting with the first unexpected error.
 */
export function addPickedSongs(
  host: SongRowHost,
  files: readonly File[],
  ports: MusicPickPorts,
  queue: SongReadQueue,
): Promise<void> {
  const keyed = files.map((file) => ({ file, key: host.nextKey() }));
  host.setSongs([
    ...host.songs(),
    ...keyed.map(({ file, key }) => ({ key, kind: "reading" as const, pickedName: file.name })),
  ]);
  for (const { key } of keyed) host.beginRead(key);
  return Promise.all(
    keyed.map(({ file, key }) => queue.next(() => readSong(host, ports, file, key))),
  ).then(() => undefined);
}

async function readSong(
  host: SongRowHost,
  ports: MusicPickPorts,
  file: File,
  key: number,
): Promise<void> {
  const signal = host.readSignal(key);
  if (signal === undefined || signal.aborted) return;
  try {
    const read = await readPickedMusic(
      file,
      ports,
      (converting) => replaceRow(host, key, { key, ...converting }),
      signal,
    );
    replaceRow(host, key, { key, ...read });
  } catch (error) {
    if (signal.aborted) return;
    host.removeSong(key);
    throw error;
  }
}
