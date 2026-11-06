import { ALL_FORMATS, BlobSource, EncodedPacketSink, Input } from "mediabunny";
import { describe, expect, it } from "vitest";
import { server } from "vitest/browser";
import {
  exportFileName,
  privateExportTarget,
  probeVideoExport,
  runVideoExport,
  type ExportProgress,
  type PrivateExportStorage,
} from "..";
import { generatedPicture, generatedTone, GENERATED_SLIDESHOW } from "../testing/generated-media";
import { memoryExportTarget } from "../testing/memory-target";
import { PRIVATE_EXPORT_FOLDER } from "./file-targets";

/** Two 1.5 s slides: 90 frames at 30 per second. */
const EXPECTED_FRAMES = 90;
/**
 * A ceiling, not a wait: a real software encode of 90 frames on a shared CI runner takes up to
 * about 20 s, past vitest's default of 15 s.
 */
const REAL_EXPORT_CEILING_MS = 60_000;

/** Runs the export of `GENERATED_SLIDESHOW` at 720p into a fresh target. */
async function exportGenerated(
  signal: AbortSignal,
  onProgress: (progress: ExportProgress) => void,
) {
  const capabilities = await probeVideoExport({ withAudio: true });
  if (!capabilities.supported) {
    throw new Error(`this engine cannot export: ${capabilities.reason}`);
  }
  const pictures = new Map([
    ["first", await generatedPicture("#c0392b", "1")],
    ["second", await generatedPicture("#2471a3", "2")],
  ]);
  const fileName = exportFileName("Generated", "720p");
  // WebKit under Playwright has no origin private file system; the others write to it.
  const target =
    server.browser === "webkit"
      ? memoryExportTarget(fileName)
      : await privateExportTarget(browserStorage(), fileName);
  const result = await runVideoExport({
    slideshow: GENERATED_SLIDESHOW,
    openPicture: (src) => {
      const picture = pictures.get(src);
      return picture === undefined
        ? Promise.reject(new Error(`no generated picture ${src}`))
        : Promise.resolve(picture);
    },
    openMusic: (src) =>
      src === "tone" ? Promise.resolve(generatedTone()) : Promise.reject(new Error(src)),
    preset: "720p",
    audioCodec: capabilities.audioCodec,
    target,
    signal,
    onProgress,
  });
  return { result, target, capabilities };
}

/** Runs across the file never share an id, so a run left locked cannot stall the next. */
let runs = 0;

/** The real origin private file system and locks; a counter names the runs. */
function browserStorage(): PrivateExportStorage {
  return {
    root: () => navigator.storage.getDirectory(),
    locks: navigator.locks,
    newId: () => `run-video-export-${(runs += 1)}`,
  };
}

async function privateExportNames(): Promise<string[]> {
  const root = await navigator.storage.getDirectory();
  const folder = await root.getDirectoryHandle(PRIVATE_EXPORT_FOLDER, { create: true });
  const names: string[] = [];
  for await (const name of folder.keys()) {
    names.push(name);
  }
  return names;
}

describe("runVideoExport", () => {
  it(
    "writes a 720p MP4 with every frame and the music track the browser can encode",
    async () => {
      const progress: ExportProgress[] = [];

      const { result, target, capabilities } = await exportGenerated(
        new AbortController().signal,
        (update) => progress.push(update),
      );

      if (result.kind !== "done") {
        throw new Error(`the export ended ${result.kind}`, {
          cause: result.kind === "failed" ? result.error : result,
        });
      }
      expect(progress.at(-1)).toMatchObject({
        framesDone: EXPECTED_FRAMES,
        framesTotal: EXPECTED_FRAMES,
      });
      const input = new Input({ source: new BlobSource(result.file), formats: ALL_FORMATS });
      const video = await input.getPrimaryVideoTrack();
      const audio = await input.getPrimaryAudioTrack();
      expect(video?.codec).toBe("avc");
      expect([video?.displayWidth, video?.displayHeight]).toEqual([1280, 720]);
      if (video === null) {
        throw new Error("the file has no video track");
      }
      const sink = new EncodedPacketSink(video);
      let packets = 0;
      for (let packet = await sink.getFirstPacket(); packet !== null;) {
        packets += 1;
        packet = await sink.getNextPacket(packet);
      }
      expect(packets).toBe(EXPECTED_FRAMES);
      expect(audio?.codec).toBe(capabilities.audioCodec);
      expect(await input.computeDuration()).toBeCloseTo(3, 1);
      input.dispose();
      await target.discard();
    },
    REAL_EXPORT_CEILING_MS,
  );

  it(
    "stops at once on abort and leaves no file behind",
    async () => {
      const controller = new AbortController();
      const progress: ExportProgress[] = [];

      const { result } = await exportGenerated(controller.signal, (update) => {
        progress.push(update);
        if (update.framesDone === 10) {
          controller.abort();
        }
      });

      expect(result).toEqual({ kind: "cancelled" });
      expect(progress.at(-1)?.framesDone).toBe(10);
      if (server.browser !== "webkit") {
        expect(await privateExportNames()).toEqual([]);
      }
    },
    REAL_EXPORT_CEILING_MS,
  );
});
