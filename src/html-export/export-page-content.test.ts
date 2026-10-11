import { describe, expect, it } from "vitest";
import type { StoredSlideshow } from "../library/stored-slideshow";
import { parseSlideshow } from "../player";
import { exportPage } from "./export-page";
import { WITHOUT_MUSIC, STORED, TWO_SONGS, run, block, decoded } from "./export-page-fixtures";

describe("exportPage, what the page holds", () => {
  it("writes the page in order: head, each picture as p<n>, each song as s<n>, the player, then closes", async () => {
    const { job, sink } = run();

    await exportPage(job);

    const page = sink.text;
    const order = ["slideshow", "copy", "p0", "p1", "p2", "s0"].map((id) =>
      page.indexOf(`id="${id}"`),
    );
    expect(order.every((at) => at >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(page.indexOf("<script>startPage()</script>")).toBeGreaterThan(order.at(-1) ?? 0);
    expect(page.endsWith("</html>\n")).toBe(true);
    expect(sink.closed).toBe(true);
  });

  it("points the slideshow's pictures at their blocks and its track at its song's block", async () => {
    const { job, sink } = run();

    await exportPage(job);

    const slideshow = parseSlideshow(JSON.parse(block(sink.text, "slideshow") ?? "null"));
    expect(slideshow.slides.map((slide) => slide.image.src)).toEqual(["p0", "p1", "p2"]);
    expect(slideshow.music?.map((track) => track.src)).toEqual(["s0"]);
    expect(sink.text).toContain('id="s0" data-type="audio/mpeg"');
    expect(decoded(sink.text, "s0")).toBe("bytes of m1");
  });

  it("embeds every song the slideshow plays, each in its own block", async () => {
    const { job, sink } = run({ stored: TWO_SONGS });

    await exportPage(job);

    const slideshow = parseSlideshow(JSON.parse(block(sink.text, "slideshow") ?? "null"));
    expect(slideshow.music?.map((track) => track.src)).toEqual(["s0", "s1"]);
    expect(decoded(sink.text, "s0")).toBe("bytes of m1");
    expect(sink.text).toContain('id="s1" data-type="audio/ogg"');
    expect(decoded(sink.text, "s1")).toBe("bytes of m2");
  });

  it("leaves out a song the slideshow never reaches", async () => {
    const stored: StoredSlideshow = {
      ...WITHOUT_MUSIC,
      songs: [...STORED.songs, ...TWO_SONGS.songs.slice(1)],
      // 12 s of pictures, within the first song's 60 s.
      pictureLength: "seconds",
    };
    const { job, sink } = run({ stored });

    await exportPage(job);

    expect(decoded(sink.text, "s0")).toBe("bytes of m1");
    expect(block(sink.text, "s1")).toBeUndefined();
  });

  it("changes the pictures on the music's beats it was given", async () => {
    const { job, sink } = run({
      beats: new Map([["m1", { kind: "beats", beatsMs: [19_500, 40_500], beatsPerMinute: 60 }]]),
    });

    await exportPage(job);

    const slideshow = parseSlideshow(JSON.parse(block(sink.text, "slideshow") ?? "null"));
    expect(slideshow.slides.map((slide) => slide.durationMs)).toEqual([19_500, 21_000, 19_500]);
  });

  it("scales a picture larger than the size down to fit it, as JPEG q 0.85", async () => {
    const { job, sink, scaler } = run();

    await exportPage(job);

    expect(scaler.calls).toEqual([
      { text: "bytes of big", size: { width: 1280, height: 720 }, quality: 0.85 },
      { text: "bytes of tall", size: { width: 720, height: 1280 }, quality: 0.85 },
    ]);
    expect(decoded(sink.text, "p0")).toBe("scaled 1280x720 from bytes of big");
    expect(sink.text).toContain('id="p0" data-type="image/jpeg"');
  });

  it("takes the stored bytes of a picture that already fits the size", async () => {
    const { job, sink } = run();

    await exportPage(job);

    expect(decoded(sink.text, "p1")).toBe("bytes of fits");
  });

  it("leaves the music out of a slideshow without music", async () => {
    const { job, sink } = run({ stored: WITHOUT_MUSIC });

    await exportPage(job);

    expect(block(sink.text, "p2")).toBeDefined();
    expect(block(sink.text, "s0")).toBeUndefined();
    expect(JSON.parse(block(sink.text, "slideshow") ?? "null")).not.toHaveProperty("music");
  });
});
