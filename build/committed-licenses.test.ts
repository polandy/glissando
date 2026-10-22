import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { COMMITTED_LICENSES, withCommittedLicenses } from "./committed-licenses";

const PROJECT_ROOT = new URL("../", import.meta.url);

describe("withCommittedLicenses, the committed components' licences in the shipped licences file", () => {
  it("adds every committed component after the bundled npm dependencies, in order", () => {
    const licenseTexts = new Map(
      COMMITTED_LICENSES.map((entry) => [entry.licenseFilePath, `${entry.name} licence text`]),
    );

    const listed = withCommittedLicenses(
      "# Licenses\n\n## mediabunny - 1.61.3 (MPL-2.0)\n\nMPL text\n",
      licenseTexts,
    );

    expect(listed).toContain("## mediabunny - 1.61.3 (MPL-2.0)\n\nMPL text\n");
    let previousIndex = listed.indexOf("mediabunny");
    for (const entry of COMMITTED_LICENSES) {
      const headingIndex = listed.indexOf(
        `## ${entry.name} - ${entry.version} (${entry.licenseId})`,
      );
      expect(headingIndex).toBeGreaterThan(previousIndex);
      expect(listed).toContain(entry.sourceSentence);
      expect(listed).toContain(`${entry.name} licence text`);
      previousIndex = headingIndex;
    }
  });

  it("keeps libav.js's existing wording", () => {
    const listed = withCommittedLicenses(
      "# Licenses\n\n## mediabunny - 1.61.3 (MPL-2.0)\n\nMPL text\n",
      new Map(COMMITTED_LICENSES.map((entry) => [entry.licenseFilePath, "licence text"])),
    );

    expect(listed).toContain("## libav.js with FFmpeg - 6.10.9.0 (LGPL-2.1)");
    expect(listed).toContain("https://github.com/Yahweasel/libav.js/tree/v6.10.9.0");
    expect(listed).toContain("scripts/build-audio-decoder.sh");
  });

  it("throws when a component's licence text is missing from the given map", () => {
    expect(() => withCommittedLicenses("# Licenses\n", new Map())).toThrow(/licence text/i);
  });

  it("has every listed licence file committed in the repository", () => {
    for (const entry of COMMITTED_LICENSES) {
      expect(() =>
        readFileSync(new URL(entry.licenseFilePath, PROJECT_ROOT), "utf8"),
      ).not.toThrow();
    }
  });
});
