import { describe, expect, it } from "vitest";
import {
  FILL_SCREEN_PORTRAIT_PICTURES,
  ONE_AT_A_TIME_PORTRAIT_PICTURES,
  type PortraitPictures,
} from "../library/portrait-pictures";
import { OWN_SECONDS_PICTURE_LENGTH } from "../library/picture-length";
import type { StoredSlideshow } from "../library/stored-slideshow";
import { MemoryLibraryStore } from "../library/testing/memory-store";
import { checkGlissandoFile } from "./check-glissando-file";
import { EXPORTED_SLIDESHOW, exportedFile } from "./testing/glissando-fixtures";
import { writeGlissandoFile } from "./write-glissando-file";

async function importedAfterExport(slideshow: StoredSlideshow): Promise<StoredSlideshow> {
  const check = await checkGlissandoFile(await exportedFile(slideshow), {
    freeBytes: () => Promise.resolve(null),
  });
  if (check.kind !== "ok") {
    throw new Error(`the exported file should pass the check, got ${check.kind}`);
  }
  let next = 0;
  return writeGlissandoFile(
    check.contents,
    {
      store: new MemoryLibraryStore(),
      newId: () => `new-${++next}`,
      now: () => new Date("2026-01-02T03:04:05Z"),
      log: () => undefined,
    },
    { existingTitles: [], signal: new AbortController().signal },
  );
}

function withFirstPictureAlone(slideshow: StoredSlideshow): StoredSlideshow {
  const [first, ...rest] = slideshow.pictures;
  if (first === undefined) {
    throw new Error("the fixture has pictures");
  }
  return { ...slideshow, pictures: [{ ...first, alone: true }, ...rest] };
}

describe("writeGlissandoFile layout settings", () => {
  it("keeps a picture marked alone and leaves the others unmarked", async () => {
    const imported = await importedAfterExport(withFirstPictureAlone(EXPORTED_SLIDESHOW));

    const [alone, other] = imported.pictures;
    expect(alone?.fileName).toBe("b.jpg");
    expect(other?.fileName).toBe("a.jpg");
    expect(alone?.alone).toBe(true);
    expect(other).not.toHaveProperty("alone");
  });

  it.each<PortraitPictures>([ONE_AT_A_TIME_PORTRAIT_PICTURES, FILL_SCREEN_PORTRAIT_PICTURES])(
    "keeps the portrait pictures choice %s",
    async (portraitPictures) => {
      const imported = await importedAfterExport({ ...EXPORTED_SLIDESHOW, portraitPictures });

      expect(imported.portraitPictures).toBe(portraitPictures);
    },
  );

  it("leaves the portrait pictures automatic when the file sets none", async () => {
    const imported = await importedAfterExport(EXPORTED_SLIDESHOW);

    expect(imported.title).toBe("Herbst in Wien");
    expect(imported).not.toHaveProperty("portraitPictures");
  });

  it("keeps the own picture length", async () => {
    const imported = await importedAfterExport({
      ...EXPORTED_SLIDESHOW,
      pictureLength: OWN_SECONDS_PICTURE_LENGTH,
    });

    expect(imported.pictureLength).toBe(OWN_SECONDS_PICTURE_LENGTH);
  });
});
