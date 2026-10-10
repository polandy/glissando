import { describe, expect, it } from "vitest";
import { MediaNotFoundError } from "../../library/stored-slideshow";
import { MemoryLibraryStore } from "../../library/testing/memory-store";
import { fakeIntakePorts, INTAKE_NOW, pictureFile } from "../testing/picture-intake-ports";
import { PictureIntake } from "./picture-intake";

const KNOWN = { fileName: "beach.jpg", capturedAt: "2025-07-01T10:00:00Z" };

describe("PictureIntake", () => {
  it("skips a picture already known as a duplicate, before reading it", async () => {
    const { ports } = fakeIntakePorts();
    const intake = new PictureIntake(ports, [KNOWN]);

    intake.addPictures([
      pictureFile("beach.jpg", KNOWN.capturedAt),
      pictureFile("hill.jpg", "2025-07-02T10:00:00Z"),
    ]);
    await intake.pictures.settled();

    expect(intake.pictures.state.pictures.map(({ fileName }) => fileName)).toEqual(["hill.jpg"]);
    expect(intake.pictures.state.skipped).toEqual([{ fileName: "beach.jpg", reason: "duplicate" }]);
  });

  it("takes the duplicates in after all, claimed like every other picture", async () => {
    const { ports, store } = fakeIntakePorts();
    const intake = new PictureIntake(ports, [KNOWN]);
    intake.addPictures([pictureFile("beach.jpg", KNOWN.capturedAt)]);
    await intake.pictures.settled();

    intake.addDuplicates();
    await intake.pictures.settled();

    const [picture] = intake.pictures.state.pictures;
    expect(picture?.fileName).toBe("beach.jpg");
    await store.deleteUnreferencedMedia(INTAKE_NOW);
    expect(await (await store.pictureBlob(picture?.id ?? "")).text()).toMatch(/display/);
  });

  it("discarding ends the claim, so the next clean-up deletes what it took in", async () => {
    const { ports, store } = fakeIntakePorts(new MemoryLibraryStore());
    const intake = new PictureIntake(ports);
    intake.addPictures([pictureFile("a.jpg", "2025-07-01T10:00:00Z")]);
    await intake.pictures.settled();
    const [picture] = intake.pictures.state.pictures;

    await intake.discard();
    await store.deleteUnreferencedMedia(INTAKE_NOW);

    expect(intake.pictures.state.pictures).toEqual([]);
    expect(
      await store.pictureBlob(picture?.id ?? "").catch((error: unknown) => error),
    ).toBeInstanceOf(MediaNotFoundError);
  });
});
