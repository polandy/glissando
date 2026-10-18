import { describe, expect, it } from "vitest";
import {
  checkGlissandoFile,
  type CheckedGlissandoFile,
  type GlissandoFileCheck,
} from "./check-glissando-file";
import { MAX_MANIFEST_BYTES } from "./file-limits";
import { MANIFEST_ENTRY_NAME } from "./glissando-manifest";
import { fakeMediaDecoders, MADE_THUMBNAIL_MARKER } from "./testing/fake-media-decoders";
import { EXPORTED_MEDIA_BYTES, exportedFile } from "./testing/glissando-fixtures";
import { rawZip, type RawEntry } from "./testing/raw-zip";
import infoZipUrl from "./testing/repacked/info-zip.glissando?url&inline";
import macosFinderUrl from "./testing/repacked/macos-finder.glissando?url&inline";
import noThumbnailsUrl from "./testing/repacked/no-thumbnails.glissando?url&inline";
import pythonZipfileUrl from "./testing/repacked/python-zipfile.glissando?url&inline";
import windowsExplorerUrl from "./testing/repacked/windows-explorer.glissando?url&inline";
import { readEntry, readZipDirectory } from "./zip-reader";

const plentyOfSpace = { freeBytes: () => Promise.resolve(1e9), mediaDecoders: fakeMediaDecoders() };

async function fixture(dataUrl: string): Promise<Blob> {
  return (await fetch(dataUrl)).blob();
}

function contentsOf(check: GlissandoFileCheck): CheckedGlissandoFile {
  if (check.kind !== "ok") {
    throw new Error(`expected the file to open, got ${JSON.stringify(check)}`);
  }
  return check.contents;
}

function damagedReason(check: GlissandoFileCheck): string {
  if (check.kind !== "damaged") {
    throw new Error(`expected a damaged check, got ${check.kind}`);
  }
  return check.reason;
}

/** Every media path the manifest names, with its bytes as text. */
async function mediaTexts(contents: CheckedGlissandoFile): Promise<Record<string, string>> {
  const { pictures, songs } = contents.manifest.slideshow;
  const paths = [...pictures.flatMap((p) => [p.file, p.thumbnail]), ...songs.map((s) => s.file)];
  const texts: Record<string, string> = {};
  for (const path of paths) {
    texts[path] = await (await contents.media(path)).text();
  }
  return texts;
}

/** The exported file's entries, as raw entries a test may pack and change at will. */
async function exportedEntries(): Promise<RawEntry[]> {
  const file = await exportedFile();
  const entries: RawEntry[] = [];
  for (const entry of (await readZipDirectory(file)) ?? []) {
    const read = await readEntry(file, entry);
    if (read.kind === "ok") {
      entries.push({ name: entry.name, content: new Uint8Array(await read.data.arrayBuffer()) });
    }
  }
  return entries;
}

