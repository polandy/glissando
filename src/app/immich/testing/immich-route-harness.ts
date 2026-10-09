import type { ImmichAlbum, ImmichPhoto } from "../../../immich/immich-client";
import type { FakeImmichClient } from "../../../immich/testing/fake-immich-client";
import { createTranslator } from "../../i18n/translator";
import { mountWithTranslator } from "../../testing/mount-with-translator";
import type { EndObserver } from "../end-observer";
import { ImmichBrowser } from "../immich-browser";
import ImmichRoute from "../ImmichRoute.svelte";

const mounted: (() => void)[] = [];

/** Unmounts every route `mountRoute` mounted; for `afterEach`. */
export function destroyRoutes(): void {
  for (const destroy of mounted.splice(0)) destroy();
}

export const LAKE: ImmichAlbum = {
  id: "lake",
  name: "Lake",
  photoCount: 2,
  coverId: "l1",
  startDate: "2025-07-12T10:00:00.000Z",
  endDate: "2025-07-13T10:00:00.000Z",
};

/** An `EndObserver` the test drives: `reachEnd()` says the end is in view. */
function fakeEndObserver() {
  const watching = new Set<() => void>();
  const observe: EndObserver = (_element, onVisible) => {
    watching.add(onVisible);
    return () => watching.delete(onVisible);
  };
  return {
    observe,
    reachEnd: () => {
      for (const onVisible of watching) onVisible();
    },
    watched: () => watching.size,
  };
}

/** Resolves once a store-contract publisher's state meets `ready`: a state, not a wait. */
export function until<State>(
  store: { subscribe(listener: (state: State) => void): () => void },
  ready: (state: State) => boolean,
): Promise<void> {
  let stop = () => {};
  const met = new Promise<void>((resolve) => {
    stop = store.subscribe((state) => {
      if (ready(state)) resolve();
    });
  });
  return met.finally(() => stop());
}

export function mountRoute(client: FakeImmichClient, albumId: string | null = null) {
  const browser = new ImmichBrowser({ client, reportUnavailable: () => undefined });
  const end = fakeEndObserver();
  const added: (readonly ImmichPhoto[])[] = [];
  const opened: string[] = [];
  const calls = { back: 0, reload: 0 };
  const view = mountWithTranslator(
    ImmichRoute,
    {
      browser,
      albumId,
      thumbnailUrl: (id: string) => `data:,${id}`,
      onBack: () => (calls.back += 1),
      onReload: () => (calls.reload += 1),
      onOpenAlbum: (album: ImmichAlbum) => opened.push(album.id),
      onAdd: (photos: readonly ImmichPhoto[]) => added.push(photos),
      onError: (error: unknown) => {
        throw error;
      },
      observeEnd: end.observe,
    },
    { current: createTranslator("en") },
  );
  mounted.push(view.destroy);
  const target = view.target;
  const button = (label: string) =>
    [...target.querySelectorAll("button")].find((b) => b.textContent.trim() === label);
  const footer = () => target.querySelector(".actions")?.textContent.replace(/\s+/g, " ").trim();
  return { browser, target, end, added, opened, calls, button, footer };
}
