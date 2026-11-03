import { describe, expect, it } from "vitest";
import { checkGlissandoFile } from "./check-glissando-file";
import { GLISSANDO_FORMAT_VERSION } from "./glissando-manifest";
import { plentyOfSpace, manifestText } from "./testing/check-fixtures";
import {
  EXPORTED_MEDIA_BYTES,
  exportedFile,
  withBytesReplaced,
  zipWith,
} from "./testing/glissando-fixtures";

describe("checkGlissandoFile", () => {
  it("accepts a file the export wrote, with its manifest and the bytes the media need", async () => {
    const check = await checkGlissandoFile(await exportedFile(), plentyOfSpace);
    expect(check.kind).toBe("ok");
    expect(check.kind === "ok" && check.contents.manifest.slideshow.title).toBe("Herbst in Wien");
    expect(check.kind === "ok" && check.contents.mediaBytes).toBe(EXPORTED_MEDIA_BYTES);
  });

  it("reports checking progress up to the whole file", async () => {
    const reported: number[] = [];
    await checkGlissandoFile(await exportedFile(), {
      ...plentyOfSpace,
      onProgress: (fraction) => reported.push(fraction),
    });
    expect(reported.at(-1)).toBe(1);
    expect(reported).toEqual([...reported].sort((a, b) => a - b));
  });

  it.each([
    ["a JPEG", async () => new Blob(["\xff\xd8\xff\xe0 a JPEG"])],
    ["an empty file", async () => new Blob([])],
    ["a ZIP of photos", async () => zipWith({ "IMG_0001.jpg": "photo" })],
    [
      "a ZIP whose manifest names another format",
      async () =>
        zipWith({ "glissando.json": await manifestText((m) => ({ ...m, format: "other" })) }),
    ],
  ])("refuses %s as foreign", async (_, file) => {
    expect((await checkGlissandoFile(await file(), plentyOfSpace)).kind).toBe("foreign");
  });

  it("refuses a file from a newer format version as newer", async () => {
    const file = await zipWith({
      "glissando.json": await manifestText((m) => ({
        ...m,
        formatVersion: GLISSANDO_FORMAT_VERSION + 1,
      })),
    });
    expect((await checkGlissandoFile(file, plentyOfSpace)).kind).toBe("newer");
  });

  it.each([
    ["cut short", async () => (await exportedFile()).slice(0, -40)],
    [
      "with a damaged picture",
      async () => withBytesReplaced(await exportedFile(), "display two", "display tw0"),
    ],
    [
      "with a damaged manifest",
      async () => withBytesReplaced(await exportedFile(), "Herbst", "Hxrbst"),
    ],
    [
      "missing a picture its manifest names",
      async () => zipWith({ "glissando.json": await manifestText((m) => m) }),
    ],
    ["with a manifest that is no JSON", async () => zipWith({ "glissando.json": "{ cut" })],
  ])("refuses a file %s as damaged", async (_, file) => {
    expect((await checkGlissandoFile(await file(), plentyOfSpace)).kind).toBe("damaged");
  });

  it("refuses a file whose media need more than the free space, with both sizes", async () => {
    const check = await checkGlissandoFile(await exportedFile(), {
      ...plentyOfSpace,
      freeBytes: () => Promise.resolve(10),
    });
    expect(check).toEqual({ kind: "tooLarge", neededBytes: EXPORTED_MEDIA_BYTES, freeBytes: 10 });
  });

  it("accepts a file when the free space is unknown", async () => {
    const check = await checkGlissandoFile(await exportedFile(), {
      ...plentyOfSpace,
      freeBytes: () => Promise.resolve(null),
    });
    expect(check.kind).toBe("ok");
  });

  it("stops with the signal's reason when cancelled while checking the media", async () => {
    const cancel = new AbortController();
    const checking = checkGlissandoFile(await exportedFile(), {
      ...plentyOfSpace,
      signal: cancel.signal,
      onProgress: () => cancel.abort(),
    });
    await expect(checking).rejects.toMatchObject({ name: "AbortError" });
  });
});
