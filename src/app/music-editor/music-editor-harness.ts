/** Shared set-up of the music editor's browser tests. */
import { flushSync } from "svelte";
import type { BetweenSongs, MusicTrim, PictureChanges } from "../../library/own-music";
import type { PictureLength } from "../../library/picture-length";
import type { StoredMusic, StoredPicture, StoredSlideshow } from "../../library/stored-slideshow";
import type { SampleTrack, SampleTrackId } from "../../sample-music/sample-tracks";
import type { BeatsStatus } from "../beats/music-beats-known";
import type { LoudnessStatus } from "../loudness/music-loudness-known";
import type { SongsBeatsStatus, SongsLoudnessStatus } from "./slideshow-times";
import { FakeScheduler } from "../../ui-kit/testing/fake-scheduler";
import type { SamplePreview } from "../sample-music/sample-preview";
import { mountWithTranslator } from "../testing/mount-with-translator";
import { reactiveProps } from "../testing/reactive-props.svelte";
import { Toaster } from "../toast/toaster";
import type { ListenKind, ListenState } from "./listen-preview";
import { createMemoryStorage } from "../testing/memory-storage";
import {
  createStorageMusicEditorDetailsStore,
  type MusicEditorDetailsStore,
} from "./music-editor-details";
import MusicEditorScreen from "./MusicEditorScreen.svelte";
import type { PendingSong, SampleSongRow } from "./song-intake";

export const TRACK_MS = 204_000;

/** A slideshow of `count` pictures with a 3:24 track; `durations` gives pictures their own. */
export function slideshowWith(
  music: Partial<StoredMusic> = {},
  { count = 24, durations = {} as Readonly<Record<number, number>> } = {},
): StoredSlideshow {
  const pictures: StoredPicture[] = Array.from({ length: count }, (_, index) => ({
    id: `p${index}`,
    capturedAt: "2025-07-01T10:00:00Z",
    width: 1,
    height: 1,
    fileName: `p${index}.jpg`,
    colours: { veil: "#404040", accent: "#C0C0C0" },
    ...(durations[index] === undefined ? {} : { durationMs: durations[index] }),
  }));
  return {
    id: "show",
    title: "Sommer am See",
    createdAt: "2025-07-02T00:00:00Z",
    pictures,
    secondsPerPicture: 5,
    songs: [
      {
        id: "m1",
        fileName: "Sommerwind.mp3",
        durationMs: TRACK_MS,
        mimeType: "audio/mpeg",
        ...music,
      },
    ],
  };
}

/** A song of `durationMs` named `<id>.mp3`. */
export function song(id: string, durationMs: number, own: Partial<StoredMusic> = {}): StoredMusic {
  return { id, fileName: `${id}.mp3`, durationMs, mimeType: "audio/mpeg", ...own };
}

/** `slideshowWith`'s pictures playing the playlist `songs`. */
export function slideshowOfSongs(
  songs: readonly StoredMusic[],
  { count = 24, ...own }: { count?: number } & Partial<StoredSlideshow> = {},
): StoredSlideshow {
  return { ...slideshowWith({}, { count }), songs, ...own };
}

/** A details store that starts with the "Details" switch off: the Essentials. */
export function hiddenDetailsStore(): MusicEditorDetailsStore {
  return createStorageMusicEditorDetailsStore(createMemoryStorage());
}

/** A details store that starts with the "Details" switch on. */
export function shownDetailsStore(): MusicEditorDetailsStore {
  const store = createStorageMusicEditorDetailsStore(createMemoryStorage());
  store.write("shown");
  return store;
}

/** The header's "Details" switch. */
export function detailsSwitch(): HTMLInputElement | null {
  return document.querySelector<HTMLInputElement>('input[role="switch"][aria-label="Details"]');
}

let destroy: (() => void) | null = null;

export function unmountEditor(): void {
  destroy?.();
  destroy = null;
}

/**
 * Mounts the editor on `slideshow` with what is known of its beats, the "Details" switch on so
 * every control is there (`hiddenDetailsStore` for the Essentials); its props can be changed
 * afterwards, as the route does.
 */
