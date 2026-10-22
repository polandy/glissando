import { describe, expect, it } from "vitest";
import type { Place } from "../places/nearest-place";
import type { StoredPicture, StoredSlideshow } from "../library/stored-slideshow";
import { chaptersOfSlideshow, composedChapters } from "./chapters-of-slideshow";

const LISBON: Place = { name: "Lisbon", latitude: 38.7223, longitude: -9.1393 };
const PORTO: Place = { name: "Porto", latitude: 41.1579, longitude: -8.6291 };

function picture(id: string, capturedAt: string, place?: Place): StoredPicture {
  return {
    id,
    fileName: `${id}.jpg`,
    capturedAt,
    width: 100,
    height: 100,
    colours: { veil: "#202020", accent: "#e0e0e0" },
    ...(place === undefined ? {} : { place }),
  };
}

function slideshow(
  pictures: readonly StoredPicture[],
  overrides: Partial<StoredSlideshow> = {},
): StoredSlideshow {
  return {
    id: "show",
    title: "Trip",
    createdAt: "2025-06-01T00:00:00Z",
    pictures,
    songs: [],
    secondsPerPicture: 5,
    ...overrides,
  };
}

const TWO_STAYS = [
  picture("p1", "2025-06-14T09:00:00Z", LISBON),
  picture("p2", "2025-06-15T09:00:00Z", LISBON),
  picture("p3", "2025-06-21T09:00:00Z", PORTO),
];

describe("chaptersOfSlideshow: gating", () => {
  it("has no automatic chapters for a single-day show", () => {
    const show = slideshow([picture("p1", "2025-06-14T09:00:00Z", LISBON)]);
    expect(chaptersOfSlideshow(show, "en")).toEqual([]);
  });

  it("has no automatic chapters without any place data", () => {
    const show = slideshow([
      picture("p1", "2025-06-14T09:00:00Z"),
      picture("p2", "2025-06-21T09:00:00Z"),
    ]);
    expect(chaptersOfSlideshow(show, "en")).toEqual([]);
  });

  it("has no automatic chapters for a show spent entirely in one place", () => {
    const show = slideshow([
      picture("p1", "2025-06-14T09:00:00Z", LISBON),
      picture("p2", "2025-06-27T09:00:00Z", LISBON),
    ]);
    expect(chaptersOfSlideshow(show, "en")).toEqual([]);
  });

  it("has no automatic chapters once turned off", () => {
    const show = slideshow(TWO_STAYS, { automaticChaptersOff: true });
    expect(chaptersOfSlideshow(show, "en")).toEqual([]);
  });

  it("has no automatic chapters once the order is the owner's own", () => {
    const show = slideshow(TWO_STAYS, { ownOrder: true });
    expect(chaptersOfSlideshow(show, "en")).toEqual([]);
  });

  it("has one chapter per stay after the first", () => {
    const show = slideshow(TWO_STAYS);
    const chapters = chaptersOfSlideshow(show, "en");
    expect(chapters).toHaveLength(1);
    expect(chapters[0]?.anchorPictureId).toBe("p3");
    expect(chapters[0]?.kind).toBe("automatic");
  });
});

describe("chaptersOfSlideshow: automatic text and overrides", () => {
  it("titles the chapter with the stay's place and a single-day subtitle", () => {
    const chapters = chaptersOfSlideshow(slideshow(TWO_STAYS), "en");
    expect(chapters[0]).toMatchObject({
      title: "Porto",
      subtitle: "Day 8 · Saturday, 21 June",
      automaticTitle: "Porto",
      titleEdited: false,
      subtitleEdited: false,
      hidden: false,
    });
  });

  it("applies a chapter edit's own title, leaving the automatic subtitle", () => {
    const show = slideshow(TWO_STAYS, { chapterEdits: [{ pictureId: "p3", title: "Porto trip" }] });
    const chapters = chaptersOfSlideshow(show, "en");
    expect(chapters[0]).toMatchObject({
      title: "Porto trip",
      subtitle: "Day 8 · Saturday, 21 June",
      titleEdited: true,
      subtitleEdited: false,
    });
  });

  it("hides an automatic chapter marked hidden", () => {
    const show = slideshow(TWO_STAYS, { chapterEdits: [{ pictureId: "p3", hidden: true }] });
    expect(chaptersOfSlideshow(show, "en")[0]?.hidden).toBe(true);
  });
});

describe("chaptersOfSlideshow: added chapters", () => {
  it("lists an added chapter with its day's automatic text when it has a place", () => {
    const show = slideshow(TWO_STAYS, { addedChapters: [{ beforePictureId: "p2" }] });
    const chapters = chaptersOfSlideshow(show, "en");
    const added = chapters.find((c) => c.kind === "added");
    expect(added).toMatchObject({
      anchorPictureId: "p2",
      title: "Lisbon",
      subtitle: "Day 2 · Sunday, 15 June",
      titleEdited: false,
    });
  });

  it("lists an added chapter with a day title when its day has no place", () => {
    const show = slideshow(
      [picture("p1", "2025-06-14T09:00:00Z"), picture("p2", "2025-06-15T09:00:00Z")],
      { addedChapters: [{ beforePictureId: "p2" }] },
    );
    const [added] = chaptersOfSlideshow(show, "en");
    expect(added).toMatchObject({ title: "Day 2", subtitle: "Sunday, 15 June" });
  });

  it("applies an added chapter's own title and subtitle", () => {
    const show = slideshow(TWO_STAYS, {
      addedChapters: [{ beforePictureId: "p2", title: "Market day", subtitle: "A side trip" }],
    });
    const [added] = chaptersOfSlideshow(show, "en");
    expect(added).toMatchObject({
      title: "Market day",
      subtitle: "A side trip",
      titleEdited: true,
    });
  });

  it("orders chapters by their anchor picture's play order", () => {
    const show = slideshow(TWO_STAYS, { addedChapters: [{ beforePictureId: "p2" }] });
    const chapters = chaptersOfSlideshow(show, "en");
    expect(chapters.map((c) => c.anchorPictureId)).toEqual(["p2", "p3"]);
  });

  it("lists an added chapter even when automatic chapters are off", () => {
    const show = slideshow(TWO_STAYS, {
      automaticChaptersOff: true,
      addedChapters: [{ beforePictureId: "p2" }],
    });
    const chapters = chaptersOfSlideshow(show, "en");
    expect(chapters).toHaveLength(1);
    expect(chapters[0]?.kind).toBe("added");
  });
});

describe("composedChapters", () => {
  it("excludes a hidden automatic chapter", () => {
    const show = slideshow(TWO_STAYS, { chapterEdits: [{ pictureId: "p3", hidden: true }] });
    expect(composedChapters(show, "en")).toEqual([]);
  });

  it("gives the anchor and resolved text for a visible chapter", () => {
    const chapters = composedChapters(slideshow(TWO_STAYS), "en");
    expect(chapters).toEqual([
      { anchorPictureId: "p3", title: "Porto", subtitle: "Day 8 · Saturday, 21 June" },
    ]);
  });
});
