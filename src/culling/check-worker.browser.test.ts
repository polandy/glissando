import { afterEach, describe, expect, it } from "vitest";
import { BLURRY_SHARPNESS_FLOOR, cull, SAME_SCENE_MAX_HASH_DISTANCE } from "./cull";
import { hashDistance } from "./difference-hash";
import { PictureCheckError, type PictureMeasure } from "./picture-checker";
import { sceneThumbnail, type SceneOptions } from "./testing/generated-scenes";
import { startCheckWorker, WorkerPictureChecker } from "./worker-picture-checker";

/**
 * The calibration of the cull's constants: generated scenes, stored as 480 px JPEG thumbnails the
 * way the import stores them, measured by the real worker in every engine.
 */
const workers: Worker[] = [];
const HUES = [195, 22, 160] as const;
/** Drawn six times smaller and scaled up: clearly out of focus on a 480 px thumbnail. */
const OUT_OF_FOCUS = 6;
/** The camera drift between similar shots, 0.5 % and 1 % of the picture's width. */
const SIMILAR_SHOT_DRIFTS = [6, 12] as const;
/** Slightly soft, as one of several similar shots can be. */
const SLIGHTLY_SOFT = 2;
const TIMEOUT_MS = 60_000;

function checker(): WorkerPictureChecker {
  return new WorkerPictureChecker(() => {
    const worker = startCheckWorker();
    workers.push(worker);
    return worker;
  });
}

async function measured(
  pictureChecker: WorkerPictureChecker,
  scene: SceneOptions,
): Promise<PictureMeasure> {
  return pictureChecker.measure(await sceneThumbnail(scene));
}

afterEach(() => {
  for (const worker of workers.splice(0)) worker.terminate();
});

describe("the check worker on generated thumbnails", () => {
  it("measures every sharp scene above the blurry floor", { timeout: TIMEOUT_MS }, async () => {
    const pictureChecker = checker();
    for (const hue of HUES) {
      expect((await measured(pictureChecker, { hue })).sharpness).toBeGreaterThan(
        BLURRY_SHARPNESS_FLOOR,
      );
    }
  });

  it(
    "measures every out-of-focus scene below the blurry floor",
    { timeout: TIMEOUT_MS },
    async () => {
      const pictureChecker = checker();
      for (const hue of HUES) {
        const { sharpness } = await measured(pictureChecker, { hue, softness: OUT_OF_FOCUS });
        expect(sharpness).toBeLessThan(BLURRY_SHARPNESS_FLOOR);
      }
    },
  );

  it(
    "hashes similar shots of a scene as one scene and other scenes apart",
    { timeout: TIMEOUT_MS },
    async () => {
      const pictureChecker = checker();
      for (const hue of HUES) {
        const first = await measured(pictureChecker, { hue });
        const frames = [
          ...SIMILAR_SHOT_DRIFTS.map((drift) => ({ hue, drift })),
          { hue, softness: SLIGHTLY_SOFT },
        ];
        for (const frame of frames) {
          const { hash } = await measured(pictureChecker, frame);
          expect(hashDistance(first.hash, hash)).toBeLessThanOrEqual(SAME_SCENE_MAX_HASH_DISTANCE);
        }
        for (const other of HUES.filter((otherHue) => otherHue !== hue)) {
          const { hash } = await measured(pictureChecker, { hue: other });
          expect(hashDistance(first.hash, hash)).toBeGreaterThan(SAME_SCENE_MAX_HASH_DISTANCE);
        }
      }
    },
  );

  it(
    "keeps the sharp one of generated similar shots and sets the soft and blurry ones aside",
    { timeout: TIMEOUT_MS },
    async () => {
      const pictureChecker = checker();
      const at = (second: number) => new Date(Date.UTC(2025, 6, 2, 14, 2, second)).toISOString();
      const scenes: { id: string; second: number; scene: SceneOptions }[] = [
        { id: "soft-frame", second: 10, scene: { hue: 195, softness: SLIGHTLY_SOFT } },
        { id: "sharp-frame", second: 11, scene: { hue: 195 } },
        { id: "other-scene", second: 40, scene: { hue: 22 } },
        { id: "third-scene", second: 59, scene: { hue: 160 } },
        { id: "out-of-focus", second: 30, scene: { hue: 260, softness: OUT_OF_FOCUS } },
      ];
      const candidates = [];
      for (const { id, second, scene } of scenes) {
        candidates.push({ id, capturedAt: at(second), ...(await measured(pictureChecker, scene)) });
      }

      expect(Object.fromEntries(cull(candidates).setAside)).toEqual({
        "soft-frame": "similar",
        "out-of-focus": "blurry",
      });
    },
  );

  it(
    "rejects a thumbnail it cannot decode, and keeps working",
    { timeout: TIMEOUT_MS },
    async () => {
      const pictureChecker = checker();

      await expect(pictureChecker.measure(new Blob(["not a picture"]))).rejects.toThrow(
        PictureCheckError,
      );
      await expect(measured(pictureChecker, { hue: 22 })).resolves.toHaveProperty("sharpness");
    },
  );
});
