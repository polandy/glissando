import { describe, expect, it } from "vitest";
import { WHOLE_LIBRARY } from "./immich-client";
import searchPage1 from "./fixtures/search-all-page-1.json";
import { clientWith, FakeFetch, json } from "./testing/fake-fetch";

const VIENNA = { latitude: 48.2082, longitude: 16.3738 };

/** One search page whose photos carry these `exifInfo` values, in order. */
function searchWith(...exifInfos: unknown[]) {
  const [first] = searchPage1.assets.items;
  const items = exifInfos.map((exifInfo, index) => ({ ...first, id: `a${index}`, exifInfo }));
  return new FakeFetch().answer(
    "POST",
    "api/search/metadata",
    json({ assets: { items, nextPage: null } }),
  );
}

describe("HttpImmichClient reading a photo's GPS from the search", () => {
  it("reads the coordinate from the search answer, with no request per photo", async () => {
    const fake = searchWith({ city: "Vienna", ...VIENNA });

    const page = await clientWith(fake).photos({ page: 1, source: WHOLE_LIBRARY });

    expect(page.photos[0]?.gps).toEqual(VIENNA);
    expect(fake.requests).toHaveLength(1);
  });

  it.each([
    ["exifInfo is null", null],
    ["exifInfo is absent", undefined],
    ["exifInfo has no coordinate", { city: "Vienna" }],
    ["the longitude is null", { latitude: 48.2082, longitude: null }],
  ])("gives no GPS when %s", async (_name, exifInfo) => {
    const fake = searchWith(VIENNA, exifInfo);

    const page = await clientWith(fake).photos({ page: 1, source: WHOLE_LIBRARY });

    expect(page.photos.map(({ gps }) => gps)).toEqual([VIENNA, null]);
  });

  it.each([
    ["a latitude past the north pole", { latitude: 90.5, longitude: 16.3738 }],
    ["a latitude past the south pole", { latitude: -90.5, longitude: 16.3738 }],
    ["a longitude past 180° east", { latitude: 48.2082, longitude: 180.5 }],
    ["a longitude past 180° west", { latitude: 48.2082, longitude: -180.5 }],
    ["the no-fix sentinel 0, 0", { latitude: 0, longitude: 0 }],
  ])("drops %s, as a file's own EXIF would", async (_name, coordinate) => {
    const fake = searchWith(VIENNA, coordinate);

    const page = await clientWith(fake).photos({ page: 1, source: WHOLE_LIBRARY });

    expect(page.photos.map(({ gps }) => gps)).toEqual([VIENNA, null]);
  });

  it("keeps a coordinate on the edge of the range", async () => {
    const edge = { latitude: -90, longitude: 180 };
    const fake = searchWith(edge);

    const page = await clientWith(fake).photos({ page: 1, source: WHOLE_LIBRARY });

    expect(page.photos[0]?.gps).toEqual(edge);
  });

  it("fails loud naming the field when a coordinate is not a number", async () => {
    const fake = searchWith({ latitude: "48.2082", longitude: 16.3738 });

    await expect(clientWith(fake).photos({ page: 1, source: WHOLE_LIBRARY })).rejects.toThrow(
      /latitude/,
    );
  });
});
