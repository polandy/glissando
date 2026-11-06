import { describe, expect, it } from "vitest";
import { MemoryLibraryStore } from "../library/testing/memory-store";
import { FakeMusicAnalyser } from "../library/testing/fake-music-analyser";
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
  it("starts the device's music analysis pass right away", () => {
    const { log, reportError } = noOps();
    const passes = startBackgroundMusicPasses({
      store: new MemoryLibraryStore(),
      serverStore: new MemoryLibraryStore(),
      analyser: new FakeMusicAnalyser(() => ({
        beats: { kind: "none" },
        loudness: { blockMeanSquares: new Float32Array(), hopPeaks: new Float32Array() },
      })),
      log,
      reportError,
    });

    expect(passes.analysisPass.state.running).toBe(true);
  });

  it("builds the server pass without starting it", () => {
    const { log, reportError } = noOps();
    const passes = startBackgroundMusicPasses({
      store: new MemoryLibraryStore(),
      serverStore: new MemoryLibraryStore(),
      analyser: new FakeMusicAnalyser(() => ({
        beats: { kind: "none" },
        loudness: { blockMeanSquares: new Float32Array(), hopPeaks: new Float32Array() },
      })),
      log,
      reportError,
    });

    expect(passes.serverAnalysisPass.state.running).toBe(false);
  });
});
