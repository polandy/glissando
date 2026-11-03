import { describe, expect, it } from "vitest";
import { pictureFile } from "../testing/picture-intake-ports";
import {
  at,
  intakeWith,
  names,
  sharpness,
  SIMILAR_SHOTS,
  thumbnailOf,
  similarShotFiles,
} from "../testing/picture-culling-fixtures";

describe("PictureIntake, culling similar shots and blurry pictures", () => {
  it("keeps the sharpest of similar shots once every picture is checked and sets the rest aside", async () => {
    const { intake } = intakeWith(SIMILAR_SHOTS);

    intake.addPictures(similarShotFiles());
    await intake.settled();

    expect(names(intake)).toEqual(["b.jpg", "later.jpg"]);
    const [kept] = intake.pictures.state.pictures;
    expect(intake.culling.state.groups).toEqual([
      {
        kind: "similar",
        keptId: kept?.id,
        pictures: [
          expect.objectContaining({ fileName: "a.jpg" }),
          expect.objectContaining({ fileName: "c.jpg" }),
        ],
      },
    ]);
    expect(intake.culling.state.setAsideCount).toBe(2);
  });

  it("counts the checks until they are done, setting nothing aside before", async () => {
    const { intake, checker } = intakeWith(SIMILAR_SHOTS);
    checker.hold();

    intake.addPictures(similarShotFiles());
    await intake.pictures.settled();

    expect(names(intake)).toEqual(["a.jpg", "b.jpg", "c.jpg", "later.jpg"]);
    expect(intake.culling.state.checking).toEqual({ checked: 0, total: 4 });
    checker.release();
    await intake.settled();
    expect(intake.culling.state.checking).toBeNull();
    expect(names(intake)).toEqual(["b.jpg", "later.jpg"]);
  });

  it("sets a blurry picture aside in a group of its own", async () => {
    const { intake } = intakeWith({
      "soft.jpg": sharpness(5),
      "x.jpg": sharpness(900, 1n),
      "y.jpg": sharpness(900, 2n),
    });

    intake.addPictures([
      pictureFile("x.jpg", at(0)),
      pictureFile("soft.jpg", at(600)),
      pictureFile("y.jpg", at(1200)),
    ]);
    await intake.settled();

    expect(names(intake)).toEqual(["x.jpg", "y.jpg"]);
    expect(intake.culling.state.groups).toEqual([
      { kind: "blurry", pictures: [expect.objectContaining({ fileName: "soft.jpg" })] },
    ]);
  });

  it("takes a set-aside picture in at its capture-date place, never to be set aside again", async () => {
    const { intake } = intakeWith({ ...SIMILAR_SHOTS, "d.jpg": sharpness(300) });
    intake.addPictures(similarShotFiles());
    await intake.settled();
    const setAsideC = intake.culling.state.groups[0]?.pictures[1];

    intake.culling.takeIn(setAsideC?.id ?? "");
    intake.addPictures([pictureFile("d.jpg", at(13))]);
    await intake.settled();

    expect(names(intake)).toEqual(["b.jpg", "c.jpg", "later.jpg"]);
    expect(intake.culling.state.groups[0]?.pictures.map(({ fileName }) => fileName)).toEqual([
      "a.jpg",
      "d.jpg",
    ]);
  });

  it("takes every set-aside picture in at once", async () => {
    const { intake } = intakeWith(SIMILAR_SHOTS);
    intake.addPictures(similarShotFiles());
    await intake.settled();

    intake.culling.takeAllIn();

    expect(names(intake)).toEqual(["a.jpg", "b.jpg", "c.jpg", "later.jpg"]);
    expect(intake.culling.state).toMatchObject({ groups: [], setAsideCount: 0 });
  });

  it("never sets aside a picture the user moved, exempted from culling", async () => {
    const { intake } = intakeWith(SIMILAR_SHOTS);
    intake.addPictures(similarShotFiles());
    await intake.pictures.settled();
    const exempted = intake.pictures.state.pictures.find(({ fileName }) => fileName === "a.jpg");

    intake.culling.exempt([exempted?.id ?? ""]);
    await intake.settled();

    expect(names(intake)).toEqual(["a.jpg", "b.jpg", "later.jpg"]);
    const kept = intake.pictures.state.pictures.find(({ fileName }) => fileName === "b.jpg");
    expect(intake.culling.state.groups).toEqual([
      {
        kind: "similar",
        keptId: kept?.id,
        pictures: [expect.objectContaining({ fileName: "c.jpg" })],
      },
    ]);
  });

  it("never sets aside a duplicate taken in anyway", async () => {
    const { intake, checker } = intakeWith({});
    intake.addPictures([pictureFile("a.jpg", at(0))]);
    intake.addPictures([pictureFile("a.jpg", at(0))]);
    await intake.settled();

    intake.addDuplicates("chosenTwice");
    await intake.settled();

    expect(names(intake)).toEqual(["a.jpg", "a.jpg"]);
    expect(checker.asked).toEqual([thumbnailOf("a.jpg")]);
  });
});
