import { describe, expect, it } from "vitest";
import { encodeBase64 } from "./base64";
import { exportPage, MEDIA_CHUNK_BYTES, PagePictureError, PlayerAssetError } from "./export-page";
import { MEDIA_BLOCK_END } from "./page";
import { run } from "./export-page-fixtures";

describe("exportPage, progress, cancelling and failures", () => {
  it("reports picture n of N with the bytes written so far, and the total at the end", async () => {
    const { job, sink, progress } = run();
    const lengths: number[] = [];
    sink.beforeWrite = () => lengths.push(sink.text.length);

    const result = await exportPage(job);

    expect(progress.map((step) => [step.picturesDone, step.pictureCount])).toEqual([
      [0, 3],
      [1, 3],
      [2, 3],
      [3, 3],
      [3, 3],
    ]);
    expect(
      progress
        .map((step) => step.bytesWritten)
        .every((bytes, i, all) => bytes >= (all[i - 1] ?? 0)),
    ).toBe(true);
    expect(result.bytesWritten).toBe(new TextEncoder().encode(sink.text).length);
    expect(progress.at(-1)?.bytesWritten).toBe(result.bytesWritten);
  });

  it("stops before the next picture once cancelled, with the signal's reason, and drops the file", async () => {
    const controller = new AbortController();
    const { job, sink, reads } = run({ signal: controller.signal });
    sink.beforeWrite = (text) => {
      if (text.includes('id="p0"')) controller.abort();
    };

    const failure = await exportPage(job).catch((error: unknown) => error);

    expect(failure).toBe(controller.signal.reason);

    expect(reads).toEqual(["big"]);
    expect(sink.aborted).toBe(true);
    expect(sink.closed).toBe(false);
  });

  it("does not commit the page when cancelled while the music is read", async () => {
    const controller = new AbortController();
    const music = new Blob(["bytes of m1"], { type: "audio/mpeg" });
    const { job, sink } = run({ signal: controller.signal });
    const failure = await exportPage({
      ...job,
      media: {
        ...job.media,
        musicBlob: () => {
          controller.abort();
          return Promise.resolve(music);
        },
      },
    }).catch((error: unknown) => error);

    expect(failure).toBe(controller.signal.reason);
    expect(sink.aborted).toBe(true);
    expect(sink.closed).toBe(false);
  });

  it("writes a medium in chunks, one write each, that together are its base64", async () => {
    const bytes = new Uint8Array(MEDIA_CHUNK_BYTES * 2 + 5).map((_, index) => index % 251);
    const music = new Blob([bytes], { type: "audio/mpeg" });
    const { job, sink } = run();

    await exportPage({ ...job, media: { ...job.media, musicBlob: () => Promise.resolve(music) } });

    const start = sink.writes.findIndex((text) => text.includes('id="s0"'));
    const end = sink.writes.indexOf(MEDIA_BLOCK_END, start);
    const chunks = sink.writes.slice(start + 1, end);
    expect(chunks).toHaveLength(3);
    expect(chunks.join("")).toBe(encodeBase64(bytes));
  });

  it("fails with PagePictureError naming the picture that could not be read, and drops the file", async () => {
    const unreadable = new Error("gone");
    const { job, sink } = run({
      media: {
        pictureBlob: (id) =>
          id === "fits" ? Promise.reject(unreadable) : Promise.resolve(new Blob([id])),
        musicBlob: () => Promise.resolve(new Blob([])),
      },
    });

    const failure = await exportPage(job).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(PagePictureError);
    expect(failure).toMatchObject({ pictureIndex: 1, fileName: "fits.jpg", cause: unreadable });
    expect(sink.aborted).toBe(true);
  });

  it("fails with PlayerAssetError before writing anything when the player cannot load", async () => {
    const { job, sink } = run({
      playerAsset: { load: () => Promise.reject(new Error("offline")) },
    });

    await expect(exportPage(job)).rejects.toBeInstanceOf(PlayerAssetError);

    expect(sink.writes).toEqual([]);
    expect(sink.aborted).toBe(true);
  });
});