describe("checkGlissandoFile on a file packed again", () => {
  it.each([
    ["Info-ZIP's zip -r, deflated, with directory entries", infoZipUrl],
    ["Python's zipfile, deflated, glissando.json last", pythonZipfileUrl],
    ["macOS Finder, in a folder, with __MACOSX and .DS_Store", macosFinderUrl],
    ["Windows Explorer, in a folder, with Thumbs.db and desktop.ini", windowsExplorerUrl],
  ])("opens a file packed by %s with the export's manifest and media", async (_, url) => {
    const exported = contentsOf(await checkGlissandoFile(await exportedFile(), plentyOfSpace));

    const repacked = contentsOf(await checkGlissandoFile(await fixture(url), plentyOfSpace));

    expect(repacked.manifest).toEqual(exported.manifest);
    expect(repacked.mediaBytes).toBe(EXPORTED_MEDIA_BYTES);
    expect(await mediaTexts(repacked)).toEqual(await mediaTexts(exported));
  });

  it("makes every missing thumbnail again from its picture", async () => {
    const decoders = fakeMediaDecoders();
    const check = await checkGlissandoFile(await fixture(noThumbnailsUrl), {
      ...plentyOfSpace,
      mediaDecoders: decoders,
    });

    const contents = contentsOf(check);
    for (const picture of contents.manifest.slideshow.pictures) {
      const display = await (await contents.media(picture.file)).text();
      expect(display).toContain("display");
      expect(await (await contents.media(picture.thumbnail)).text()).toBe(
        MADE_THUMBNAIL_MARKER + display,
      );
    }
    expect(decoders.thumbnailCalls).toHaveLength(2);
  });

  it("counts a made thumbnail in the media bytes", async () => {
    const check = await checkGlissandoFile(await fixture(noThumbnailsUrl), plentyOfSpace);
    const contents = contentsOf(check);
    const { pictures } = contents.manifest.slideshow;
    let thumbnailBytes = 0;
    for (const picture of pictures) {
      thumbnailBytes += (await contents.media(picture.thumbnail)).size;
    }
    const exported = contentsOf(await checkGlissandoFile(await exportedFile(), plentyOfSpace));
    let exportedThumbnailBytes = 0;
    for (const picture of exported.manifest.slideshow.pictures) {
      exportedThumbnailBytes += (await exported.media(picture.thumbnail)).size;
    }
    expect(contents.mediaBytes).toBe(
      EXPORTED_MEDIA_BYTES - exportedThumbnailBytes + thumbnailBytes,
    );
  });

  it("makes no thumbnail from a picture that does not decode, and names the picture", async () => {
    const entries = (await exportedEntries()).filter(({ name }) => !name.startsWith("thumbnails/"));
    const decoders = fakeMediaDecoders({ refusePictureContaining: "display one" });

    const check = await checkGlissandoFile(await rawZip(entries), {
      ...plentyOfSpace,
      mediaDecoders: decoders,
    });

    expect(damagedReason(check)).toMatch(/^"pictures\/\d+\.png" does not decode/);
    const decoded = await Promise.all(decoders.pictureCalls.map((picture) => picture.text()));
    expect(decoded.some((text) => text.includes("display one"))).toBe(true);
    const madeFrom = await Promise.all(decoders.thumbnailCalls.map((picture) => picture.text()));
    expect(madeFrom.some((text) => text.includes("display one"))).toBe(false);
  });

  it("still refuses a file missing a picture its manifest names", async () => {
    const entries = (await exportedEntries()).filter(({ name }) => !name.startsWith("pictures/"));
    expect(damagedReason(await checkGlissandoFile(await rawZip(entries), plentyOfSpace))).toMatch(
      /^"pictures\/\d+\.png" is missing$/,
    );
  });

  it("refuses a deflated picture whose unpacked bytes do not match its checksum, naming it", async () => {
    const entries = (await exportedEntries()).map((entry) =>
      entry.name === "pictures/0001.png" ? { ...entry, crc32: 1 } : entry,
    );
    expect(damagedReason(await checkGlissandoFile(await rawZip(entries), plentyOfSpace))).toBe(
      '"pictures/0001.png" does not match its checksum',
    );
  });

  it("refuses a deflated song that unpacks beyond its declared size, a ZIP bomb", async () => {
    const entries = (await exportedEntries()).map((entry) =>
      entry.name.startsWith("music/")
        ? { ...entry, content: new Uint8Array(4 * 1024 * 1024), declaredSize: 11 }
        : entry,
    );
    expect(damagedReason(await checkGlissandoFile(await rawZip(entries), plentyOfSpace))).toMatch(
      /^"music\/track-1\.m4a" unpacks to more than its declared 11 bytes$/,
    );
  });

  it("refuses a deflated manifest declared over its size limit before unpacking it", async () => {
    const entries = (await exportedEntries()).map((entry) =>
      entry.name === MANIFEST_ENTRY_NAME
        ? { ...entry, declaredSize: MAX_MANIFEST_BYTES + 1 }
        : entry,
    );
    expect(damagedReason(await checkGlissandoFile(await rawZip(entries), plentyOfSpace))).toBe(
      `${MANIFEST_ENTRY_NAME} is ${MAX_MANIFEST_BYTES + 1} bytes, over the ${MAX_MANIFEST_BYTES} limit`,
    );
  });

  it("still refuses an entry a ZIP tool does not add and the format does not use", async () => {
    const entries = [...(await exportedEntries()), { name: "notes.txt", content: "mine" }];
    expect(damagedReason(await checkGlissandoFile(await rawZip(entries), plentyOfSpace))).toBe(
      '"notes.txt" is not an entry name this format uses',
    );
  });

  it("refuses an entry beside the folder it strips, which could stand in for one inside", async () => {
    const exported = await exportedEntries();
    const entries = [
      ...exported.map((entry) => ({ ...entry, name: `Album/${entry.name}` })),
      { name: "pictures/0001.png", content: "another picture" },
    ];
    expect(damagedReason(await checkGlissandoFile(await rawZip(entries), plentyOfSpace))).toBe(
      '"pictures/0001.png" is outside the folder "Album/" that holds glissando.json',
    );
  });

  it("refuses a picture packed with a method it cannot unpack, naming it", async () => {
    const entries = (await exportedEntries()).map((entry) =>
      entry.name === "pictures/0002.png" ? { ...entry, method: 12 } : entry,
    );
    expect(damagedReason(await checkGlissandoFile(await rawZip(entries), plentyOfSpace))).toMatch(
      /^"pictures\/0002\.png" is packed with ZIP method 12/,
    );
  });

  it.each([
    ["a ZIP with glissando.json two folders deep", [{ name: "a/b/glissando.json", content: "{}" }]],
    ["a ZIP of photos, deflated", [{ name: "IMG_0001.jpg", content: "photo" }]],
  ])("refuses %s as foreign", async (_, entries) => {
    expect((await checkGlissandoFile(await rawZip(entries), plentyOfSpace)).kind).toBe("foreign");
  });

  it("refuses a ZIP cut short before its directory as damaged, not foreign", async () => {
    const file = await rawZip([{ name: "IMG_0001.jpg", content: "photo" }]);
    expect((await checkGlissandoFile(file.slice(0, -10), plentyOfSpace)).kind).toBe("damaged");
  });
});
