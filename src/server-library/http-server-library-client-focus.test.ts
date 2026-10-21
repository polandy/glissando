import { describe, expect, it } from "vitest";
import type { StoredFocus } from "../library/picture-focus";
import { ServerLibraryNotFoundError, ServerLibraryRefusedError } from "./server-library-client";
import { libraryServiceFetch } from "./testing/library-service-fetch";

const PICTURE_ASSET_ID = "0b5a7c3e-1f2d-4e6a-9b8c-7d6e5f4a3b2c";
const FOUND: StoredFocus = {
  focus: { kind: "subject", box: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 }, foundBy: "face" },
  detector: 1,
};

async function created() {
  const { client, control, service } = libraryServiceFetch();
  const slideshowId = service.create();
  return { client, control, service, slideshowId };
}

describe("HttpServerLibraryClient focus", () => {
  it("reads an empty focus map for a slideshow whose pictures have none yet", async () => {
    const { client, slideshowId } = await created();

    expect(await client.slideshowFocus(slideshowId)).toEqual(new Map());
  });

  it("stores a picture's focus and reads it back among the slideshow's focus", async () => {
    const { client, slideshowId } = await created();

    const outcome = await client.putPictureFocus(slideshowId, PICTURE_ASSET_ID, FOUND);
    expect(outcome).toBe("stored");

    const focus = await client.slideshowFocus(slideshowId);
    expect(focus).toEqual(new Map([[PICTURE_ASSET_ID, FOUND]]));
  });

  it("answers newerKept without storing when the server holds a focus from a newer detector", async () => {
    const { client, slideshowId } = await created();
    const newer: StoredFocus = { ...FOUND, detector: 2 };
    await client.putPictureFocus(slideshowId, PICTURE_ASSET_ID, newer);

    const outcome = await client.putPictureFocus(slideshowId, PICTURE_ASSET_ID, FOUND);

    expect(outcome).toBe("newerKept");
    expect(await client.slideshowFocus(slideshowId)).toEqual(new Map([[PICTURE_ASSET_ID, newer]]));
  });

  it("rejects with ServerLibraryNotFoundError for a slideshow the server does not have", async () => {
    const { client } = await created();

    await expect(client.slideshowFocus("gone")).rejects.toThrow(ServerLibraryNotFoundError);
    await expect(client.putPictureFocus("gone", PICTURE_ASSET_ID, FOUND)).rejects.toThrow(
      ServerLibraryNotFoundError,
    );
  });

  it("rejects with ServerLibraryRefusedError naming focus for an invalid focus", async () => {
    const { client, slideshowId } = await created();
    const invalid = { focus: { kind: "subject" }, detector: 1 } as unknown as StoredFocus;

    const failure = client.putPictureFocus(slideshowId, PICTURE_ASSET_ID, invalid);

    await expect(failure).rejects.toThrow(ServerLibraryRefusedError);
    await failure.catch((error: ServerLibraryRefusedError) => {
      expect(error.refused).toBe("focus");
    });
  });

  it("fails loud on a focus the server answers in a shape it does not know", async () => {
    const { client, control, slideshowId } = await created();
    control.answerWith = () =>
      Response.json({ focus: { [PICTURE_ASSET_ID]: { focus: { kind: "maybe" }, detector: 1 } } });

    await expect(client.slideshowFocus(slideshowId)).rejects.toThrow();
  });
});
