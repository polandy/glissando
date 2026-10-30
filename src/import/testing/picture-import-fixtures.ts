import type { PictureIdentity } from "../../library/picture-identity";
import type { RgbPixel } from "../../library/picture-colours";
import { MemoryLibraryStore } from "../../library/testing/memory-store";
import type { PictureBlobs } from "../../library/library-store";
import type { Place } from "../../places/nearest-place";
import type { DecodedPicture } from "../downscale";
import type { ExifGps } from "../exif-gps";
import { UnreadablePictureError } from "../unreadable-picture";
import { localPictureSource } from "../local-picture-source";
import {
  PictureImport,
  type PictureImportState,
  type StoredWithThumbnail,
} from "../picture-import";
import type { PickInput } from "../picture-import-picks";

export const picture = (name: string, type = "image/jpeg"): File =>
  new File([name], name, { type });

/** Decodes every file to a 300×200 picture; files named in `unreadable` fail to decode. */
export class FakeDecoder {
  readonly decoded: string[] = [];
  #gate: Promise<void> | null = null;
  #open: (() => void) | null = null;
  #reach: (() => void) | null = null;
  /** Settles once a decode waits behind `hold()`. */
  reached: Promise<void> = Promise.resolve();

  constructor(private readonly unreadable: ReadonlySet<string> = new Set()) {}

  /** Holds every decode until `open()`, to act while a file is in flight. */
  hold(): void {
    this.#gate = new Promise((resolve) => (this.#open = resolve));
    this.reached = new Promise((resolve) => (this.#reach = resolve));
  }

  open(): void {
    this.#open?.();
    this.#gate = null;
  }

  readonly decode = async (file: File): Promise<DecodedPicture> => {
    this.decoded.push(file.name);
    this.#reach?.();
    await this.#gate;
    if (this.unreadable.has(file.name)) {
      throw new UnreadablePictureError(file.name, "decode");
    }
    return {
      width: 300,
      height: 200,
      display: new Blob([`${file.name} display`]),
      thumbnail: new Blob([`${file.name} thumbnail`]),
    };
  };
}

/** Capture dates by file name; unknown names default to one shared date. */
export const captureDates =
  (dates: Readonly<Record<string, string>>) =>
  (file: File): Promise<string> =>
    Promise.resolve(dates[file.name] ?? "2025-07-01T10:00:00Z");

export function sequentialIds(): () => string {
  let next = 1;
  return () => `picture-${next++}`;
}

/** A store that runs out of space from its `limit + 1`-th picture on. */
export class FillingStore extends MemoryLibraryStore {
  #stored = 0;
  constructor(private readonly limit: number) {
    super();
  }
  override putPicture(id: string, blobs: PictureBlobs): Promise<void> {
    if (this.#stored >= this.limit) {
      return Promise.reject(new DOMException("the disk is full", "QuotaExceededError"));
    }
    this.#stored += 1;
    return super.putPicture(id, blobs);
  }
}

export function setUp(
  options: {
    decoder?: FakeDecoder;
    dates?: Record<string, string>;
    store?: MemoryLibraryStore;
    captureDate?: (file: File) => Promise<string>;
    known?: readonly PictureIdentity[];
    /** The decoded display blob's pixels for `pictureColours`; a picture with no colour by default. */
    pixels?: (blob: Blob) => Promise<readonly RgbPixel[]>;
    /** A file's EXIF GPS coordinate; none by default. */
    gps?: (file: File) => Promise<ExifGps | null>;
    /** The place a picture's GPS resolves to; absent: pictures get no place. */
    resolvePlace?: (gps: ExifGps) => Promise<Place | null>;
  } = {},
) {
  const decoder = options.decoder ?? new FakeDecoder();
  const store = options.store ?? new MemoryLibraryStore();
  const stored: StoredWithThumbnail[] = [];
  const logged: unknown[] = [];
  const pictureImport = new PictureImport({
    store,
    pixels: options.pixels ?? (() => Promise.resolve([])),
    log: (error) => logged.push(error),
    newId: sequentialIds(),
    stored: (picture) => stored.push(picture),
    ...(options.known === undefined ? {} : { known: () => options.known ?? [] }),
    ...(options.resolvePlace === undefined ? {} : { resolvePlace: options.resolvePlace }),
  });
  const captureDate = options.captureDate ?? captureDates(options.dates ?? {});
  const gps = options.gps ?? (() => Promise.resolve(null));
  const addFiles = (files: readonly File[], pick?: PickInput): void => {
    const sources = files.map((file) =>
      localPictureSource(file, { decode: decoder.decode, captureDate, gps }),
    );
    if (pick === undefined) pictureImport.add(sources);
    else pictureImport.add(sources, pick);
  };
  const states: PictureImportState[] = [];
  pictureImport.subscribe((state) => states.push(state));
  return { pictureImport, addFiles, decoder, store, states, stored, logged };
}

export const fileNames = (state: PictureImportState): string[] =>
  state.pictures.map((stored) => stored.fileName);
