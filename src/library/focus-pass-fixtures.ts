import { FOCUS_DETECTOR_VERSION } from "../focus/focus-detector-version";
import { FocusPass, type FocusPassPorts } from "./focus-pass";
import { type FocusDetector } from "./focus-detector";
import type { PictureFocus, StoredFocus } from "./picture-focus";
import type { StoredSlideshow } from "./stored-slideshow";
import { picture, slideshow } from "./testing/library-store-contract";
import { MemoryLibraryStore } from "./testing/memory-store";

export const FACES: PictureFocus = {
  kind: "subject",
  box: { x: 0.2, y: 0.1, width: 0.3, height: 0.4 },
  foundBy: "face",
};
export const NOTHING: PictureFocus = { kind: "none" };

/** `focus` as a store would hold it, found by the given detector version (the current one by default). */
export function storedFocus(focus: PictureFocus, detector = FOCUS_DETECTOR_VERSION): StoredFocus {
  return { focus, detector };
}

export const thumbnail = (id: string): Blob =>
  new Blob([`${id} thumbnail`], { type: "image/jpeg" });

/**
 * A store holding a slideshow per entry, each created a day after the one before (the pass takes
 * the newest first); each picture's thumbnail is the one returned.
 */
export async function storeWith(
  shows: Record<string, readonly string[]>,
): Promise<{ store: MemoryLibraryStore; thumbnails: Map<string, Blob> }> {
  const store = new MemoryLibraryStore();
  const thumbnails = new Map<string, Blob>();
  for (const [day, [id, pictureIds]] of Object.entries(shows).entries()) {
    for (const pictureId of pictureIds) {
      const blob = thumbnail(pictureId);
      thumbnails.set(pictureId, blob);
      await store.putPicture(pictureId, { display: blob, thumbnail: blob });
    }
    const createdAt = new Date(Date.UTC(2025, 6, 1 + day)).toISOString();
    await store.saveSlideshow(slideshow({ id, createdAt, pictures: pictureIds.map(picture) }));
  }
  return { store, thumbnails };
}

/** Answers by which picture's thumbnail it is given; throws for one it does not know. */
export function answersBy(thumbnails: Map<string, Blob>, focus: Record<string, PictureFocus>) {
  return (blob: Blob): PictureFocus => {
    const id = [...thumbnails].find(([, candidate]) => candidate === blob)?.[0];
    const answer = id === undefined ? undefined : focus[id];
    if (answer === undefined) {
      throw new Error(`no detection answer for picture "${id ?? "unknown"}"`);
    }
    return answer;
  };
}

/** Wraps a detector: tells when the n-th detection starts and how many ever ran at once. */
export class ObservedDetector implements FocusDetector {
  readonly #inner: FocusDetector;
  readonly #starts: PromiseWithResolvers<undefined>[] = [];
  #calls = 0;
  #inFlight = 0;
  mostAtOnce = 0;

  constructor(inner: FocusDetector) {
    this.#inner = inner;
  }

  /** Resolves once detection number `count` (from 1) has started. */
  started(count: number): Promise<void> {
    return this.#start(count).promise;
  }

  async detect(blob: Blob): Promise<PictureFocus> {
    this.#calls += 1;
    this.#inFlight += 1;
    this.mostAtOnce = Math.max(this.mostAtOnce, this.#inFlight);
    this.#start(this.#calls).resolve(undefined);
    try {
      return await this.#inner.detect(blob);
    } finally {
      this.#inFlight -= 1;
    }
  }

  #start(count: number): PromiseWithResolvers<undefined> {
    const existing = this.#starts[count];
    if (existing !== undefined) {
      return existing;
    }
    const created = Promise.withResolvers<undefined>();
    this.#starts[count] = created;
    return created;
  }
}

