import type { Message } from "./messages";

/** German copy of the playlist: its songs in the panel, the music editor and the import. */
export const dePlaylist = {
  "slideshow.addMusic": "Musik hinzufügen",
  "slideshow.songCount": { one: "1 Song", other: "{count} Songs" },
} as const satisfies Record<string, Message>;
