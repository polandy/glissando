import { describe, expect, it } from "vitest";
import { withLibavLicense } from "./libav-license";

describe("withLibavLicense, the decoder's licence in the shipped licences file (ADR-0020)", () => {
  it("adds libav.js with FFmpeg, its LGPL and its source after the bundled dependencies", () => {
    const listed = withLibavLicense(
      "# Licenses\n\n## mediabunny - 1.61.3 (MPL-2.0)\n\nMPL text\n",
      "LGPL text",
    );

    expect(listed).toContain("## mediabunny - 1.61.3 (MPL-2.0)\n\nMPL text\n");
    expect(listed.indexOf("mediabunny")).toBeLessThan(listed.indexOf("libav.js"));
    expect(listed).toContain("## libav.js with FFmpeg - 6.10.9.0 (LGPL-2.1)");
    expect(listed).toContain("https://github.com/Yahweasel/libav.js/tree/v6.10.9.0");
    expect(listed).toContain("scripts/build-audio-decoder.sh");
    expect(listed.trimEnd().endsWith("LGPL text")).toBe(true);
  });
});
