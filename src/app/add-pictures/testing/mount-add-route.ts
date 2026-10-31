import type { StoredSlideshow } from "../../../library/stored-slideshow";
import { picture, slideshow } from "../../../library/testing/library-store-contract";
import { MemoryLibraryStore } from "../../../library/testing/memory-store";
import type { PictureIntakePorts } from "../../import/picture-intake";
import type { SlideshowHome } from "../../routes/slideshow-storage";
import { mountWithTranslator } from "../../testing/mount-with-translator";
import { fakeIntakePorts } from "../../testing/picture-intake-ports";
import type { Navigator } from "../../navigation/navigator";
import { AddPicturesSession } from "../add-pictures-session";
import AddPicturesRoute from "../AddPicturesRoute.svelte";

export const SHOW: StoredSlideshow = slideshow({
  title: "Sommer am See",
  pictures: [{ ...picture("old-1"), capturedAt: "2025-07-01T10:00:00Z" }],
});

let unmounts: (() => void)[] = [];

/** Unmounts every route mounted since the last call; for `afterEach`. */
export function unmountRoutes(): void {
  for (const unmount of unmounts) {
    unmount();
  }
  unmounts = [];
}

/** Mounts the add screen; `guards` holds the leave guards it registered, the last one current. */
export function mountRoute(
  shown: StoredSlideshow = SHOW,
  onCommit = () => Promise.resolve(),
  home: SlideshowHome = "device",
  portsOverrides: Partial<PictureIntakePorts> = {},
) {
  const store = new MemoryLibraryStore();
  const session = new AddPicturesSession(shown, home, {
    ...fakeIntakePorts(store, portsOverrides).ports,
    store,
  });
  const discards: boolean[] = [];
  const guards: Parameters<Navigator["guardLeave"]>[0][] = [];
  const route = mountWithTranslator(AddPicturesRoute, {
    session,
    loadThumbnail: () => Promise.resolve(new Blob()),
    loadPicture: () => Promise.resolve(new Blob()),
    onError: () => undefined,
    onDiscard: (leave: boolean) => discards.push(leave),
    onCommit,
    immich: { kind: "notSetUp" },
    onOpenImmich: () => undefined,
    onImmichSettings: () => undefined,
    guardLeave: (guard: Parameters<Navigator["guardLeave"]>[0]) => {
      guards.push(guard);
      return () => undefined;
    },
  });
  unmounts.push(route.destroy);
  return { session, discards, guards, target: route.target };
}
