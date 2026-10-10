import type { StoredSlideshow } from "../../library/stored-slideshow";
import type { SlideshowStorage } from "../screens/view-models";

/** The store a slideshow lives in (`dev-docs/SERVER_LIBRARY.md`). */
export type SlideshowHome = "device" | "server";

export interface StorageFacts {
  /** The server library is on: a device slideshow's screen tells where its pictures came from. */
  readonly serverOn: boolean;
  /** An edit is being saved. */
  readonly saving: boolean;
  /** Pictures Immich no longer has. */
  readonly missingCount: number;
}

export function slideshowStorage(
  home: SlideshowHome,
  stored: StoredSlideshow,
  { serverOn, saving, missingCount }: StorageFacts,
): SlideshowStorage | null {
  if (home === "server") return { kind: "server", saving, missingCount };
  if (!serverOn) return null;
  const fromImmich = stored.pictures.filter(({ immichAssetId }) => immichAssetId !== undefined);
  return {
    kind: "device",
    fromImmich: fromImmich.length,
    fromDevice: stored.pictures.length - fromImmich.length,
  };
}
