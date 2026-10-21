import { describe, expect, it } from "vitest";
import { MAX_FOCUS_BYTES, maxBodyBytes } from "./library-http";
import { libraryHarness, sampleDocument } from "./testing/library-harness";

const SLIDESHOWS = "/api/library/slideshows";
const PICTURE_ASSET_ID = "0b5a7c3e-1f2d-4e6a-9b8c-7d6e5f4a3b2c";
const OTHER_ASSET_ID = "1c6b8d4f-2e3a-4f7b-8c9d-6e5f4a3b2c1d";
const FOCUS = { kind: "none" } as const;
const STORED_FOCUS = { focus: FOCUS, detector: 1 };

/** `sampleDocument` with two pictures, so dropping one still leaves a valid document. */
function documentWithTwoPictures(): ReturnType<typeof sampleDocument> {
  const document = sampleDocument();
  const [firstPicture] = document.slideshow.pictures;
  if (firstPicture === undefined) {
    throw new Error("sampleDocument has no picture to base the second one on");
  }
  const secondPicture = {
    ...firstPicture,
    fileName: "b.jpg",
    immichAssetId: OTHER_ASSET_ID,
  };
  return {
    ...document,
    slideshow: { ...document.slideshow, pictures: [firstPicture, secondPicture] },
  };
}

describe("reading a slideshow's picture focus", () => {
  it("answers an empty focus map for a slideshow whose pictures have none yet", () => {
    const library = libraryHarness();
    const id = library.create();
    const response = library.send("GET", `${SLIDESHOWS}/${id}/focus`);
    expect(response.status).toBe(200);
    expect(response.json).toEqual({ focus: {} });
  });

  it("answers 404 for a slideshow the server does not have", () => {
    const library = libraryHarness();
    const response = library.send(
      "GET",
      `${SLIDESHOWS}/00000000-0000-4000-8000-000000000009/focus`,
    );
    expect(response.status).toBe(404);
  });

  it("answers the focus put for a picture of the slideshow, keyed by its asset id", () => {
    const library = libraryHarness();
    const id = library.create();
    library.send("PUT", `${SLIDESHOWS}/${id}/focus/${PICTURE_ASSET_ID}`, { body: STORED_FOCUS });

    const response = library.send("GET", `${SLIDESHOWS}/${id}/focus`);

    expect(response.status).toBe(200);
    expect(response.json).toEqual({ focus: { [PICTURE_ASSET_ID]: STORED_FOCUS } });
  });
});

describe("putting a picture's focus", () => {
  it("answers 204, and does not change the slideshow's document or revision", () => {
    const library = libraryHarness();
    const id = library.create();
    const before = library.send("GET", `${SLIDESHOWS}/${id}`);

    const put = library.send("PUT", `${SLIDESHOWS}/${id}/focus/${PICTURE_ASSET_ID}`, {
      body: STORED_FOCUS,
    });
    expect(put.status).toBe(204);

    const after = library.send("GET", `${SLIDESHOWS}/${id}`);
    expect(after.json).toEqual(before.json);
    expect(after.headers["etag"]).toBe(before.headers["etag"]);
  });

  it("replaces a focus from the same or an older detector", () => {
    const library = libraryHarness();
    const id = library.create();
    library.send("PUT", `${SLIDESHOWS}/${id}/focus/${PICTURE_ASSET_ID}`, { body: STORED_FOCUS });

    const refound = { focus: FOCUS, detector: 1 };
    const put = library.send("PUT", `${SLIDESHOWS}/${id}/focus/${PICTURE_ASSET_ID}`, {
      body: refound,
    });
    expect(put.status).toBe(204);

    const read = library.send("GET", `${SLIDESHOWS}/${id}/focus`);
    expect(read.json).toEqual({ focus: { [PICTURE_ASSET_ID]: refound } });
  });

  it("refuses a focus from a detector older than the one stored with 409 newerFocus", () => {
    const library = libraryHarness();
    const id = library.create();
    const newer = { focus: FOCUS, detector: 2 };
    library.send("PUT", `${SLIDESHOWS}/${id}/focus/${PICTURE_ASSET_ID}`, { body: newer });

    const put = library.send("PUT", `${SLIDESHOWS}/${id}/focus/${PICTURE_ASSET_ID}`, {
      body: STORED_FOCUS,
    });
    expect(put.status).toBe(409);
    expect(put.json["error"]).toBe("newerFocus");

    const read = library.send("GET", `${SLIDESHOWS}/${id}/focus`);
    expect(read.json).toEqual({ focus: { [PICTURE_ASSET_ID]: newer } });
  });

  it("answers 404 for a slideshow the server does not have", () => {
    const library = libraryHarness();
    const response = library.send(
      "PUT",
      `${SLIDESHOWS}/00000000-0000-4000-8000-000000000009/focus/${PICTURE_ASSET_ID}`,
      { body: STORED_FOCUS },
    );
    expect(response.status).toBe(404);
  });

  it("answers 404 for an asset id the slideshow does not hold", () => {
    const library = libraryHarness();
    const id = library.create();
    const response = library.send(
      "PUT",
      `${SLIDESHOWS}/${id}/focus/00000000-0000-4000-8000-000000000009`,
      { body: STORED_FOCUS },
    );
    expect(response.status).toBe(404);
  });

  it("refuses an invalid focus body with 400 invalidFocus", () => {
    const library = libraryHarness();
    const id = library.create();
    const response = library.send("PUT", `${SLIDESHOWS}/${id}/focus/${PICTURE_ASSET_ID}`, {
      body: { focus: { kind: "maybe" }, detector: 1 },
    });
    expect(response.status).toBe(400);
    expect(response.json["error"]).toBe("invalidFocus");
  });

  it("refuses a focus put over MAX_FOCUS_BYTES with 413", () => {
    const library = libraryHarness();
    const id = library.create();
    const response = library.handle({
      method: "PUT",
      path: `${SLIDESHOWS}/${id}/focus/${PICTURE_ASSET_ID}`,
      headers: { "content-type": "application/json" },
      body: { kind: "tooLarge" },
    });
    expect(response.status).toBe(413);
  });

  it("refuses a focus put that is not JSON with 415 notJson", () => {
    const library = libraryHarness();
    const id = library.create();
    const response = library.send("PUT", `${SLIDESHOWS}/${id}/focus/${PICTURE_ASSET_ID}`, {
      body: STORED_FOCUS,
      headers: { "content-type": "text/plain" },
    });
    expect(response.status).toBe(415);
    expect(response.json["error"]).toBe("notJson");
  });
});

