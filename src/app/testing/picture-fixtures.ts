/** Typed pictures and a mount slot the screen and route harnesses share; no real photo is involved. */
import type { StoredPicture } from "../../library/stored-slideshow";
import type { PictureTile } from "../screens/view-models";

const PICTURE_COLOURS = { veil: "#404040", accent: "#C0C0C0" } as const;
const PICTURE_CAPTURED_AT = "2025-07-01T10:00:00Z";

/** A stored 100 × 100 picture `id`, named `<id>.jpg`; `overrides` replace any field. */
export function storedPicture(id: string, overrides: Partial<StoredPicture> = {}): StoredPicture {
  return {
    id,
    capturedAt: PICTURE_CAPTURED_AT,
    width: 100,
    height: 100,
    fileName: `${id}.jpg`,
    colours: PICTURE_COLOURS,
    ...overrides,
  };
}

/** A strip tile for picture `id` with a plain thumbnail; `overrides` replace any field. */
export function pictureTile(
  id: string,
  thumbnailUrl: string,
  overrides: Partial<PictureTile> = {},
): PictureTile {
  return {
    id,
    thumbnailUrl,
    capturedAt: PICTURE_CAPTURED_AT,
    ownMotion: false,
    ownDurationMs: null,
    ownTransition: null,
    pairedWithNumber: null,
    blurredFill: false,
    alone: false,
    colours: PICTURE_COLOURS,
    ...overrides,
  };
}

/** Holds the unmount of the last mount, so a test's teardown can release it. */
export interface MountSlot {
  hold(destroy: () => void): void;
  release(): void;
}

export function createMountSlot(): MountSlot {
  const held: (() => void)[] = [];
  return {
    hold: (destroy) => held.push(destroy),
    release: () => {
      for (const destroy of held.splice(0)) destroy();
    },
  };
}
