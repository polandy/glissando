import { describe, expect, it } from "vitest";
import { sampleDocument } from "../../server/testing/library-harness";
import { DocumentFormatError } from "../glissando-file/document-values";
import {
  ServerLibraryNotFoundError,
  ServerLibraryRefusedError,
  ServerLibraryUnavailableError,
  ServerRevisionChangedError,
} from "./server-library-client";
import { libraryServiceFetch } from "./testing/library-service-fetch";

async function rejection(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => new Error("expected the request to fail"),
    (error: unknown) => error,
  );
}

describe("HttpServerLibraryClient", () => {
  it("discovers the library service", async () => {
    const { client } = libraryServiceFetch();

    expect(await client.discover()).toBe(true);
  });

  it.each([
    ["a 404 (no library route)", () => new Response("", { status: 404 })],
    [
      "the app's page (a static host)",
      () => new Response("<!doctype html>", { headers: { "content-type": "text/html" } }),
    ],
    ["another service's JSON", () => Response.json({ service: "something-else", version: 1 })],
  ])("does not discover the library service behind %s", async (_, answer) => {
    const { client, control } = libraryServiceFetch();
    control.answerWith = answer;

    expect(await client.discover()).toBe(false);
  });

  it("rejects with ServerLibraryUnavailableError when the server cannot be reached", async () => {
    const { client, control } = libraryServiceFetch();
    control.down = true;

    expect(await rejection(client.discover())).toBeInstanceOf(ServerLibraryUnavailableError);
    expect(await rejection(client.listSlideshows())).toBeInstanceOf(ServerLibraryUnavailableError);
  });

  it("rejects with ServerLibraryUnavailableError when the server fails (5xx)", async () => {
    const { client, control } = libraryServiceFetch();
    control.answerWith = () => new Response("Bad Gateway", { status: 502 });

    expect(await rejection(client.getSlideshow("any"))).toBeInstanceOf(
      ServerLibraryUnavailableError,
    );
  });

  it("creates a slideshow at revision 1 and reads it back", async () => {
    const { client } = libraryServiceFetch();
    const document = sampleDocument("Herbst in Wien");

    const created = await client.createSlideshow(document);

    expect(created.revision).toBe(1);
    expect(await client.getSlideshow(created.id)).toEqual({ ...created, document });
  });

  it("lists the slideshows newest first", async () => {
    const { client } = libraryServiceFetch();
    const older = sampleDocument("Older");
    const newer = {
      ...sampleDocument("Newer"),
      slideshow: {
        ...sampleDocument().slideshow,
        title: "Newer",
        createdAt: "2026-01-01T00:00:00Z",
      },
    };
    await client.createSlideshow(older);
    await client.createSlideshow(newer);

    const titles = (await client.listSlideshows()).map((record) => record.document.slideshow.title);

    expect(titles).toEqual(["Newer", "Older"]);
  });

  it("replaces a slideshow at its current revision and answers the next one", async () => {
    const { client } = libraryServiceFetch();
    const { id } = await client.createSlideshow(sampleDocument("Before"));

    const revision = await client.replaceSlideshow(id, 1, sampleDocument("After"));

    expect(revision).toBe(2);
    expect((await client.getSlideshow(id)).document.slideshow.title).toBe("After");
  });

  it("rejects a replace at a stale revision with ServerRevisionChangedError carrying the current version", async () => {
    const { client } = libraryServiceFetch();
    const { id } = await client.createSlideshow(sampleDocument("Before"));
    await client.replaceSlideshow(id, 1, sampleDocument("Elsewhere"));

    const error = await rejection(client.replaceSlideshow(id, 1, sampleDocument("Here")));

    expect(error).toBeInstanceOf(ServerRevisionChangedError);
    expect((error as ServerRevisionChangedError).current).toEqual({
      id,
      revision: 2,
      document: sampleDocument("Elsewhere"),
    });
    expect((await client.getSlideshow(id)).document.slideshow.title).toBe("Elsewhere");
  });

  it("deletes a slideshow, which is then not found", async () => {
    const { client } = libraryServiceFetch();
    const { id } = await client.createSlideshow(sampleDocument());

    await client.deleteSlideshow(id);

    expect(await rejection(client.getSlideshow(id))).toBeInstanceOf(ServerLibraryNotFoundError);
    expect(await rejection(client.deleteSlideshow(id))).toBeInstanceOf(ServerLibraryNotFoundError);
  });

  it("rejects a refused request with ServerLibraryRefusedError naming the server's code", async () => {
    const { client } = libraryServiceFetch();

    const error = await rejection(
      client.createSlideshow(sampleDocument("With music", "unknown-music")),
    );

    expect(error).toBeInstanceOf(ServerLibraryRefusedError);
    expect(error).toMatchObject({ status: 409, code: "musicMissing" });
  });

  it("uploads music and reads its bytes back with their type", async () => {
    const { client } = libraryServiceFetch();

    const musicId = await client.uploadMusic(new Blob(["tune"]), "audio/mp4");
    const music = await client.music(musicId);

    expect(await music.text()).toBe("tune");
    expect(music.type).toBe("audio/mp4");
    expect(await rejection(client.music("unknown"))).toBeInstanceOf(ServerLibraryNotFoundError);
  });

  it("fails loud on a slideshow the server answers that is no server document", async () => {
    const { client, control } = libraryServiceFetch();
    control.answerWith = () =>
      Response.json({ id: "x", revision: 1, document: { format: "something-else" } });

    expect(await rejection(client.getSlideshow("x"))).toBeInstanceOf(DocumentFormatError);
  });
});
