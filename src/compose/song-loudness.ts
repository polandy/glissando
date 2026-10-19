import type { MusicLoudness } from "../loudness";

/** The loudness measured so far per music id; a song absent was not listened to yet. */
export type SongLoudness = ReadonlyMap<string, MusicLoudness>;

/** Before any song was measured. */
export const NO_SONG_LOUDNESS: SongLoudness = new Map();
