import { describe, expect, it } from "vitest";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import { createStorageServerLibraryMemory } from "../../server-library/server-library-memory";
import { ServerLibraryUnavailableError } from "../../server-library/server-library-client";
import { ObjectUrls } from "../media/object-urls";
import { createMemoryStorage } from "../testing/memory-storage";
import { loadServerShelf } from "./server-shelf-loading";

const ICELAND: StoredSlideshow = {
  id: "iceland",
  title: "Iceland 2025",
  createdAt: "2025-07-02T08:00:00Z",
  pictures: [
    { id: "asset-1", capturedAt: "2025-07-01T10:00:00Z", width: 3, height: 2, fileName: "a" },
    { id: "asset-gone", capturedAt: "2025-07-01T11:00:00Z", width: 3, height: 2, fileName: "b" },
  ],
  secondsPerPicture: 5,
};

function setUp(list: () => Promise<readonly StoredSlideshow[]>) {
  const memory = createStorageServerLibraryMemory(createMemoryStorage(), () => undefined);
  let created = 0;
  const covers = new ObjectUrls({
    load: (id) =>
      id === "asset-gone" ? Promise.reject(new Error("gone")) : Promise.resolve(new Blob([id])),
    create: () => `blob:cover-${++created}`,
    revoke: () => undefined,
    onError: () => undefined,
  });
  const ports = { store: { listSlideshows: list }, memory };
  return { memory, covers, ports };
}

describe("loading the library's server section", () => {
  it("shows the server's slideshows with the covers Immich could give and remembers the cards", async () => {
    const { memory, covers, ports } = setUp(() => Promise.resolve([ICELAND]));

    const shelf = await loadServerShelf("on", ports, covers, new AbortController().signal);

    expect(shelf).toEqual({
      offline: false,
      slideshows: [
        {
          id: "iceland",
          title: "Iceland 2025",
          coverUrls: ["blob:cover-1"],
          pictureCount: 2,
          durationSeconds: 10,
          hasMusic: false,
        },
      ],
    });
    expect(memory.cards()).toEqual([
      { id: "iceland", title: "Iceland 2025", pictureCount: 2, durationSeconds: 10, hasMusic: false },
    ]);
  });

  it("shows the remembered cards without covers while offline", async () => {
    const { memory, covers, ports } = setUp(() => Promise.reject(new Error("not asked offline")));
    memory.rememberCards([
      { id: "iceland", title: "Iceland 2025", pictureCount: 2, durationSeconds: 10, hasMusic: true },
    ]);

    const shelf = await loadServerShelf("offline", ports, covers, new AbortController().signal);

    expect(shelf).toEqual({
      offline: true,
      slideshows: [
        {
          id: "iceland",
          title: "Iceland 2025",
          coverUrls: [],
          pictureCount: 2,
          durationSeconds: 10,
          hasMusic: true,
        },
      ],
    });
  });

  it("falls back to the remembered cards when the server stops answering", async () => {
    const { memory, covers, ports } = setUp(() =>
      Promise.reject(new ServerLibraryUnavailableError("the list")),
    );
    memory.rememberCards([
      { id: "iceland", title: "Iceland 2025", pictureCount: 2, durationSeconds: 10, hasMusic: true },
    ]);

    const shelf = await loadServerShelf("on", ports, covers, new AbortController().signal);

    expect(shelf?.offline).toBe(true);
    expect(shelf?.slideshows.map(({ id }) => id)).toEqual(["iceland"]);
  });
});