export function mountEditor(
  slideshow: StoredSlideshow = slideshowWith(),
  beats: BeatsStatus = { kind: "listening" },
  loudness: LoudnessStatus = { kind: "listening" },
  samplePreview: SamplePreview | undefined = undefined,
  detailsStore: MusicEditorDetailsStore = shownDetailsStore(),
) {
  const calls = {
    trims: [] as (MusicTrim | undefined)[],
    fadesIn: [] as (number | undefined)[],
    fadesOut: [] as (number | undefined)[],
    volumes: [] as (number | undefined)[],
    volumeResets: 0,
    listens: [] as ListenKind[],
    stops: 0,
    listenVolumes: 0,
    toggleOriginals: 0,
    pictureChanges: [] as (PictureChanges | undefined)[],
    pictureLength: [] as (PictureLength | undefined)[],
    secondsPerPicture: [] as number[],
    setOwnPictureTimes: 0,
    selected: [] as string[],
    moves: [] as string[],
    removed: [] as string[],
    added: [] as string[],
    dismissed: [] as number[],
    betweenSongs: [] as (BetweenSongs | undefined)[],
    repeatMusic: [] as (true | undefined)[],
    removedSampleRows: [] as SampleTrackId[],
    addedSampleTracks: [] as SampleTrackId[],
    errors: [] as unknown[],
  };
  const songId = slideshow.songs[0]?.id ?? null;
  const notAdded: (trackId: SampleTrackId) => boolean = () => false;
  const props = reactiveProps({
    slideshow,
    selectedSongId: songId,
    beats: new Map(slideshow.songs.map(({ id }) => [id, beats])) as SongsBeatsStatus,
    loudness: new Map(slideshow.songs.map(({ id }) => [id, loudness])) as SongsLoudnessStatus,
    peaks: Float32Array.from({ length: 1000 }, (_, index) => (index % 10) / 10),
    listening: null as ListenState | null,
    pending: [] as readonly PendingSong[],
    sampleRows: [] as readonly SampleSongRow[],
    samplePreview: samplePreview as SamplePreview | undefined,
    detailsStore,
    toaster: new Toaster(new FakeScheduler()),
    onRemoveSampleRow: (trackId: SampleTrackId) => calls.removedSampleRows.push(trackId),
    isSampleTrackAdded: notAdded,
    onAddSampleTrack: (track: SampleTrack) => calls.addedSampleTracks.push(track.id),
    onBack: () => {},
    onError: (error: unknown) => calls.errors.push(error),
    onTrim: (trim: MusicTrim | undefined) => calls.trims.push(trim),
    onFadeIn: (fadeMs: number | undefined) => calls.fadesIn.push(fadeMs),
    onFadeOut: (fadeMs: number | undefined) => calls.fadesOut.push(fadeMs),
    onVolume: (volumeDb: number | undefined) => calls.volumes.push(volumeDb),
    onVolumeReset: () => (calls.volumeResets += 1),
    onPictureChanges: (changes: PictureChanges | undefined) => calls.pictureChanges.push(changes),
    onPictureLength: (length: PictureLength | undefined) => calls.pictureLength.push(length),
    onSecondsPerPicture: (seconds: number) => calls.secondsPerPicture.push(seconds),
    onSetOwnPictureTimes: () => (calls.setOwnPictureTimes += 1),
    onListen: (kind: ListenKind) => calls.listens.push(kind),
    onStopListening: () => (calls.stops += 1),
    onListenVolume: () => (calls.listenVolumes += 1),
    onToggleOriginal: () => (calls.toggleOriginals += 1),
    onSelectSong: (id: string) => calls.selected.push(id),
    onMoveSong: (id: string, toIndex: number) => calls.moves.push(`${id} → ${toIndex}`),
    onRemoveSong: (id: string) => calls.removed.push(id),
    onAddSongs: (files: readonly File[]) => calls.added.push(...files.map((file) => file.name)),
    onDismissPending: (key: number) => calls.dismissed.push(key),
    onBetweenSongs: (between: BetweenSongs | undefined) => calls.betweenSongs.push(between),
    onRepeatMusic: (repeatMusic: true | undefined) => calls.repeatMusic.push(repeatMusic),
    saving: false,
  });
  const mounted = mountWithTranslator(MusicEditorScreen, props);
  destroy = mounted.destroy;
  const set = (changes: Partial<typeof props>) => {
    Object.assign(props, changes);
    flushSync();
  };
  return { target: mounted.target, calls, set };
}

export function handle(edge: "Anfang" | "Ende"): HTMLButtonElement {
  const found = document.querySelector<HTMLButtonElement>(`[role="slider"][aria-label="${edge}"]`);
  if (found === null) {
    throw new Error(`no handle "${edge}"`);
  }
  return found;
}

export function text(selector: string): string {
  return document.querySelector(selector)?.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

/** The client x of track time `atMs` on the waveform. */
export function xOf(atMs: number): number {
  const wave = document.querySelector(".wave");
  if (wave === null) {
    throw new Error("no waveform");
  }
  const rect = wave.getBoundingClientRect();
  return rect.left + (atMs / TRACK_MS) * rect.width;
}

/** Drags from track time `fromMs` on `on` to `toMs`, releasing there. */
export function drag(on: Element, fromMs: number, toMs: number): void {
  const at = (ms: number) => ({ clientX: xOf(ms), clientY: 0, pointerId: 1, bubbles: true });
  on.dispatchEvent(new PointerEvent("pointerdown", at(fromMs)));
  window.dispatchEvent(new PointerEvent("pointermove", at(toMs)));
  flushSync();
  window.dispatchEvent(new PointerEvent("pointerup", at(toMs)));
  flushSync();
}

/** `mountEditor` with the "Details" switch on: the volume line, beat ticks, slideshow lane and hatching. */
export function mountDetailed(
  slideshow?: StoredSlideshow,
  beats?: BeatsStatus,
  loudness?: LoudnessStatus,
) {
  return mountEditor(slideshow, beats, loudness, undefined, shownDetailsStore());
}
