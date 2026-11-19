import { describe, expect, it } from "vitest";
import { summarizeFrameWork, type FrameWork } from "./frame-work.ts";

const idle = { draws: 1, programs: 1, framebuffers: 0, textureDeletes: 0 };
const frame = (t: number, work: Partial<FrameWork> = {}): FrameWork => ({ t, ...idle, ...work });

describe("summarizeFrameWork", () => {
  it("names the work of the frame drawn right before each dropped-frame gap", () => {
    const work = [
      frame(1000),
      frame(1017, { draws: 3, textureDeletes: 2 }),
      frame(1082),
      frame(1099),
    ];

    const summary = summarizeFrameWork({
      work,
      gpu: [{ t: 1017, ms: 12.5 }],
      pictureStarts: [],
      playStart: 0,
    });

    expect(summary.rafGapsOver33ms).toBe(1);
    expect(summary.droppedFrameWork).toEqual([
      {
        at: 1,
        ms: 65,
        draws: 3,
        programs: 1,
        framebuffers: 0,
        textureDeletes: 2,
        gpuMs: 12.5,
      },
    ]);
  });

  it("counts a gap as near a picture start only within the window around one", () => {
    const work = [frame(0), frame(50), frame(100), frame(2000), frame(2050)];

    const summary = summarizeFrameWork({ work, gpu: [], pictureStarts: [400], playStart: 0 });

    expect(summary.rafGapsOver33ms).toBe(4);
    expect(summary.rafGapsOver33msNearPictureStart).toBe(2);
  });

  it("reports the most work any one frame did and every texture deleted", () => {
    const work = [
      frame(0, { draws: 3, programs: 2, framebuffers: 4 }),
      frame(16, { textureDeletes: 2 }),
      frame(32, { textureDeletes: 1 }),
      frame(48),
    ];

    const summary = summarizeFrameWork({ work, gpu: [], pictureStarts: [], playStart: 0 });

    expect(summary).toMatchObject({
      maxDrawsPerFrame: 3,
      maxProgramsPerFrame: 2,
      maxFramebuffersPerFrame: 4,
      textureDeletes: 3,
      framesWithTextureDelete: 2,
    });
  });

  it("reports the GPU time percentiles of the frames it could time", () => {
    const work = Array.from({ length: 100 }, (_, i) => frame(i * 16));
    const gpu = work.map((w, i) => ({ t: w.t, ms: i + 1 }));

    const summary = summarizeFrameWork({ work, gpu, pictureStarts: [], playStart: 0 });

    expect(summary).toMatchObject({ gpuFrames: 100, gpuMsP50: 51, gpuMsP99: 100, gpuMsMax: 100 });
  });

  it("leaves the GPU time empty where the browser has no timer query", () => {
    const work = [frame(0), frame(16)];

    const summary = summarizeFrameWork({ work, gpu: [], pictureStarts: [], playStart: 0 });

    expect(summary).toMatchObject({ gpuFrames: 0, gpuMsP50: null, gpuMsMax: null });
  });

  it("leaves out what happened before the show started", () => {
    const work = [frame(0, { draws: 9, textureDeletes: 5 }), frame(100), frame(116), frame(132)];

    const summary = summarizeFrameWork({ work, gpu: [], pictureStarts: [], playStart: 100 });

    expect(summary).toMatchObject({ rafGapsOver33ms: 0, maxDrawsPerFrame: 1, textureDeletes: 0 });
  });
});
