import type { StoredPicture, StoredSlideshow } from "../library/stored-slideshow";
import { type PageExportJob, type PageExportProgress } from "./export-page";
import { FakeScaler, fixedPlayerAsset, MemoryPageSink } from "./testing/fakes";

export function picture(id: string, width: number, height: number): StoredPicture {
  return {
    id,
    capturedAt: "2026-07-01T10:00:00Z",
    width,
    height,
    fileName: `${id}.jpg`,
    colours: { veil: "#404040", accent: "#C0C0C0" },
  };
}

export const WITHOUT_MUSIC: StoredSlideshow = {
  id: "s1",
  title: "Rom",
  createdAt: "2026-07-02T10:00:00Z",
  pictures: [picture("big", 3840, 2160), picture("fits", 1000, 600), picture("tall", 2160, 3840)],
  songs: [],
  secondsPerPicture: 4,
};

export const STORED: StoredSlideshow = {
  ...WITHOUT_MUSIC,
  songs: [{ id: "m1", fileName: "song.mp3", durationMs: 60_000, mimeType: "audio/mpeg" }],
};

/** Two songs that the pictures, filling them, both reach, crossfading. */
export const TWO_SONGS: StoredSlideshow = {
  ...WITHOUT_MUSIC,
  songs: [
    { id: "m1", fileName: "one.mp3", durationMs: 8000, mimeType: "audio/mpeg" },
    { id: "m2", fileName: "two.ogg", durationMs: 8000, mimeType: "audio/ogg" },
  ],
};

export const COPY = {
  eyebrow: "Diashow",
  summary: "3 Bilder · 0:12 · mit Musik",
  madeWith: "Erstellt mit Glissando",
  play: "Abspielen",
  pause: "Pause",
  mute: "Ton aus",
  unmute: "Ton an",
  fullScreen: "Vollbild",
  timeline: "Zeitleiste",
  playAgain: "Nochmal abspielen",
  cannotPlay: "Geht nicht.",
};

export interface Run {
  readonly job: PageExportJob;
  readonly sink: MemoryPageSink;
  readonly scaler: FakeScaler;
  readonly reads: string[];
  readonly progress: PageExportProgress[];
}

export function run(overrides: Partial<PageExportJob> = {}): Run {
  const sink = new MemoryPageSink();
  const scaler = new FakeScaler();
  const reads: string[] = [];
  const progress: PageExportProgress[] = [];
  const job: PageExportJob = {
    stored: STORED,
    focus: new Map(),
    beats: new Map(),
    sizeId: "small",
    lang: "de",
    copy: COPY,
    noscript: "Braucht JavaScript.",
    media: {
      pictureBlob: (id) => {
        reads.push(id);
        return Promise.resolve(new Blob([`bytes of ${id}`], { type: "image/jpeg" }));
      },
      musicBlob: (id) => Promise.resolve(new Blob([`bytes of ${id}`], { type: "audio/mpeg" })),
    },
    scaler,
    sink,
    playerAsset: fixedPlayerAsset(),
    onProgress: (step) => progress.push(step),
    ...overrides,
  };
  return { job, sink, scaler, reads, progress };
}

/** The text inside the `<script>` with `id`, or undefined. */
export function block(page: string, id: string): string | undefined {
  const match = new RegExp(`<script[^>]* id="${id}"[^>]*>([^<]*)</script>`).exec(page);
  return match?.[1];
}

export function decoded(page: string, id: string): string | undefined {
  const base64 = block(page, id);
  return base64 === undefined ? undefined : atob(base64);
}
