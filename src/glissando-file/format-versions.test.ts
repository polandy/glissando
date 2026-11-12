import { describe, expect, it } from "vitest";
import { GREY_PICTURE_COLOURS } from "../library/picture-colours";
import type { StoredSlideshow } from "../library/stored-slideshow";
import { MemoryLibraryStore } from "../library/testing/memory-store";
import { checkGlissandoFile } from "./check-glissando-file";
import { GLISSANDO_FORMAT_VERSION, OLDEST_READABLE_FORMAT_VERSION } from "./glissando-manifest";
import { CARD_ENTRANCE_BEFORE_ENTRANCES } from "./manifest-migrations";
import { writeGlissandoFile } from "./write-glissando-file";
import { damagedReason, plentyOfSpace } from "./testing/check-fixtures";
import { MODIFIED_AT, tinyPicture, zipWith } from "./testing/glissando-fixtures";

/** Each fixture is a manifest as that version's export wrote it (ADR-0054). */
const FIXTURES = import.meta.glob<string>("./testing/format-versions/format-*.json", {
  eager: true,
  query: "?raw",
  import: "default",
});

const VERSIONS = Array.from(
  { length: GLISSANDO_FORMAT_VERSION - OLDEST_READABLE_FORMAT_VERSION + 1 },
  (_, index) => OLDEST_READABLE_FORMAT_VERSION + index,
);

function fixtureText(version: number): string {
  const text =
    FIXTURES[`./testing/format-versions/format-${String(version).padStart(2, "0")}.json`];
  if (text === undefined) {
    throw new Error(`format version ${version} has no fixture: add one`);
  }
  return text;
}

/** The fixture's media paths, each given the bytes a check takes for its kind. */
function mediaEntries(manifest: unknown): Record<string, Blob> {
  const entries: Record<string, Blob> = {};
  const add = (path: string, bytes: Blob): void => {
    entries[path] = bytes;
  };
  JSON.stringify(manifest, (key, value: unknown) => {
    if (typeof value === "string" && (key === "file" || key === "thumbnail")) {
      add(
        value,
        value.startsWith("pictures/") || value.startsWith("thumbnails/")
          ? tinyPicture(value)
          : new Blob([value]),
      );
    }
    return value;
  });
  return entries;
}

async function openFixture(text: string): Promise<{
  readonly slideshow: StoredSlideshow;
  readonly store: MemoryLibraryStore;
}> {
  const file = await zipWith({ "glissando.json": text, ...mediaEntries(JSON.parse(text)) });
  const check = await checkGlissandoFile(file, plentyOfSpace);
  if (check.kind !== "ok") {
    throw new Error(`the fixture should pass the check, got ${JSON.stringify(check)}`);
  }
  const store = new MemoryLibraryStore();
  let next = 0;
  const created = await writeGlissandoFile(
    check.contents,
    { store, newId: () => `id-${++next}`, now: () => MODIFIED_AT, log: () => undefined },
    { existingTitles: [], signal: new AbortController().signal },
  );
  return { slideshow: await store.getSlideshow(created.id), store };
}

/** The newest field each version added, as the opened slideshow holds it. */
const NEWEST_FIELD: Readonly<Record<number, (show: StoredSlideshow) => unknown>> = {
  1: (show) => show.songs[0]?.fileName,
  2: (show) => show.pictures[0]?.kenBurns?.to.zoom,
  3: (show) => show.pictures[0]?.caption,
  4: (show) => show.pictures[0]?.transition,
  5: (show) => show.songs[0]?.trim,
  6: (show) => show.transition,
  7: (show) => [show.pictures[0]?.immichAssetId, show.pictures[1]?.fileBytes],
  8: (show) => show.songs[0]?.pictureChanges,
  9: (show) => show.pictureLength,
  10: (show) => show.betweenSongs,
  11: (show) => [show.portraitPictures, show.pictures[0]?.alone],
  12: (show) => show.openingCard?.title,
  13: (show) => [show.pictures[0]?.colours.veil, show.openingCard?.entrance],
  14: (show) => show.pictures[0]?.video?.endMs,
  15: (show) => show.songs[0]?.volumeDb,
  16: (show) => show.songs[0]?.sampleTrack,
  17: (show) => [show.pictures[0]?.place?.name, show.addedChapters?.[0]?.title],
  18: (show) => show.look,
  19: (show) => show.mood,
  20: (show) => show.energyPacing,
  21: (show) => show.repeatMusic,
  22: (show) => show.title,
};

const NEWEST_VALUE: Readonly<Record<number, unknown>> = {
  1: "Walzer.m4a",
  2: 1.25,
  3: "Am Steg",
  4: "dissolve",
  5: { startMs: 12000, endMs: 200000 },
  6: "alternate",
  7: ["asset-a1", 2500000],
  8: "even",
  9: "seconds",
  10: "sequence",
  11: ["fill-screen", true],
  12: "Herbst in Wien",
  13: ["#404040", "letters"],
  14: 6000,
  15: -3,
  16: "walzer-in-a",
  17: ["Wien", "Anreise"],
  18: "warm",
  19: "calm",
  20: true,
  21: true,
  22: "Format version 22",
};

describe("every .glissando format version opens (ADR-0054)", () => {
  it.each(VERSIONS)("opens a version %i file with the newest field it carries", async (version) => {
    const { slideshow } = await openFixture(fixtureText(version));

    expect(slideshow.title).toBe(`Format version ${version}`);
    expect(slideshow.pictures).toHaveLength(2);
    expect(slideshow.songs).toHaveLength(1);
    expect(NEWEST_FIELD[version]?.(slideshow)).toEqual(NEWEST_VALUE[version]);
  });

  it("stores the focus a version 22 file carries", async () => {
    const { slideshow, store } = await openFixture(fixtureText(22));

    const focus = await store.pictureFocus(slideshow.pictures.map(({ id }) => id));
    expect([...focus.values()].map((stored) => stored.focus.kind)).toEqual(["subject", "scenery"]);
  });

  it("opens a version 4 file's music with its length in whole milliseconds", async () => {
    const { slideshow } = await openFixture(fixtureText(4));

    expect(slideshow.songs[0]?.durationMs).toBe(240000);
  });

  it("gives a version 12 file's pictures grey colours and its cards the entrance of the time", async () => {
    const { slideshow } = await openFixture(fixtureText(12));

    expect(slideshow.pictures.map((picture) => picture.colours)).toEqual([
      GREY_PICTURE_COLOURS,
      GREY_PICTURE_COLOURS,
    ]);
    expect([slideshow.openingCard?.entrance, slideshow.closingCard?.entrance]).toEqual([
      CARD_ENTRANCE_BEFORE_ENTRANCES,
      CARD_ENTRANCE_BEFORE_ENTRANCES,
    ]);
  });

  it("refuses a field in a file of a version before the one that added it", async () => {
    const withCards = JSON.parse(fixtureText(12)) as { slideshow: Record<string, unknown> };
    const version11 = JSON.parse(fixtureText(11)) as { slideshow: Record<string, unknown> };
    const text = JSON.stringify({
      ...version11,
      slideshow: { ...version11.slideshow, openingCard: withCards.slideshow["openingCard"] },
    });
    const file = await zipWith({ "glissando.json": text, ...mediaEntries(version11) });

    expect(damagedReason(await checkGlissandoFile(file, plentyOfSpace))).toContain(
      "slideshow.openingCard",
    );
  });
});
