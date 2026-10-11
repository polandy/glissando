import { cull, type SimilarGroup, type SetAsideReason } from "../../culling/cull";
import {
  PictureCheckerGoneError,
  type PictureChecker,
  type PictureMeasure,
} from "../../culling/picture-checker";
import type { PictureImport, StoredWithThumbnail } from "../../import/picture-import";
import type { StoredPicture } from "../../library/stored-slideshow";

export interface PictureCullingPorts {
  readonly checker: PictureChecker;
  readonly pictures: Pick<PictureImport, "state" | "subscribe" | "remove" | "restore">;
  /**
   * A picture the check could not measure; it simply stays in. A gone checker is logged once,
   * and every picture from then on stays in unchecked.
   */
  log(error: unknown): void;
  /** An unexpected error of the cull, which runs without a caller to throw to. */
  onError(error: unknown): void;
}

/** Set-aside pictures as step 1 shows them, each in capture order. */
export type SetAsideGroup =
  | {
      readonly kind: "similar";
      /** The group's sharpest picture, in the strip unless the user removed it. */
      readonly keptId: string;
      readonly pictures: readonly StoredPicture[];
    }
  | { readonly kind: "blurry"; readonly pictures: readonly StoredPicture[] };

export interface CullingState {
  /** The checks since the last cull; null once every picture taken in is checked. */
  readonly checking: { readonly checked: number; readonly total: number } | null;
  /** Similar groups in capture order, then the blurry pictures. */
  readonly groups: readonly SetAsideGroup[];
  readonly setAsideCount: number;
}

const EMPTY: CullingState = { checking: null, groups: [], setAsideCount: 0 };

/**
 * Checks each picture an import stores and, once every one is checked and the import is idle,
 * sets aside all but the sharpest of each similar group and the blurry ones (ADR-0024). A set-aside
 * picture leaves the import's pictures, so it is neither in the slideshow nor kept; taken in, it
 * is an ordinary picture from then on and never set aside again.
 */
export class PictureCulling {
  readonly #ports: PictureCullingPorts;
  readonly #listeners = new Set<(state: CullingState) => void>();
  #state = EMPTY;
  readonly #measures = new Map<string, PictureMeasure>();
  /** Taken in by the user, or a duplicate taken in anyway: never set aside. */
  readonly #exempt = new Set<string>();
  readonly #setAside = new Map<
    string,
    { readonly picture: StoredPicture; readonly reason: SetAsideReason }
  >();
  #similarGroups: readonly SimilarGroup[] = [];
  readonly #pending = new Set<string>();
  #batch = { checked: 0, total: 0 };
  /** New measures since the last cull. */
  #measuredSinceCull = false;
  #idle: PromiseWithResolvers<undefined> | null = null;
  /** Bumped by `reset()`, so a measurement in flight at that moment is ignored. */
  #generation = 0;
  #checkerGoneLogged = false;

