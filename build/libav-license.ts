import type { Plugin } from "vite";
import { THIRD_PARTY_LICENSES_FILE } from "../src/app/settings/third-party-licenses.ts";

const LIBAV_LICENSE_FILE = "src/import/libav/LICENSE.md";

/**
 * The music decoder is a committed build, not an npm dependency, so Vite's licences file misses
 * it; LGPL-2.1 asks for its notice, licence and source (ADR-0020).
 */
export function withLibavLicense(licenses: string, licenseText: string): string {
  return `${licenses.trimEnd()}

## libav.js with FFmpeg - 6.10.9.0 (LGPL-2.1)

The music decoder, built from https://github.com/Yahweasel/libav.js/tree/v6.10.9.0 and
FFmpeg 9.0 (https://ffmpeg.org/releases/ffmpeg-9.0.tar.xz) by scripts/build-audio-decoder.sh
in Glissando's repository, which rebuilds it from that source.

${licenseText.trim()}
`;
}

/** Placed before the service worker plugin, so the precache sees the complete file. */
export function libavLicensePlugin(): Plugin {
  let root = "";
  return {
    name: "glissando:libav-license",
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
        licenses.source = withLibavLicense(
          licenses.source,
          new TextDecoder().decode(await this.fs.readFile(`${root}/${LIBAV_LICENSE_FILE}`)),
        );
      },
    },
  };
}
