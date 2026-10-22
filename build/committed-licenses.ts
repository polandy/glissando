import type { Plugin } from "vite";
import { THIRD_PARTY_LICENSES_FILE } from "../src/app/settings/third-party-licenses.ts";

/** One third-party component that ships in the build but is not an npm dependency. */
export interface CommittedLicense {
  readonly name: string;
  readonly version: string;
  readonly licenseId: string;
  readonly sourceSentence: string;
  readonly licenseFilePath: string;
}

const GOOGLE_FONTS_WEBFONT_COMMIT = "5e8a3ba899557829a76cfdac30fa512bda91d7ca";
const GOOGLE_FONTS_BALOO2_COMMIT = "8e0cd05881f3ae5e933ba4161103005a3e841ce0";
// Kept in step with scripts/places/build.sh's own EXPECTED_SHA256.
const GEONAMES_DUMP_SHA256 = "306220b96c4dc00fd3bd7b2427290afed492a05ad5111d071644d74c79eba707";

/**
 * Every committed (non-npm) component Vite's own `build.license` cannot see, appended to its
 * npm licences list in this order: the music decoder (ADR-0020), the on-device detectors
 * (ADR-0012, ADR-0036), the self-hosted fonts (`dev-docs/BRAND.md`) and the bundled place names
 * (ADR-0043).
 */
export const COMMITTED_LICENSES: readonly CommittedLicense[] = [
  {
    name: "libav.js with FFmpeg",
    version: "6.10.9.0",
    licenseId: "LGPL-2.1",
    sourceSentence:
      "The music decoder, built from https://github.com/Yahweasel/libav.js/tree/v6.10.9.0 and\n" +
      "FFmpeg 9.0 (https://ffmpeg.org/releases/ffmpeg-9.0.tar.xz) by scripts/build-audio-decoder.sh\n" +
      "in Glissando's repository, which rebuilds it from that source.",
    licenseFilePath: "src/import/libav/LICENSE.md",
  },
  {
    name: "YOLOX-nano",
    version: "0.1.1rc0",
    licenseId: "Apache-2.0",
    sourceSentence:
      "The object detector network, committed byte for byte as src/focus/yolox-nano.bin from\n" +
      "https://github.com/Megvii-BaseDetection/YOLOX/releases/download/0.1.1rc0/yolox_nano.onnx\n" +
      "(Copyright (c) Megvii Inc.).",
    licenseFilePath: "src/focus/LICENSE-yolox.txt",
  },
  {
    name: "pico.js",
    version: "afffa50ec4134a47005f2cbf8112eaa69f65f37e",
    licenseId: "MIT",
    sourceSentence:
      "The face detector, ported to src/focus/pico.ts from\n" +
      "https://github.com/nenadmarkus/picojs/blob/afffa50ec4134a47005f2cbf8112eaa69f65f37e/pico.js\n" +
      "(Copyright (c) 2013 Nenad Markus). picojs itself ships no licence file, only a pointer to\n" +
      "its MIT readme, so this is the licence text the port's own header already carries.",
    licenseFilePath: "src/focus/LICENSE-picojs.txt",
  },
  {
    name: "pico facefinder cascade",
    version: "7d550c78b2c31a4e1dfc5bcdfe9da013297b5cc8",
    licenseId: "MIT",
    sourceSentence:
      "The face detection cascade, committed byte for byte as src/focus/facefinder.bin from\n" +
      "https://github.com/nenadmarkus/pico/blob/7d550c78b2c31a4e1dfc5bcdfe9da013297b5cc8/rnt/cascades/facefinder\n" +
      "(Copyright (c) 2013 Nenad Markus).",
    licenseFilePath: "src/focus/LICENSE-facefinder.txt",
  },
  {
    name: "Instrument Sans",
    version: "weights 400-600",
    licenseId: "OFL-1.1",
    sourceSentence:
      "Self-hosted webfont, fetched by scripts/brand/build.sh from\n" +
      `https://github.com/google/fonts/tree/${GOOGLE_FONTS_WEBFONT_COMMIT}/ofl/instrumentsans,\n` +
      "hash-verified; no request leaves the device.",
    licenseFilePath: "assets/fonts/OFL-instrument-sans.txt",
  },
  {
    name: "Bricolage Grotesque",
    version: "weight 700",
    licenseId: "OFL-1.1",
    sourceSentence:
      "Self-hosted webfont, fetched by scripts/brand/build.sh from\n" +
      `https://github.com/google/fonts/tree/${GOOGLE_FONTS_WEBFONT_COMMIT}/ofl/bricolagegrotesque,\n` +
      "hash-verified; no request leaves the device.",
    licenseFilePath: "assets/fonts/OFL-bricolage-grotesque.txt",
  },
  {
    name: "Geist Mono",
    version: "weights 400-500",
    licenseId: "OFL-1.1",
    sourceSentence:
      "Self-hosted webfont, fetched by scripts/brand/build.sh from\n" +
      `https://github.com/google/fonts/tree/${GOOGLE_FONTS_WEBFONT_COMMIT}/ofl/geistmono,\n` +
      "hash-verified; no request leaves the device.",
    licenseFilePath: "assets/fonts/OFL-geist-mono.txt",
  },
  {
    name: "Baloo 2",
    version: "weights 600-800",
    licenseId: "OFL-1.1",
    sourceSentence:
      "Self-hosted webfont, fetched by scripts/brand/build.sh from\n" +
      `https://github.com/google/fonts/tree/${GOOGLE_FONTS_BALOO2_COMMIT}/ofl/baloo2,\n` +
      "hash-verified; no request leaves the device.",
    licenseFilePath: "assets/fonts/OFL.txt",
  },
  {
    name: "Instrument Serif",
    version: "weight 400, upright and italic",
    licenseId: "OFL-1.1",
    sourceSentence:
      "Self-hosted webfont (both styles), fetched by scripts/brand/build.sh from\n" +
      `https://github.com/google/fonts/tree/${GOOGLE_FONTS_WEBFONT_COMMIT}/ofl/instrumentserif,\n` +
      "hash-verified; no request leaves the device.",
    licenseFilePath: "assets/fonts/OFL-instrument-serif.txt",
  },
  {
    name: "GeoNames cities15000 place names",
    version: GEONAMES_DUMP_SHA256,
    licenseId: "CC-BY-4.0",
    sourceSentence:
      "Trip chapters' bundled place names, compressed from the cities15000 dump at\n" +
      "https://download.geonames.org/export/dump/cities15000.zip by scripts/places/build.sh in\n" +
      "Glissando's repository (ADR-0043); GeoNames' CC BY 4.0 asks only for attribution, not for\n" +
      "embedding the licence's full text.",
    licenseFilePath: "public/places/LICENSE-geonames.txt",
  },
];

