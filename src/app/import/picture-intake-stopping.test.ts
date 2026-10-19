import { describe, expect, it } from "vitest";
import { FakeDecoder } from "../../import/testing/picture-import-fixtures";
import { fakeIntakePorts, pictureFile } from "../testing/picture-intake-ports";
import { PictureIntake } from "./picture-intake";

describe("PictureIntake, stopping a pick", () => {
  it("names the pick with no kept clause when nothing of it landed yet", async () => {
    const decoder = new FakeDecoder();
    const { ports, toaster } = fakeIntakePorts(undefined, { decode: decoder.decode });
    const intake = new PictureIntake(ports);

    decoder.hold();
    intake.addPictures([
      pictureFile("a.jpg", "2025-07-01T10:00:00Z"),
      pictureFile("b.jpg", "2025-07-02T10:00:00Z"),
    ]);
    await decoder.reached;

    intake.stopPick("pick-1");

    expect(toaster.current?.text).toBe("Stopped 2 pictures");

    decoder.open();
    await intake.settled();
    expect(intake.pictures.state.pictures).toEqual([]);
  });

  it("names how many stayed, by the pick's size before stopping shrank it", async () => {
    const decoder = new FakeDecoder();
    const { ports, toaster } = fakeIntakePorts(undefined, { decode: decoder.decode });
    const intake = new PictureIntake(ports);

    decoder.hold();
    intake.addPictures([
      pictureFile("a.jpg", "2025-07-01T10:00:00Z"),
      pictureFile("b.jpg", "2025-07-02T10:00:00Z"),
      pictureFile("c.jpg", "2025-07-03T10:00:00Z"),
    ]);
    await decoder.reached; // a.jpg's decode is reached, held
    decoder.open();
    decoder.hold(); // re-armed before a.jpg's own continuation can run
    await decoder.reached; // a.jpg is fully stored; b.jpg's decode is now reached, held

    intake.stopPick("pick-1");

    expect(toaster.current?.text).toBe("Stopped 3 pictures · 1 pictures already in stay");

    decoder.open();
    await intake.settled();
    expect(intake.pictures.state.pictures.map((stored) => stored.fileName)).toEqual(["a.jpg"]);
  });

  it("throws for an unknown pick, same as PictureImport.stop, and shows no toast", () => {
    const { ports, toaster } = fakeIntakePorts();
    const intake = new PictureIntake(ports);

    expect(() => intake.stopPick("no-such-pick")).toThrow('has no pick "no-such-pick"');
    expect(toaster.current).toBeNull();
  });

  it("throws for a pick already finished, same as PictureImport.stop, and shows no toast", async () => {
    const { ports, toaster } = fakeIntakePorts();
    const intake = new PictureIntake(ports);
    intake.addPictures([pictureFile("a.jpg", "2025-07-01T10:00:00Z")]);
    await intake.settled();

    expect(() => intake.stopPick("pick-1")).toThrow("already finished");
    expect(toaster.current).toBeNull();
  });
});