describe("the focus path's body limit", () => {
  it("is MAX_FOCUS_BYTES, smaller than a slideshow document's", () => {
    expect(maxBodyBytes(`${SLIDESHOWS}/some-id/focus`)).toBe(MAX_FOCUS_BYTES);
    expect(maxBodyBytes(`${SLIDESHOWS}/some-id/focus/some-asset`)).toBe(MAX_FOCUS_BYTES);
    expect(maxBodyBytes(`${SLIDESHOWS}/some-id`)).toBeGreaterThan(MAX_FOCUS_BYTES);
  });
});

describe("a slideshow dropping a picture", () => {
  it("deletes the dropped picture's stored focus once no slideshow names it", () => {
    const library = libraryHarness();
    const id = library.create(documentWithTwoPictures());
    library.send("PUT", `${SLIDESHOWS}/${id}/focus/${PICTURE_ASSET_ID}`, { body: STORED_FOCUS });
    const before = library.send("GET", `${SLIDESHOWS}/${id}`);

    const document = documentWithTwoPictures();
    const [, kept] = document.slideshow.pictures;
    const withoutFirstPicture = {
      ...document,
      slideshow: { ...document.slideshow, pictures: [kept] },
    };
    const put = library.send("PUT", `${SLIDESHOWS}/${id}`, {
      body: withoutFirstPicture,
      headers: { "if-match": before.headers["etag"] as string },
    });
    expect(put.status).toBe(200);

    expect(library.repository.findPictureFocus([PICTURE_ASSET_ID])).toEqual(new Map());
  });

  it("keeps the dropped picture's stored focus while another slideshow still names it", () => {
    const library = libraryHarness();
    const first = library.create(documentWithTwoPictures());
    library.create(); // sampleDocument's single picture is PICTURE_ASSET_ID, kept referenced.
    library.send("PUT", `${SLIDESHOWS}/${first}/focus/${PICTURE_ASSET_ID}`, {
      body: STORED_FOCUS,
    });
    const before = library.send("GET", `${SLIDESHOWS}/${first}`);

    const document = documentWithTwoPictures();
    const [, kept] = document.slideshow.pictures;
    const withoutFirstPicture = {
      ...document,
      slideshow: { ...document.slideshow, pictures: [kept] },
    };
    const put = library.send("PUT", `${SLIDESHOWS}/${first}`, {
      body: withoutFirstPicture,
      headers: { "if-match": before.headers["etag"] as string },
    });
    expect(put.status).toBe(200);

    expect(library.repository.findPictureFocus([PICTURE_ASSET_ID])).toEqual(
      new Map([[PICTURE_ASSET_ID, STORED_FOCUS]]),
    );
  });
});
