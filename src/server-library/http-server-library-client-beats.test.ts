import { describe, expect, it } from "vitest";
import type { MusicBeats } from "../beats";
import { ServerLibraryNotFoundError } from "./server-library-client";
import { libraryServiceFetch } from "./testing/library-service-fetch";

const DRUMS: MusicBeats = { kind: "beats", beatsMs: [500, 1000, 1500], beatsPerMinute: 120 };

async function uploaded() {
  const { client, control } = libraryServiceFetch();
  const musicId = await client.uploadMusic(new Blob(["generated tone"]), "audio/mpeg");
  return { client, control, musicId };
}

describe("HttpServerLibraryClient beats", () => {
  it("reads no beats for music no device has listened to yet", async () => {
    const { client, musicId } = await uploaded();

    expect(await client.musicBeats(musicId)).toBeUndefined();
  });

  it("stores the beats a device found beside the music and reads them back, beats or none", async () => {
    const { client, musicId } = await uploaded();

    await client.putMusicBeats(musicId, DRUMS);
    expect(await client.musicBeats(musicId)).toEqual(DRUMS);

    await client.putMusicBeats(musicId, { kind: "none" });
    expect(await client.musicBeats(musicId)).toEqual({ kind: "none" });
  });

  it("rejects with ServerLibraryNotFoundError for music the server does not have", async () => {
    const { client } = await uploaded();

    await expect(client.musicBeats("gone")).rejects.toThrow(ServerLibraryNotFoundError);
    await expect(client.putMusicBeats("gone", DRUMS)).rejects.toThrow(ServerLibraryNotFoundError);
  });

  it("fails loud on beats the server answers in a shape it does not know", async () => {
    const { client, control, musicId } = await uploaded();
    control.answerWith = () => Response.json({ beats: { kind: "beats", beatsMs: "soon" } });

    await expect(client.musicBeats(musicId)).rejects.toThrow(/beats/);
  });
});
