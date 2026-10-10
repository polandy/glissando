import type { ImmichUnavailableKind } from "../../immich/immich-client";
import type { StoredPicture, StoredSlideshow } from "../../library/stored-slideshow";
import { serverDocumentFor } from "../server-document";
import { ServerSlideshowStore } from "../server-slideshow-store";
import { decodeAsText, FakeImmichMedia } from "./fake-immich-media";
import { libraryServiceFetch } from "./library-service-fetch";

export function linkedPicture(assetId: string): StoredPicture {
  return {
    id: assetId,
    capturedAt: "2025-07-01T10:00:00Z",
    width: 3240,
    height: 2160,
    fileName: `${assetId}.jpg`,
    immichAssetId: assetId,
  };
}

/** A server slideshow as the app keeps it; its id is replaced by the server's on `seed`. */
export function serverSlideshow(overrides: Partial<StoredSlideshow> = {}): StoredSlideshow {
  return {
    id: "unsaved",
    title: "July 2025",
    createdAt: "2025-07-02T08:00:00Z",
    pictures: [linkedPicture("asset-1")],
    secondsPerPicture: 5,
    ...overrides,
  };
}

/** A `ServerSlideshowStore` on the real library service in-process and a fake Immich. */
export function serverStoreHarness() {
  const server = libraryServiceFetch();
  const immich = new FakeImmichMedia();
  const reported: ImmichUnavailableKind[] = [];
  const logged: unknown[] = [];
  const store = new ServerSlideshowStore({
    client: server.client,
    immich,
    decode: decodeAsText,
    reportUnavailable: (kind) => reported.push(kind),
    log: (error) => logged.push(error),
  });
  return {
    ...server,
    immich,
    reported,
    logged,
    store,
    /** Creates `slideshow` on the server, as another device might; answers it with its id. */
    async seed(slideshow: StoredSlideshow = serverSlideshow()): Promise<StoredSlideshow> {
      const { id } = await server.client.createSlideshow(serverDocumentFor(slideshow));
      return { ...slideshow, id };
    },
    /** The slideshow's title on the server right now. */
    async titleOnServer(id: string): Promise<string> {
      return (await server.client.getSlideshow(id)).document.slideshow.title;
    },
  };
}
