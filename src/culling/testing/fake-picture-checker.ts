import {
  PictureCheckError,
  PictureCheckerGoneError,
  type PictureChecker,
  type PictureMeasure,
} from "../picture-checker";

const SHARP = 1000;
const FNV_OFFSET = 0xcbf2_9ce4_8422_2325n;
const FNV_PRIME = 0x100_0000_01b3n;
const SIXTY_FOUR_BITS = (1n << 64n) - 1n;
const MIX_FIRST = 0xbf58_476d_1ce4_e5b9n;
const MIX_SECOND = 0x94d0_49bb_1331_11ebn;

/**
 * Measures a thumbnail by its text, as the fakes write thumbnails: a picture named in `measures`
 * gets that measure, any other one a sharp measure with a hash of its own (FNV-1a of the text,
 * mixed like SplitMix64, so no two pictures look alike). `hold()` keeps every measurement waiting;
 * after `goAway()` every measurement rejects as a crashed worker's does.
 */
export class FakePictureChecker implements PictureChecker {
  /** The thumbnail texts asked for, in order. */
  readonly asked: string[] = [];
  readonly #measures: ReadonlyMap<string, PictureMeasure>;
  readonly #unmeasurable: ReadonlySet<string>;
  #gate: PromiseWithResolvers<undefined> | null = null;
  #gone = false;

  constructor(
    measures: Readonly<Record<string, PictureMeasure>> = {},
    unmeasurable: readonly string[] = [],
  ) {
    this.#measures = new Map(Object.entries(measures));
    this.#unmeasurable = new Set(unmeasurable);
  }

  hold(): void {
    this.#gate = Promise.withResolvers<undefined>();
  }

  release(): void {
    this.#gate?.resolve(undefined);
    this.#gate = null;
  }

  goAway(): void {
    this.#gone = true;
  }

  async measure(thumbnail: Blob): Promise<PictureMeasure> {
    const text = await thumbnail.text();
    this.asked.push(text);
    await this.#gate?.promise;
    if (this.#gone) throw new PictureCheckerGoneError("The fake checker is gone");
    if (this.#unmeasurable.has(text)) throw new PictureCheckError(`cannot decode "${text}"`);
    return this.#measures.get(text) ?? { sharpness: SHARP, hash: fnv1a(text) };
  }
}

function fnv1a(text: string): bigint {
  let hash = FNV_OFFSET;
  for (const code of new TextEncoder().encode(text)) {
    hash = ((hash ^ BigInt(code)) * FNV_PRIME) & SIXTY_FOUR_BITS;
  }
  hash = ((hash ^ (hash >> 30n)) * MIX_FIRST) & SIXTY_FOUR_BITS;
  hash = ((hash ^ (hash >> 27n)) * MIX_SECOND) & SIXTY_FOUR_BITS;
  return hash ^ (hash >> 31n);
}
