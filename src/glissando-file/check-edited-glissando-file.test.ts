import { describe, expect, it } from "vitest";
import {
  checkGlissandoFile,
  type CheckedGlissandoFile,
  type GlissandoFileCheck,
} from "./check-glissando-file";
import { matchesMediaKind } from "./entry-names";
import { MANIFEST_ENTRY_NAME } from "./glissando-manifest";
import { fakeMediaDecoders, MADE_THUMBNAIL_MARKER } from "./testing/fake-media-decoders";
import { exportedEntries } from "./testing/glissando-fixtures";
import { rawZip, type RawEntry } from "./testing/raw-zip";

const plentyOfSpace = { freeBytes: () => Promise.resolve(1e9), mediaDecoders: fakeMediaDecoders() };

interface EditedPicture {
  file: string;
  thumbnail?: string;
}

/** The exported entries with `glissando.json` edited by `edit`, which may change its pictures. */
async function editedEntries(edit: (pictures: EditedPicture[]) => void): Promise<RawEntry[]> {
  return (await exportedEntries()).map((entry) => {
    if (entry.name !== MANIFEST_ENTRY_NAME) {
      return entry;
    }
    const text =
      typeof entry.content === "string" ? entry.content : new TextDecoder().decode(entry.content);
    const manifest = JSON.parse(text) as { slideshow: { pictures: EditedPicture[] } };
    edit(manifest.slideshow.pictures);
    return { name: entry.name, content: JSON.stringify(manifest) };
  });
}

/** Leaves out picture `index`'s `thumbnail` key, returning the path it named. */
function withoutThumbnailKey(pictures: EditedPicture[], index: number): string {
  const picture = pictures[index];
  if (picture?.thumbnail === undefined) {
    throw new Error(`the fixture has no thumbnail for picture ${index}`);
  }
  const named = picture.thumbnail;
  delete picture.thumbnail;
  return named;
}

function contentsOf(check: GlissandoFileCheck): CheckedGlissandoFile {
  if (check.kind !== "ok") {
    throw new Error(`expected the file to open, got ${JSON.stringify(check)}`);
  }
  return check.contents;
}

/** Picture `index`'s thumbnail path, and whether its bytes were made from its own picture. */
async function madeThumbnailOf(contents: CheckedGlissandoFile, index: number) {
  const picture = contents.manifest.slideshow.pictures[index];
  if (picture === undefined) {
    throw new Error(`the checked file has no picture ${index}`);
  }
  const display = await (await contents.media(picture.file)).text();
  const thumbnail = await (await contents.media(picture.thumbnail)).text();
  return {
    path: picture.thumbnail,
    madeFromItsPicture: thumbnail === MADE_THUMBNAIL_MARKER + display,
  };
}

describe("checkGlissandoFile on an edited glissando.json without a thumbnail key", () => {
  it("makes the thumbnail from its picture under a JPEG thumbnail path of the format", async () => {
    let dropped = "";
    const entries = await editedEntries((pictures) => {
      dropped = withoutThumbnailKey(pictures, 0);
    });
    const withoutItsEntry = entries.filter(({ name }) => name !== dropped);

    const contents = contentsOf(
      await checkGlissandoFile(await rawZip(withoutItsEntry), plentyOfSpace),
    );

    const made = await madeThumbnailOf(contents, 0);
    expect(made.madeFromItsPicture).toBe(true);
    expect(matchesMediaKind("thumbnail", made.path)).toBe(true);
    expect(made.path).toMatch(/\.jpg$/);
  });

  it("counts the made thumbnail in the media bytes", async () => {
    const kept = contentsOf(
      await checkGlissandoFile(await rawZip(await exportedEntries()), plentyOfSpace),
    );
    let dropped = "";
    const entries = await editedEntries((pictures) => {
      dropped = withoutThumbnailKey(pictures, 0);
    });
    const droppedBytes = (await kept.media(dropped)).size;

    const contents = contentsOf(
      await checkGlissandoFile(
        await rawZip(entries.filter(({ name }) => name !== dropped)),
        plentyOfSpace,
      ),
    );

    const madeBytes = (
      await contents.media(contents.manifest.slideshow.pictures[0]?.thumbnail ?? "")
    ).size;
    expect(contents.mediaBytes).toBe(kept.mediaBytes - droppedBytes + madeBytes);
  });

  it("names the made thumbnail with a path no entry of the file holds", async () => {
    const entries = await editedEntries((pictures) => {
      withoutThumbnailKey(pictures, 1);
    });
    const strayNames = ["thumbnails/0001.jpg", "thumbnails/0002.jpg", "thumbnails/0003.jpg"];
    const strays = strayNames.map((name) => ({ name, content: "not a picture" }));

    const contents = contentsOf(
      await checkGlissandoFile(await rawZip([...entries, ...strays]), plentyOfSpace),
    );

    const made = await madeThumbnailOf(contents, 1);
    expect(made.madeFromItsPicture).toBe(true);
    expect(strayNames).not.toContain(made.path);
  });

  it("names the made thumbnail with a path no other picture names", async () => {
    const entries = await editedEntries((pictures) => {
      const first = pictures[0];
      if (first !== undefined) {
        first.thumbnail = "thumbnails/0002.jpg";
      }
      withoutThumbnailKey(pictures, 1);
    });
    const withoutThumbnails = entries.filter(({ name }) => !name.startsWith("thumbnails/"));

    const contents = contentsOf(
      await checkGlissandoFile(await rawZip(withoutThumbnails), plentyOfSpace),
    );

    const first = await madeThumbnailOf(contents, 0);
    const second = await madeThumbnailOf(contents, 1);
    expect(first).toEqual({ path: "thumbnails/0002.jpg", madeFromItsPicture: true });
    expect(second.madeFromItsPicture).toBe(true);
    expect(second.path).not.toBe(first.path);
  });

  it("still refuses the file when that picture does not decode, and makes no thumbnail", async () => {
    const entries = await editedEntries((pictures) => {
      withoutThumbnailKey(pictures, 0);
    });
    const decoders = fakeMediaDecoders({ refusePictureContaining: "display" });

    const check = await checkGlissandoFile(await rawZip(entries), {
      ...plentyOfSpace,
      mediaDecoders: decoders,
    });

    expect(decoders.pictureCalls.length).toBeGreaterThan(0);
    expect(check).toEqual({
      kind: "damaged",
      reason: expect.stringMatching(/^"pictures\/\d+\.png" does not decode/),
    });
    expect(decoders.thumbnailCalls).toHaveLength(0);
  });
});
