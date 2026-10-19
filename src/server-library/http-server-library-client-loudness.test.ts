import { describe, expect, it } from "vitest";
import type { MusicLoudness } from "../loudness";
import { musicLoudnessToJson } from "../loudness";
import { ServerLibraryNotFoundError } from "./server-library-client";
import { libraryServiceFetch } from "./testing/library-service-fetch";

const MEASURED: MusicLoudness = {
  blockMeanSquares: new Float32Array([0.01, 0.02]),
  hopPeaks: new Float32Array([0.5, 0.6, 0.7, 0.8, 0.9]),
};
const QUIETER: MusicLoudness = {
  blockMeanSquares: new Float32Array([0.001]),
  hopPeaks: new Float32Array([0.1, 0.2, 0.3, 0.4]),
};

async function uploaded() {
  const { client, control } = libraryServiceFetch();
  const musicId = await client.uploadMusic(new Blob(["generated tone"]), "audio/mpeg");
  return { client, control, musicId };
}

/**
 * Compares through the compact dB/dBFS wire form, since the HTTP round trip rounds to 0.01 dB for
 * compactness (dev-docs/library/MUSIC.md); the exact linear values the client sent are not the point.
 */
function expectSameLoudness(actual: MusicLoudness | undefined, expected: MusicLoudness): void {
  expect(actual).toBeDefined();
  expect(musicLoudnessToJson(actual as MusicLoudness)).toEqual(musicLoudnessToJson(expected));
}

describe("HttpServerLibraryClient loudness", () => {
  it("reads no loudness for music no device has measured yet", async () => {
    const { client, musicId } = await uploaded();

    expect(await client.musicLoudness(musicId)).toBeUndefined();
  });

  it("stores the loudness a device measured beside the music and reads it back", async () => {
    const { client, musicId } = await uploaded();

    await client.putMusicLoudness(musicId, MEASURED);
    expectSameLoudness(await client.musicLoudness(musicId), MEASURED);

    await client.putMusicLoudness(musicId, QUIETER);
    expectSameLoudness(await client.musicLoudness(musicId), QUIETER);
  });

  it("rejects with ServerLibraryNotFoundError for music the server does not have", async () => {
    const { client } = await uploaded();

    await expect(client.musicLoudness("gone")).rejects.toThrow(ServerLibraryNotFoundError);
    await expect(client.putMusicLoudness("gone", MEASURED)).rejects.toThrow(
      ServerLibraryNotFoundError,
    );
  });

  it("fails loud on loudness the server answers in a shape it does not know", async () => {
    const { client, control, musicId } = await uploaded();
    control.answerWith = () =>
      Response.json({ loudness: { blockLoudnessDb: "soon", hopPeaksDbfs: [] } });

    await expect(client.musicLoudness(musicId)).rejects.toThrow(/loudness/);
  });
});