  constructor(ports: PictureCullingPorts) {
    this.#ports = ports;
    ports.pictures.subscribe(() => this.#cullOnceIdle());
  }

  get state(): CullingState {
    return this.#state;
  }

  /** The Svelte store contract: called now with the current state, then on every change. */
  subscribe(listener: (state: CullingState) => void): () => void {
    this.#listeners.add(listener);
    listener(this.#state);
    return () => this.#listeners.delete(listener);
  }

  /** Resolves once every picture handed to `check` is checked and the cull, if due, applied. */
  settled(): Promise<void> {
    return this.#idle?.promise ?? Promise.resolve();
  }

  /** Measures a picture the import just stored; a duplicate taken in anyway is left alone. */
  check({ picture, thumbnail, takenInAnyway }: StoredWithThumbnail): void {
    if (takenInAnyway) {
      this.#exempt.add(picture.id);
      return;
    }
    const generation = this.#generation;
    this.#idle ??= Promise.withResolvers<undefined>();
    this.#pending.add(picture.id);
    this.#batch = { ...this.#batch, total: this.#batch.total + 1 };
    this.#publish();
    this.#ports.checker
      .measure(thumbnail)
      .then(
        (measure) => {
          if (generation === this.#generation) this.#measures.set(picture.id, measure);
        },
        (error: unknown) => this.#logFailedCheck(error),
      )
      .finally(() => {
        if (generation !== this.#generation) return;
        this.#pending.delete(picture.id);
        this.#batch = { ...this.#batch, checked: this.#batch.checked + 1 };
        this.#measuredSinceCull = true;
        this.#cullOnceIdle();
      })
      .catch((error: unknown) => this.#ports.log(error));
  }

  /** Puts a set-aside picture back among the import's, at its capture-date place. */
  takeIn(pictureId: string): void {
    this.#takeIn([pictureId]);
  }

  takeAllIn(): void {
    this.#takeIn([...this.#setAside.keys()]);
  }

  /** Forgets every check and set-aside picture, such as when the import starts over. */
  reset(): void {
    this.#generation += 1;
    this.#measures.clear();
    this.#exempt.clear();
    this.#setAside.clear();
    this.#similarGroups = [];
    this.#pending.clear();
    this.#batch = { checked: 0, total: 0 };
    this.#measuredSinceCull = false;
    this.#idle?.resolve(undefined);
    this.#idle = null;
    this.#publish();
  }

  #takeIn(pictureIds: readonly string[]): void {
    const taken = pictureIds.flatMap((id) => {
      const entry = this.#setAside.get(id);
      if (entry === undefined) throw new Error(`no set-aside picture "${id}" to take in`);
      this.#setAside.delete(id);
      this.#exempt.add(id);
      return [entry.picture];
    });
    this.#ports.pictures.restore(taken);
    this.#publish();
  }

  #logFailedCheck(error: unknown): void {
    if (error instanceof PictureCheckerGoneError) {
      if (this.#checkerGoneLogged) return;
      this.#checkerGoneLogged = true;
    }
    this.#ports.log(error);
  }

  #cullOnceIdle(): void {
    const idle = this.#idle;
    if (this.#pending.size > 0 || this.#ports.pictures.state.busy || idle === null) return;
    // Cleared first: the cull's own changes to the import call back in here.
    this.#idle = null;
    const due = this.#measuredSinceCull;
    this.#measuredSinceCull = false;
    this.#batch = { checked: 0, total: 0 };
    try {
      if (due) this.#cull();
    } catch (error) {
      this.#ports.onError(error);
    } finally {
      // The check ends either way, so the step's Next is never held by a failed cull.
      this.#publish();
      idle.resolve(undefined);
    }
  }

  /** Culls every checked picture of the import again, those set aside so far included. */
  #cull(): void {
    const candidates = [
      ...this.#ports.pictures.state.pictures,
      ...[...this.#setAside.values()].map(({ picture }) => picture),
    ].flatMap((picture) => {
      const measure = this.#measures.get(picture.id);
      return measure === undefined || this.#exempt.has(picture.id)
        ? []
        : [{ id: picture.id, capturedAt: picture.capturedAt, ...measure }];
    });
    const { setAside, similarGroups } = cull(candidates);
    const back = [...this.#setAside.values()]
      .filter(({ picture }) => !setAside.has(picture.id))
      .map(({ picture }) => picture);
    for (const { id } of back) this.#setAside.delete(id);
    if (back.length > 0) this.#ports.pictures.restore(back);
    for (const [id, reason] of setAside) {
      const already = this.#setAside.get(id);
      const picture = already?.picture ?? this.#ports.pictures.remove(id);
      this.#setAside.set(id, { picture, reason });
    }
    this.#similarGroups = similarGroups;
  }

  #publish(): void {
    const { checked, total } = this.#batch;
    this.#state = {
      checking: this.#idle === null ? null : { checked, total },
      groups: this.#groups(),
      setAsideCount: this.#setAside.size,
    };
    for (const listener of this.#listeners) listener(this.#state);
  }

  #groups(): SetAsideGroup[] {
    const aside = (id: string, reason: SetAsideReason): StoredPicture[] => {
      const entry = this.#setAside.get(id);
      return entry?.reason === reason ? [entry.picture] : [];
    };
    const similar = this.#similarGroups.flatMap(({ keptId, similarIds }): SetAsideGroup[] => {
      const pictures = similarIds.flatMap((id) => aside(id, "similar"));
      return pictures.length === 0 ? [] : [{ kind: "similar", keptId, pictures }];
    });
    const blurry = [...this.#setAside.values()]
      .filter(({ reason }) => reason === "blurry")
      .map(({ picture }) => picture)
      .sort((first, second) => Date.parse(first.capturedAt) - Date.parse(second.capturedAt));
    return blurry.length === 0 ? similar : [...similar, { kind: "blurry", pictures: blurry }];
  }
}
