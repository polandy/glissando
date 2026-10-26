import { OWN_SECONDS_PICTURE_LENGTH, type PictureLength } from "../../library/picture-length";
import type { LibraryStore } from "../../library/library-store";
import { DEFAULT_SECONDS_PER_PICTURE, type StoredSlideshow } from "../../library/stored-slideshow";
import type { SlideshowHome } from "../routes/slideshow-storage";
import type { SampleSongPickPorts, SampleSongRow } from "../sample-music/sample-song-pick";
import type { ChosenMusic, MusicPickPorts, PendingSong } from "./music-pick";
import type { PictureIntakePorts } from "./picture-intake";

/** What `ImportSession` needs from its host: storage, the server and picking music and pictures. */
export interface ImportSessionPorts extends PictureIntakePorts, MusicPickPorts {
  readonly store: LibraryStore;
  /**
   * Creates a server slideshow with its songs' audio, one blob per song in playlist order
   * (`ServerLibrary.createSlideshow`).
   */
  createOnServer(slideshow: StoredSlideshow, songsAudio: readonly Blob[]): Promise<StoredSlideshow>;
  /** Uniform in [0, 1); what Shuffle draws the pictures step's order from. */
  readonly random: () => number;
  /** `undefined` when the build turns sample music off (SAMPLE_MUSIC.md): no track can be added. */
  readonly sampleMusic?: SampleSongPickPorts;
}

/** A song of step 2's list: chosen, or still pending; `key` names its row. */
export type ImportSong =
  | PendingSong
  | ({ readonly key: number } & ChosenMusic)
  | ({ readonly key: number } & SampleSongRow);

export type ChosenSong = Extract<ImportSong, { kind: "chosen" }>;

/** Where the slideshow lives (step 1) and step 2's choices. */
export interface ImportChoices {
  /** A server slideshow links Immich photos and is created on the server (ADR-0018). */
  readonly home: SlideshowHome;
  /** Played one after another in this order (ADR-0023). */
  readonly songs: readonly ImportSong[];
  readonly secondsPerPicture: number;
  /** With music, the pictures last their seconds (the default) or, `undefined`, fill it. */
  readonly pictureLength: PictureLength | undefined;
  /** The music repeats from its first song for as long as the slideshow lasts (ADR-0047). */
  readonly repeatMusic?: true;
}

/** The songs the slideshow is created with, in the list's order. */
export function chosenSongs(choices: ImportChoices): ChosenSong[] {
  return choices.songs.filter((song): song is ChosenSong => song.kind === "chosen");
}

export const INITIAL_CHOICES: ImportChoices = {
  home: "device",
  songs: [],
  secondsPerPicture: DEFAULT_SECONDS_PER_PICTURE,
  pictureLength: OWN_SECONDS_PICTURE_LENGTH,
};
