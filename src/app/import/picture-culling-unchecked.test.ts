import { describe, expect, it } from "vitest";
import { PictureCheckerGoneError } from "../../culling/picture-checker";
import { pictureFile } from "../testing/picture-intake-ports";
import {
  at,
  intakeWith,
  names,
  sharpness,
  SIMILAR_SHOTS,
  similarShotFiles,
} from "../testing/picture-culling-fixtures";

describe("PictureIntake, culling pictures that cannot be checked and later batches", () => {
  it("leaves a picture the check cannot measure in, and logs why", async () => {
    const { intake, logged } = intakeWith({ "a.jpg": sharpness(5), "b.jpg": sharpness(900) }, [
      "a.jpg",
    ]);

    intake.addPictures([pictureFile("a.jpg", at(0)), pictureFile("b.jpg", at(1))]);
    await intake.settled();

    expect(names(intake)).toEqual(["a.jpg", "b.jpg"]);
    expect(logged).toHaveLength(1);
  });

  it("forgets the check on discard, a measurement still in flight too", async () => {
    const { intake, checker } = intakeWith(SIMILAR_SHOTS);
    checker.hold();
    intake.addPictures(similarShotFiles());
    await intake.pictures.settled();

    const discarded = intake.discard();
    checker.release();
    await discarded;
    await intake.settled();

    expect(intake.culling.state).toEqual({ checking: null, groups: [], setAsideCount: 0 });
    expect(intake.pictures.state.pictures).toEqual([]);
  });

  it("ends the check when the cull fails, reporting the error and leaving every picture in", async () => {
    const { intake, errors } = intakeWith(SIMILAR_SHOTS);

    intake.addPictures([pictureFile("a.jpg", at(10)), pictureFile("b.jpg", "not a date")]);
    await intake.settled();

    expect(names(intake)).toEqual(["a.jpg", "b.jpg"]);
    expect(intake.culling.state.checking).toBeNull();
    expect(errors).toEqual([
      expect.objectContaining({ message: expect.stringMatching(/not a date/) }),
    ]);
  });

  it("leaves the pictures in unchecked once the checker is gone, logging that once", async () => {
    const { intake, checker, logged } = intakeWith(SIMILAR_SHOTS);
    intake.addPictures([pictureFile("first.jpg", at(0))]);
    await intake.settled();

    checker.goAway();
    intake.addPictures(similarShotFiles());
    await intake.settled();

    expect(names(intake)).toEqual(["first.jpg", "a.jpg", "b.jpg", "c.jpg", "later.jpg"]);
    expect(intake.culling.state).toEqual({ checking: null, groups: [], setAsideCount: 0 });
    expect(logged).toEqual([expect.any(PictureCheckerGoneError)]);
  });

  it("returns a set-aside picture to the strip when a later batch's cull no longer sets it aside", async () => {
    const dim = sharpness(10);
    const { intake } = intakeWith({
      "x.jpg": sharpness(900, 1n),
      "soft.jpg": sharpness(5),
      "y.jpg": sharpness(900, 2n),
      "dim-1.jpg": dim,
      "dim-2.jpg": dim,
      "dim-3.jpg": dim,
      "dim-4.jpg": dim,
    });
    intake.addPictures([
      pictureFile("x.jpg", at(0)),
      pictureFile("soft.jpg", at(600)),
      pictureFile("y.jpg", at(1200)),
    ]);
    await intake.settled();
    expect(names(intake)).toEqual(["x.jpg", "y.jpg"]);

    // Shot in dim light: the median drops so far that soft.jpg is no longer blurry.
    intake.addPictures(
      ["dim-1.jpg", "dim-2.jpg", "dim-3.jpg", "dim-4.jpg"].map((name, index) =>
        pictureFile(name, at(1800 + 600 * index)),
      ),
    );
    await intake.settled();

    expect(names(intake)).toEqual([
      "x.jpg",
      "soft.jpg",
      "y.jpg",
      "dim-1.jpg",
      "dim-2.jpg",
      "dim-3.jpg",
      "dim-4.jpg",
    ]);
    expect(intake.culling.state).toMatchObject({ groups: [], setAsideCount: 0 });
  });

  it("takes a set-aside picture in while a new batch is still being checked", async () => {
    const { intake, checker } = intakeWith({ ...SIMILAR_SHOTS, "d.jpg": sharpness(300) });
    intake.addPictures(similarShotFiles());
    await intake.settled();
    const setAsideC = intake.culling.state.groups[0]?.pictures[1];
    checker.hold();
    intake.addPictures([pictureFile("d.jpg", at(13))]);
    await intake.pictures.settled();

    intake.culling.takeIn(setAsideC?.id ?? "");
    expect(intake.culling.state.checking).toEqual({ checked: 0, total: 1 });
    checker.release();
    await intake.settled();

    expect(names(intake)).toEqual(["b.jpg", "c.jpg", "later.jpg"]);
    expect(intake.culling.state.groups[0]?.pictures.map(({ fileName }) => fileName)).toEqual([
      "a.jpg",
      "d.jpg",
    ]);
  });

  it("takes every set-aside picture in while a new batch is still downscaling", async () => {
    const { intake } = intakeWith({ ...SIMILAR_SHOTS, "d.jpg": sharpness(300) });
    intake.addPictures(similarShotFiles());
    await intake.settled();

    intake.addPictures([pictureFile("d.jpg", at(13))]);
    expect(intake.pictures.state.busy).toBe(true);
    intake.culling.takeAllIn();
    await intake.settled();

    expect(names(intake)).toEqual(["a.jpg", "b.jpg", "c.jpg", "later.jpg"]);
    expect(intake.culling.state.groups).toEqual([
      {
        kind: "similar",
        keptId: intake.pictures.state.pictures[1]?.id,
        pictures: [expect.objectContaining({ fileName: "d.jpg" })],
      },
    ]);
  });
});