function licenseSection(entry: CommittedLicense, licenseText: string): string {
  return (
    `## ${entry.name} - ${entry.version} (${entry.licenseId})\n\n` +
    `${entry.sourceSentence}\n\n${licenseText.trim()}`
  );
}

/**
 * Appends every committed component's licence section to Vite's npm licences list, in
 * `COMMITTED_LICENSES` order. `licenseTexts` maps each entry's `licenseFilePath` to its content.
 */
export function withCommittedLicenses(
  licenses: string,
  licenseTexts: ReadonlyMap<string, string>,
): string {
  const sections = COMMITTED_LICENSES.map((entry) => {
    const text = licenseTexts.get(entry.licenseFilePath);
    if (text === undefined) {
      throw new Error(
        `No licence text given for ${entry.name} (${entry.licenseFilePath}): ` +
          "withCommittedLicenses needs an entry for every item in COMMITTED_LICENSES",
      );
    }
    return licenseSection(entry, text);
  });

  return `${licenses.trimEnd()}\n\n${sections.join("\n\n")}\n`;
}

/** Placed before the service worker plugin, so the precache sees the complete file. */
export function committedLicensesPlugin(): Plugin {
  let root = "";
  return {
    name: "glissando:committed-licenses",
    apply: "build",
    enforce: "post",
    configResolved(config) {
      root = config.root;
    },
    generateBundle: {
      order: "post",
      async handler(_options, bundle) {
        const licenses = bundle[THIRD_PARTY_LICENSES_FILE];
        if (licenses?.type !== "asset" || typeof licenses.source !== "string") {
          throw new Error(
            `${THIRD_PARTY_LICENSES_FILE} is missing: set build.license in vite.config.ts`,
          );
        }

        const licenseTexts = new Map<string, string>();
        for (const entry of COMMITTED_LICENSES) {
          let bytes: Uint8Array;
          try {
            bytes = await this.fs.readFile(`${root}/${entry.licenseFilePath}`);
          } catch (cause) {
            throw new Error(
              `Committed licence file missing for ${entry.name}: ${entry.licenseFilePath}`,
              { cause },
            );
          }
          licenseTexts.set(entry.licenseFilePath, new TextDecoder().decode(bytes));
        }

        licenses.source = withCommittedLicenses(licenses.source, licenseTexts);
      },
    },
  };
}
