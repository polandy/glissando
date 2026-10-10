import { describe, expect, it } from "vitest";
import {
  ImmichRequestFailedError,
  ImmichUnavailableError,
  type ImmichFace,
} from "../immich/immich-client";
import { MediaNotFoundError } from "../library/stored-slideshow";
import { PictureMissingFromImmichError } from "./server-slideshow-store";
import { UNDECODABLE } from "./testing/fake-immich-media";
import { serverStoreHarness } from "./testing/server-store-harness";

const SMALL_FACE: ImmichFace = { imageWidth: 100, imageHeight: 50, x1: 0, y1: 0, x2: 10, y2: 10 };
const LARGE_FACE: ImmichFace = { imageWidth: 100, imageHeight: 50, x1: 25, y1: 5, x2: 75, y2: 25 };

async function rejection(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => new Error("expected the promise to reject"),
    (error: unknown) => error,
  );
}

describe("ServerSlideshowStore media", () => {
  it("gives a picture's display rendition made on the device from Immich's original", async () => {
    const { store, immich } = serverStoreHarness();
    immich.add("asset-1");

    const picture = await store.pictureBlob("asset-1");

    expect(await picture.text()).toBe("display of original asset-1");
  });

  it("makes the rendition from Immich's preview where the original cannot be decoded", async () => {
    const { store, immich } = serverStoreHarness();
    immich.add("asset-1", { original: UNDECODABLE });

    const picture = await store.pictureBlob("asset-1");

    expect(await picture.text()).toBe("display of preview asset-1");
  });

  it("gives Immich's thumbnail as a picture's thumbnail", async () => {
    const { store, immich } = serverStoreHarness();
    immich.add("asset-1");

    expect(await (await store.thumbnailBlob("asset-1")).text()).toBe("thumbnail asset-1");
  });

  it("rejects with PictureMissingFromImmichError for a picture Immich no longer has", async () => {
    const { store, immich } = serverStoreHarness();
    immich.add("asset-kept");

    const picture = await rejection(store.pictureBlob("asset-gone"));
    const thumbnail = await rejection(store.thumbnailBlob("asset-gone"));

    expect(await (await store.thumbnailBlob("asset-kept")).text()).toBe("thumbnail asset-kept");
    expect(picture).toBeInstanceOf(PictureMissingFromImmichError);
    expect(thumbnail).toBeInstanceOf(PictureMissingFromImmichError);
    expect((picture as PictureMissingFromImmichError).pictureId).toBe("asset-gone");
  });

  it("tells the app why Immich cannot be used and rejects with ImmichUnavailableError", async () => {
    const { store, immich, reported } = serverStoreHarness();
    immich.add("asset-1");
    immich.unavailable = "keyRejected";

    const error = await rejection(store.pictureBlob("asset-1"));

    expect(error).toBeInstanceOf(ImmichUnavailableError);
    expect(reported).toEqual(["keyRejected"]);
  });

  it("gives the server's music, and MediaNotFoundError for music it does not have", async () => {
    const { store, client } = serverStoreHarness();
    const musicId = await client.uploadMusic(new Blob(["tune"]), "audio/mp4");

    expect(await (await store.musicBlob(musicId)).text()).toBe("tune");
    expect(await rejection(store.musicBlob("unknown"))).toBeInstanceOf(MediaNotFoundError);
  });

  it("aims a picture at its largest Immich face, asking Immich once per picture for the session", async () => {
    const { store, immich } = serverStoreHarness();
    immich.add("asset-1", { faces: [SMALL_FACE, LARGE_FACE] }).add("asset-2");

    await store.pictureFocus(["asset-1", "asset-2"]);
    const focus = await store.pictureFocus(["asset-1", "asset-2"]);

    expect(focus).toEqual(
      new Map([
        ["asset-1", { kind: "subject", box: { x: 0.25, y: 0.1, width: 0.5, height: 0.4 } }],
      ]),
    );
    expect(immich.calls).toEqual(["faces asset-1", "faces asset-2"]);
  });

  it("keeps a focus put for the session, without asking Immich", async () => {
    const { store, immich } = serverStoreHarness();
    immich.add("asset-1", { faces: [LARGE_FACE] });

    await store.putPictureFocus("asset-1", { kind: "none" });

    expect(await store.pictureFocus(["asset-1"])).toEqual(new Map([["asset-1", { kind: "none" }]]));
    expect(immich.calls).toEqual([]);
  });

  it.each([
    ["unavailable", new ImmichUnavailableError("unreachable")],
    ["not found", new ImmichRequestFailedError("GET faces", 404)],
  ])(
    "logs faces Immich could not give (%s), leaves the picture without focus and asks again later",
    async (_reason, failure) => {
      const { store, immich, logged } = serverStoreHarness();
      immich.add("asset-1", { faces: [LARGE_FACE] });
      immich.facesError = failure;

      const failed = await store.pictureFocus(["asset-1"]);
      immich.facesError = null;
      const asked = await store.pictureFocus(["asset-1"]);

      expect(failed).toEqual(new Map());
      expect(logged).toEqual([failure]);
      expect(asked.get("asset-1")?.kind).toBe("subject");
    },
  );

  it("rejects with any other failure asking for faces, and asks again later", async () => {
    const { store, immich } = serverStoreHarness();
    immich.add("asset-1", { faces: [LARGE_FACE] });
    const failure = new Error("the faces answer does not match the Immich API");
    immich.facesError = failure;

    await expect(store.pictureFocus(["asset-1"])).rejects.toBe(failure);
    immich.facesError = null;
    const asked = await store.pictureFocus(["asset-1"]);

    expect(asked.get("asset-1")?.kind).toBe("subject");
  });
});
