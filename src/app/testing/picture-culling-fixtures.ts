import type { PictureMeasure } from "../../culling/picture-checker";
import { FakePictureChecker } from "../../culling/testing/fake-picture-checker";
import { fakeIntakePorts, pictureFile } from "./picture-intake-ports";
import { PictureIntake } from "../import/picture-intake";

const SCENE = 0x0f0f_0f0f_0f0f_0f0fn;
const OTHER_SCENE = 0xf0f0_f0f0_0000_ffffn;
export const at = (second: number) => new Date(Date.UTC(2025, 6, 2, 14, 2, second)).toISOString();
export const sharpness = (value: number, hash = SCENE): PictureMeasure => ({
  sharpness: value,
  hash,
});
export const thumbnailOf = (name: string) => `thumbnail ${name}`;

export function intakeWith(
  measures: Readonly<Record<string, PictureMeasure>>,
  unmeasurable: readonly string[] = [],
) {
  const checker = new FakePictureChecker(
    Object.fromEntries(
      Object.entries(measures).map(([name, measure]) => [thumbnailOf(name), measure]),
    ),
    unmeasurable.map(thumbnailOf),
  );
  const { ports, logged, errors, store } = fakeIntakePorts(undefined, { checker });
  return { intake: new PictureIntake(ports), checker, logged, errors, store };
}

export const names = (intake: PictureIntake) =>
  intake.pictures.state.pictures.map(({ fileName }) => fileName);

/** Similar shots, three of them, b the sharpest, and a picture of another scene an hour later. */
export const SIMILAR_SHOTS = {
  "a.jpg": sharpness(240),
  "b.jpg": sharpness(455),
  "c.jpg": sharpness(120),
  "later.jpg": sharpness(400, OTHER_SCENE),
};
export const similarShotFiles = () => [
  pictureFile("a.jpg", at(10)),
  pictureFile("b.jpg", at(11)),
  pictureFile("c.jpg", at(12)),
  pictureFile("later.jpg", at(3600)),
];
