import { describe, expect, it } from "vitest";
import type { PictureMeasure } from "../../culling/picture-checker";
import { FakePictureChecker } from "../../culling/testing/fake-picture-checker";
import { fakeIntakePorts, pictureFile } from "../testing/picture-intake-ports";
import { PictureIntake } from "./picture-intake";

const SCENE = 0x0f0f_0f0f_0f0f_0f0fn;
const OTHER_SCENE = 0xf0f0_f0f0_0000_ffffn;
const at = (second: number) => new Date(Date.UTC(2025, 6, 2, 14, 2, second)).toISOString();
const sharpness = (value: number, hash = SCENE): PictureMeasure => ({ sharpness: value, hash });
const thumbnailOf = (name: string) => `thumbnail ${name}`;

function intakeWith(
  measures: Readonly<Record<string, PictureMeasure>>,
  unmeasurable: readonly string[] = [],
) {
  const checker = new FakePictureChecker(
    Object.fromEntries(
      Object.entries(measures).map(([name, measure]) => [thumbnailOf(name), measure]),
    ),
    unmeasurable.map(thumbnailOf),
  );
  const { ports, logged, store } = fakeIntakePorts(undefined, { checker });
  return { intake: new PictureIntake(ports), checker, logged, store };
}

const names = (intake: PictureIntake) =>
  intake.pictures.state.pictures.map(({ fileName }) => fileName);

/** A burst of three, b the sharpest, and a picture of another scene an hour later. */
const BURST = {
  "a.jpg": sharpness(240),
  "b.jpg": sharpness(455),
  "c.jpg": sharpness(120),
  "later.jpg": sharpness(400, OTHER_SCENE),
};
const burstFiles = () => [
  pictureFile("a.jpg", at(10)),
  pictureFile("b.jpg", at(11)),
  pictureFile("c.jpg", at(12)),
  pictureFile("later.jpg", at(3600)),
];

describe("PictureIntake, culling bursts and blurry pictures", () => {
  it("keeps the sharpest of a burst once every picture is checked and sets the rest aside", async () => {
    const { intake } = intakeWith(BURST);

    intake.addPictures(burstFiles());
    await intake.settled();

    expect(names(intake)).toEqual(["b.jpg", "later.jpg"]);
    const [kept] = intake.pictures.state.pictures;
    expect(intake.culling.state.groups).toEqual([
      {
        kind: "burst",
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
    const { intake, checker } = intakeWith(BURST);
    checker.hold();

    intake.addPictures(burstFiles());
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
    const { intake } = intakeWith({ ...BURST, "d.jpg": sharpness(300) });
    intake.addPictures(burstFiles());
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
    const { intake } = intakeWith(BURST);
    intake.addPictures(burstFiles());
    await intake.settled();

    intake.culling.takeAllIn();

    expect(names(intake)).toEqual(["a.jpg", "b.jpg", "c.jpg", "later.jpg"]);
    expect(intake.culling.state).toMatchObject({ groups: [], setAsideCount: 0 });
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
    const { intake, checker } = intakeWith(BURST);
    checker.hold();
    intake.addPictures(burstFiles());
    await intake.pictures.settled();

    const discarded = intake.discard();
    checker.release();
    await discarded;
    await intake.settled();

    expect(intake.culling.state).toEqual({ checking: null, groups: [], setAsideCount: 0 });
    expect(intake.pictures.state.pictures).toEqual([]);
  });
});