export function passOver(
  store: FocusPassPorts["store"],
  detector: FocusDetector,
  pausesOn?: (error: unknown) => boolean,
): { pass: FocusPass; logged: unknown[]; reported: unknown[] } {
  const logged: unknown[] = [];
  const reported: unknown[] = [];
  const pass = new FocusPass({
    store,
    detector,
    log: (error) => logged.push(error),
    reportError: (error) => reported.push(error),
    ...(pausesOn === undefined ? {} : { pausesOn }),
  });
  return { pass, logged, reported };
}

/** Methods of `LibraryStore` that write; a picture's own motion must never go through any of them. */
type WriteMethodName =
  | "putPicture"
  | "putMusic"
  | "putVideo"
  | "saveSlideshow"
  | "updateSlideshow"
  | "updateSlideshowWith"
  | "putPictureFocus"
  | "putMusicBeats"
  | "putMusicLoudness"
  | "claimMedia"
  | "releaseClaim"
  | "deleteSlideshow"
  | "deleteUnreferencedMedia";

/** A store that records the name of every write method called on it, so a test can check exactly what it wrote. */
export class WriteRecordingStore extends MemoryLibraryStore {
  readonly writes: WriteMethodName[] = [];

  override putPicture(...args: Parameters<MemoryLibraryStore["putPicture"]>): Promise<void> {
    this.writes.push("putPicture");
    return super.putPicture(...args);
  }

  override putMusic(...args: Parameters<MemoryLibraryStore["putMusic"]>): Promise<void> {
    this.writes.push("putMusic");
    return super.putMusic(...args);
  }

  override putVideo(...args: Parameters<MemoryLibraryStore["putVideo"]>): Promise<void> {
    this.writes.push("putVideo");
    return super.putVideo(...args);
  }

  override saveSlideshow(...args: Parameters<MemoryLibraryStore["saveSlideshow"]>): Promise<void> {
    this.writes.push("saveSlideshow");
    return super.saveSlideshow(...args);
  }

  override updateSlideshow(
    ...args: Parameters<MemoryLibraryStore["updateSlideshow"]>
  ): Promise<void> {
    this.writes.push("updateSlideshow");
    return super.updateSlideshow(...args);
  }

  override updateSlideshowWith(
    ...args: Parameters<MemoryLibraryStore["updateSlideshowWith"]>
  ): Promise<StoredSlideshow> {
    this.writes.push("updateSlideshowWith");
    return super.updateSlideshowWith(...args);
  }

  override putPictureFocus(
    ...args: Parameters<MemoryLibraryStore["putPictureFocus"]>
  ): Promise<void> {
    this.writes.push("putPictureFocus");
    return super.putPictureFocus(...args);
  }

  override putMusicBeats(...args: Parameters<MemoryLibraryStore["putMusicBeats"]>): Promise<void> {
    this.writes.push("putMusicBeats");
    return super.putMusicBeats(...args);
  }

  override putMusicLoudness(
    ...args: Parameters<MemoryLibraryStore["putMusicLoudness"]>
  ): Promise<void> {
    this.writes.push("putMusicLoudness");
    return super.putMusicLoudness(...args);
  }

  override claimMedia(...args: Parameters<MemoryLibraryStore["claimMedia"]>): Promise<void> {
    this.writes.push("claimMedia");
    return super.claimMedia(...args);
  }

  override releaseClaim(...args: Parameters<MemoryLibraryStore["releaseClaim"]>): Promise<void> {
    this.writes.push("releaseClaim");
    return super.releaseClaim(...args);
  }

  override deleteSlideshow(
    ...args: Parameters<MemoryLibraryStore["deleteSlideshow"]>
  ): Promise<void> {
    this.writes.push("deleteSlideshow");
    return super.deleteSlideshow(...args);
  }

  override deleteUnreferencedMedia(
    ...args: Parameters<MemoryLibraryStore["deleteUnreferencedMedia"]>
  ): Promise<void> {
    this.writes.push("deleteUnreferencedMedia");
    return super.deleteUnreferencedMedia(...args);
  }
}
