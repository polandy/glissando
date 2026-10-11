import type { Catalogue } from "./messages";
import type { dePlaylist } from "./catalogue-de-playlist";

/** English copy of the playlist; typed to the German keys. */
export const enPlaylist: Pick<Catalogue, keyof typeof dePlaylist> = {
  "slideshow.addMusic": "Add music",
  "slideshow.songCount": { one: "1 song", other: "{count} songs" },
};
