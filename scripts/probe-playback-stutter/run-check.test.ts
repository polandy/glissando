import { describe, expect, it } from "vitest";
import { showRunWarnings, softwareRendererReason } from "./run-check.ts";

describe("softwareRendererReason", () => {
  it.each([
    "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)",
    "llvmpipe (LLVM 19.1.7, 256 bits)",
    "lavapipe",
  ])("names %s a software renderer", (renderer) => {
    expect(softwareRendererReason(renderer)).toContain("software");
  });

  it("names a missing WebGL2 context, which draws with the DOM fallback", () => {
    expect(softwareRendererReason(null)).toContain("DOM fallback");
  });

  it("accepts a real GPU", () => {
    expect(
      softwareRendererReason(
        "ANGLE (AMD, AMD Radeon Graphics (radeonsi raphael_mendocino), OpenGL ES 3.2)",
      ),
    ).toBeNull();
  });
});

describe("showRunWarnings", () => {
  it("warns when no picture started and the music never played after play", () => {
    expect(showRunWarnings({ pictureStartsAfterPlay: 0, musicPlaying: 0 })).toHaveLength(2);
  });

  it("has nothing to say about a show that ran", () => {
    expect(showRunWarnings({ pictureStartsAfterPlay: 4, musicPlaying: 1 })).toEqual([]);
  });
});
