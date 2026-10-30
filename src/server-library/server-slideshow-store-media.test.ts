import { describe, expect, it } from "vitest";
import type { MusicBeats } from "../beats";
import { ImmichUnavailableError } from "../immich/immich-client";
import { MediaNotFoundError } from "../library/library-store";
import { musicLoudnessToJson, type MusicLoudness } from "../loudness";
import { PictureMissingFromImmichError } from "./server-slideshow-store";
import { UNDECODABLE } from "./testing/fake-immich-media";
import { serverStoreHarness } from "./testing/server-store-harness";

const DRUMS: MusicBeats = { kind: "beats", beatsMs: [500, 1000], beatsPerMinute: 120 };
const MEASURED: MusicLoudness = {
  blockMeanSquares: new Float32Array([0.01, 0.02]),
  hopPeaks: new Float32Array([0.5, 0.6, 0.7, 0.8, 0.9]),
};

/**
 * Compares through the compact dB/dBFS wire form, since the server round trip rounds to 0.01 dB
 * for compactness (dev-docs/library/MUSIC.md); the exact linear values put are not the point.
 */
function expectSameLoudness(actual: MusicLoudness | undefined, expected: MusicLoudness): void {
  expect(actual).toBeDefined();
  expect(musicLoudnessToJson(actual as MusicLoudness)).toEqual(musicLoudnessToJson(expected));
}

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

  it("plays a picture from Immich's preview, never downloading the original", async () => {
    const { store, immich } = serverStoreHarness();
    immich.add("asset-1");

    const picture = await store.playbackPictureBlob("asset-1");

    expect(await picture.text()).toBe("preview asset-1");
    expect(immich.calls).toEqual(["preview asset-1"]);
  });

  it("cancels downloading a picture with the caller's signal", async () => {
    const { store, immich } = serverStoreHarness();
    immich.add("asset-1");
    const cancel = new AbortController();

    await store.pictureBlob("asset-1", cancel.signal);
    await store.playbackPictureBlob("asset-1", cancel.signal);

    expect(immich.calls).toEqual(["original asset-1", "preview asset-1"]);
    expect(immich.signals.get("original asset-1")).toBe(cancel.signal);
    expect(immich.signals.get("preview asset-1")).toBe(cancel.signal);
  });

  it("rejects playing a picture Immich no longer has with PictureMissingFromImmichError", async () => {
    const { store, immich } = serverStoreHarness();
    immich.add("asset-kept");

    const error = await rejection(store.playbackPictureBlob("asset-gone"));

    expect(await (await store.playbackPictureBlob("asset-kept")).text()).toBe("preview asset-kept");
    expect(error).toBeInstanceOf(PictureMissingFromImmichError);
    expect((error as PictureMissingFromImmichError).pictureId).toBe("asset-gone");
  });

  it("tells the app why Immich cannot be used when playing a picture fails", async () => {
    const { store, immich, reported } = serverStoreHarness();
    immich.add("asset-1");
    immich.unavailable = "unreachable";

    const error = await rejection(store.playbackPictureBlob("asset-1"));

    expect(error).toBeInstanceOf(ImmichUnavailableError);
    expect(reported).toEqual(["unreachable"]);
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

  it("keeps the beats a device found beside the server's music, for every device to read", async () => {
    const { store, client } = serverStoreHarness();
    const musicId = await client.uploadMusic(new Blob(["generated tone"]), "audio/mp4");
    expect(await store.musicBeats(musicId)).toBeUndefined();

    await store.putMusicBeats(musicId, DRUMS);

    expect(await client.musicBeats(musicId)).toEqual(DRUMS);
    expect(await store.musicBeats(musicId)).toEqual(DRUMS);
  });

  it("reads no beats for music the server does not have, and keeps none put for it", async () => {
    const { store, client } = serverStoreHarness();
    const musicId = await client.uploadMusic(new Blob(["generated tone"]), "audio/mp4");

    await store.putMusicBeats("deleted-meanwhile", DRUMS);

    expect(await store.musicBeats(musicId)).toBeUndefined();
    expect(await store.musicBeats("deleted-meanwhile")).toBeUndefined();
  });

  it("keeps the loudness a device measured beside the server's music, for every device to read", async () => {
    const { store, client } = serverStoreHarness();
    const musicId = await client.uploadMusic(new Blob(["generated tone"]), "audio/mp4");
    expect(await store.musicLoudness(musicId)).toBeUndefined();

    await store.putMusicLoudness(musicId, MEASURED);

    expectSameLoudness(await client.musicLoudness(musicId), MEASURED);
    expectSameLoudness(await store.musicLoudness(musicId), MEASURED);
  });

  it("reads no loudness for music the server does not have, and keeps none put for it", async () => {
    const { store, client } = serverStoreHarness();
    const musicId = await client.uploadMusic(new Blob(["generated tone"]), "audio/mp4");

    await store.putMusicLoudness("deleted-meanwhile", MEASURED);

    expect(await store.musicLoudness(musicId)).toBeUndefined();
    expect(await store.musicLoudness("deleted-meanwhile")).toBeUndefined();
  });
});
