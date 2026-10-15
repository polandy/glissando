import { describe, expect, it } from "vitest";
import { MemoryLibraryStore } from "../../library/testing/memory-store";
import {
  FAKE_CLIP_MS,
  fakeIntakePorts,
  INTAKE_NOW,
  pictureFile,
  videoFile,
} from "../testing/picture-intake-ports";
import { PictureIntake } from "./picture-intake";

const DATE = "2025-07-01T10:00:00Z";

describe("PictureIntake, videos", () => {
  it("takes a video in as a picture with its whole clip, mixed in capture order", async () => {
    const { ports, store } = fakeIntakePorts();
    const intake = new PictureIntake(ports);

    intake.addPictures([
      videoFile("clip.mp4", "2025-07-01T10:00:05Z"),
      pictureFile("a.jpg", DATE),
      pictureFile("b.jpg", "2025-07-01T10:00:10Z"),
    ]);
    await intake.settled();

    const [, clip] = intake.pictures.state.pictures;
    expect(intake.pictures.state.pictures.map(({ fileName }) => fileName)).toEqual([
      "a.jpg",
      "clip.mp4",
      "b.jpg",
    ]);
    expect(clip?.video).toMatchObject({ sourceMs: FAKE_CLIP_MS, startMs: 0, endMs: FAKE_CLIP_MS });
    expect(await (await store.videoBlob(clip?.video?.mediaId ?? "")).text()).toBe("clip.mp4");
    expect(await (await store.pictureBlob(clip?.id ?? "")).text()).toBe("display clip.mp4.jpg");
  });

  it("starts a clip longer than the longest excerpt as its first five minutes", async () => {
    const { ports } = fakeIntakePorts();
    const intake = new PictureIntake({
      ...ports,
      videoClips: {
        ...ports.videoClips,
        openClip: () =>
          Promise.resolve({
            durationMs: 20 * 60_000,
            posterFrame: () => Promise.resolve(new File(["f"], "f.jpg")),
            close: () => undefined,
          }),
      },
    });

    intake.addPictures([videoFile("long.mp4", DATE)]);
    await intake.settled();

    expect(intake.pictures.state.pictures[0]?.video).toMatchObject({
      sourceMs: 20 * 60_000,
      endMs: 5 * 60_000,
    });
  });

  it("refuses an unplayable video at its own tile and goes on with the rest", async () => {
    const { ports } = fakeIntakePorts();
    const intake = new PictureIntake(ports);

    intake.addPictures([videoFile("broken.mov", DATE), pictureFile("a.jpg", DATE)]);
    await intake.settled();

    expect(intake.pictures.state.skipped).toEqual([
      { fileName: "broken.mov", reason: "videoUnplayable" },
    ]);
    expect(intake.pictures.state.pictures.map(({ fileName }) => fileName)).toEqual(["a.jpg"]);
  });

  it("claims the clip's bytes, so a clean-up spares them until the claim ends", async () => {
    const { ports, store } = fakeIntakePorts(new MemoryLibraryStore());
    const intake = new PictureIntake(ports);
    intake.addPictures([videoFile("clip.mp4", DATE)]);
    await intake.settled();
    const mediaId = intake.pictures.state.pictures[0]?.video?.mediaId ?? "";

    await store.deleteUnreferencedMedia(INTAKE_NOW);
    expect(await (await store.videoBlob(mediaId)).text()).toBe("clip.mp4");

    await intake.discard();
    await store.deleteUnreferencedMedia(INTAKE_NOW);
    await expect(store.videoBlob(mediaId)).rejects.toThrow();
  });

  it("never culls a video, neither as blurry nor as a duplicate shot", async () => {
    const { ports } = fakeIntakePorts();
    const intake = new PictureIntake(ports);

    intake.addPictures([videoFile("a.mp4", DATE), videoFile("b.mp4", DATE)]);
    await intake.settled();

    expect(intake.pictures.state.pictures).toHaveLength(2);
    expect((ports.checker as unknown as { asked: string[] }).asked).toEqual([]);
  });
});
