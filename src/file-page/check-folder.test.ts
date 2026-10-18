import { describe, expect, it } from "vitest";
import {
  GLISSANDO_FORMAT_ID,
  GLISSANDO_FORMAT_VERSION,
} from "../glissando-file/glissando-manifest";
import {
  EXPORTED_SLIDESHOW,
  exportedFile,
  exportedVideoFile,
} from "../glissando-file/testing/glissando-fixtures";
import { checkFolder } from "./check-folder";
import { fetchedFolder, pickedFolder } from "./folder-source";
import { unpackedFolder, without, withManifestText } from "./testing/unpacked-folder";

async function manifestOf(entries: Awaited<ReturnType<typeof unpackedFolder>>) {
  const json = entries.find(({ relativePath }) => relativePath.endsWith("/glissando.json"));
  return JSON.parse((await json?.file.text()) ?? "") as {
    slideshow: { pictures: { file: string }[] };
  };
}

describe("checkFolder", () => {
  it("is ok for an unpacked file, with its manifest", async () => {
    const checked = await checkFolder(pickedFolder(await unpackedFolder(await exportedFile())));

    expect(checked.kind === "ok" && checked.manifest.slideshow.title).toBe(
      EXPORTED_SLIDESHOW.title,
    );
  });

  it("asks for the folder where the browser refuses to read beside the page", async () => {
    const refusing = fetchedFolder(() => Promise.reject(new TypeError("Failed to fetch")));

    expect(await checkFolder(refusing)).toEqual({ kind: "unreadable" });
  });

  it("finds no glissando.json in a folder without one", async () => {
    const entries = without(await unpackedFolder(await exportedFile()), "glissando.json");

    expect(await checkFolder(pickedFolder(entries))).toEqual({ kind: "noManifest" });
  });

  it("refuses a glissando.json of another format, and one of a newer version", async () => {
    const entries = await unpackedFolder(await exportedFile());
    const newer = { format: GLISSANDO_FORMAT_ID, formatVersion: GLISSANDO_FORMAT_VERSION + 1 };

    const foreign = withManifestText(entries, JSON.stringify({ format: "other" }));
    expect(await checkFolder(pickedFolder(foreign))).toEqual({ kind: "foreign" });
    const fromNewer = withManifestText(entries, JSON.stringify(newer));
    expect(await checkFolder(pickedFolder(fromNewer))).toEqual({ kind: "newer" });
  });

  it("says why a damaged glissando.json is damaged", async () => {
    const entries = withManifestText(await unpackedFolder(await exportedFile()), "{ not json");

    const checked = await checkFolder(pickedFolder(entries));

    expect(checked.kind === "damaged" && checked.reason).toMatch(/no JSON/);
  });

  it("refuses a picture named as a thumbnail as damaged", async () => {
    const entries = await unpackedFolder(await exportedFile());
    const manifest = await manifestOf(entries);
    const [first] = manifest.slideshow.pictures;
    if (first !== undefined) first.file = "thumbnails/0001.png";

    const checked = await checkFolder(
      pickedFolder(withManifestText(entries, JSON.stringify(manifest))),
    );

    expect(checked.kind).toBe("damaged");
  });

  it("lists the pictures and songs the folder lacks, but no thumbnail", async () => {
    const entries = without(
      await unpackedFolder(await exportedFile()),
      "pictures/0002.png",
      "music/track-1.m4a",
      "thumbnails/0001.png",
    );

    expect(await checkFolder(pickedFolder(entries))).toEqual({
      kind: "missing",
      files: ["pictures/0002.png", "music/track-1.m4a"],
    });
  });

  it("lists a clip the folder lacks", async () => {
    const entries = await unpackedFolder(await exportedVideoFile());
    const clip = entries.find(({ relativePath }) => relativePath.includes("/videos/"));
    const clipPath = clip?.relativePath.split("/").slice(1).join("/") ?? "";

    const checked = await checkFolder(pickedFolder(without(entries, clipPath)));

    expect(checked).toEqual({ kind: "missing", files: [clipPath] });
  });
});
