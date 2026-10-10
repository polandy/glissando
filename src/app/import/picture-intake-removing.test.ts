import { describe, expect, it } from "vitest";
import { fakeIntakePorts, pictureFile } from "../testing/picture-intake-ports";
import { PictureIntake } from "./picture-intake";

async function intakeWithTwo() {
  const fixture = fakeIntakePorts();
  const intake = new PictureIntake(fixture.ports);
  intake.addPictures([
    pictureFile("beach.jpg", "2025-07-01T10:00:00Z"),
    pictureFile("hill.jpg", "2025-07-02T10:00:00Z"),
  ]);
  await intake.pictures.settled();
  const idOf = (name: string): string => {
    const found = intake.pictures.state.pictures.find((stored) => stored.fileName === name);
    if (found === undefined) {
      throw new Error(`no stored picture ${name}`);
    }
    return found.id;
  };
  return { ...fixture, intake, idOf };
}

const names = (intake: PictureIntake): string[] =>
  intake.pictures.state.pictures.map(({ fileName }) => fileName);

describe("PictureIntake, removing chosen pictures", () => {
  it("removes a picture with an undo toast that puts it back", async () => {
    const { intake, idOf, toaster } = await intakeWithTwo();

    intake.removePicture(idOf("beach.jpg"));
    expect(names(intake)).toEqual(["hill.jpg"]);
    expect(toaster.current?.text).toBe("1 picture removed");
    toaster.act();

    expect(names(intake)).toEqual(["beach.jpg", "hill.jpg"]);
  });

  it("ends the undo when more pictures are chosen", async () => {
    const { intake, idOf, toaster } = await intakeWithTwo();
    intake.removePicture(idOf("beach.jpg"));

    intake.addPictures([pictureFile("lake.jpg", "2025-07-03T10:00:00Z")]);
    await intake.pictures.settled();

    expect(names(intake)).toEqual(["hill.jpg", "lake.jpg"]);
    expect(toaster.current).toBeNull();
  });

  it("ends the undo on endRemovals, such as on leaving the step", async () => {
    const { intake, idOf, toaster } = await intakeWithTwo();
    intake.removePicture(idOf("beach.jpg"));

    intake.endRemovals();

    expect(names(intake)).toEqual(["hill.jpg"]);
    expect(toaster.current).toBeNull();
  });

  it("ends the undo when the selection is discarded", async () => {
    const { intake, idOf, toaster } = await intakeWithTwo();
    intake.removePicture(idOf("beach.jpg"));

    await intake.discard();

    expect(names(intake)).toEqual([]);
    expect(toaster.current).toBeNull();
  });
});
