import { describe, expect, it } from "vitest";
import type { GlissandoManifest } from "../glissando-file/glissando-manifest";
import { exportedFile, exportedVideoFile } from "../glissando-file/testing/glissando-fixtures";
import { checkFolder } from "./check-folder";
import { pickedFolder, type FolderSource } from "./folder-source";
import { folderShow } from "./folder-show";
import { unpackedFolder } from "./testing/unpacked-folder";

async function checkedFolder(
  file: Blob,
): Promise<{ folder: FolderSource; manifest: GlissandoManifest }> {
  const folder = pickedFolder(await unpackedFolder(file));
  const checked = await checkFolder(folder);
  if (checked.kind !== "ok") throw new Error(`the fixture does not check: ${checked.kind}`);
  return { folder, manifest: checked.manifest };
}

const songUrl = (song: Blob) => `blob:song-${song.size}`;

describe("folderShow", () => {
  it("plays each picture by its path in the folder, read from there", async () => {
    const { folder, manifest } = await checkedFolder(await exportedFile());

    const show = await folderShow(manifest, folder, songUrl);

    const sources = show.page.slideshow.slides.flatMap((slide) =>
      "image" in slide ? [slide.image.src] : [],
    );
    expect(sources).toEqual(manifest.slideshow.pictures.map(({ file }) => file));
    const [first] = sources;
    expect(await (await show.page.openPicture(first ?? "")).text()).toContain("display");
  });

  it("plays each song from a URL of its file", async () => {
    const { folder, manifest } = await checkedFolder(await exportedFile());

    const show = await folderShow(manifest, folder, songUrl);

    const music = await folder.read(manifest.slideshow.songs[0]?.file ?? "");
    expect(show.page.slideshow.music?.map(({ src }) => src)).toEqual([
      songUrl(music ?? new Blob()),
    ]);
  });

  it("sums up the pictures, the play time and the music for the start card", async () => {
    const { folder, manifest } = await checkedFolder(await exportedFile());

    const { summary, page } = await folderShow(manifest, folder, songUrl);

    expect(summary).toEqual({
      pictureCount: manifest.slideshow.pictures.length,
      durationMs: page.slideshow.slides.reduce((sum, { durationMs }) => sum + durationMs, 0),
      withMusic: true,
    });
  });

  it("reads each clip from its file in the folder", async () => {
    const { folder, manifest } = await checkedFolder(await exportedVideoFile());

    const { page } = await folderShow(manifest, folder, songUrl);

    const clip = page.slideshow.slides.flatMap((slide) =>
      "video" in slide && slide.video !== undefined ? [slide.video.src] : [],
    )[0];
    expect(clip).toMatch(/^videos\//);
    expect(await (await page.readVideo?.(clip ?? ""))?.text()).toMatch(/clip/);
  });

  it("fails loud on a picture the folder does not hold", async () => {
    const { folder, manifest } = await checkedFolder(await exportedFile());

    const { page } = await folderShow(manifest, folder, songUrl);

    await expect(page.openPicture("pictures/9999.png")).rejects.toThrow(/9999/);
  });
});
