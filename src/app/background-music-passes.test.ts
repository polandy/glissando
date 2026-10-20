import { describe, expect, it } from "vitest";
import { MemoryLibraryStore } from "../library/testing/memory-store";
import { FakeBeatDetector } from "../library/testing/fake-beat-detector";
import { FakeLoudnessMeter } from "../library/testing/fake-loudness-meter";
import { startBackgroundMusicPasses } from "./background-music-passes";

function noOps() {
  const logged: unknown[] = [];
  const reported: unknown[] = [];
  return {
    log: (e: unknown) => logged.push(e),
    reportError: (e: unknown) => reported.push(e),
    logged,
    reported,
  };
}

describe("startBackgroundMusicPasses", () => {
  it("starts the device's beat and loudness passes right away", () => {
    const { log, reportError } = noOps();
    const passes = startBackgroundMusicPasses({
      store: new MemoryLibraryStore(),
      serverStore: new MemoryLibraryStore(),
      beatDetector: new FakeBeatDetector(() => ({ kind: "none" })),
      loudnessMeter: new FakeLoudnessMeter(() => ({
        blockMeanSquares: new Float32Array(),
        hopPeaks: new Float32Array(),
      })),
      log,
      reportError,
    });

    expect(passes.beatPass.state.running).toBe(true);
    expect(passes.loudnessPass.state.running).toBe(true);
  });

  it("builds the server passes without starting them", () => {
    const { log, reportError } = noOps();
    const passes = startBackgroundMusicPasses({
      store: new MemoryLibraryStore(),
      serverStore: new MemoryLibraryStore(),
      beatDetector: new FakeBeatDetector(() => ({ kind: "none" })),
      loudnessMeter: new FakeLoudnessMeter(() => ({
        blockMeanSquares: new Float32Array(),
        hopPeaks: new Float32Array(),
      })),
      log,
      reportError,
    });

    expect(passes.serverBeatPass.state.running).toBe(false);
    expect(passes.serverLoudnessPass.state.running).toBe(false);
  });
});
