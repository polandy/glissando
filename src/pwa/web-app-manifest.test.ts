import { describe, expect, it } from "vitest";
import manifestText from "../../public/manifest.webmanifest?raw";
import { GLISSANDO_FILE_EXTENSION } from "../glissando-file/export-slideshow";

const manifest = JSON.parse(manifestText) as {
  icons: { src: string }[];
  file_handlers?: { action: string; accept: Record<string, string[]>; icons: { src: string }[] }[];
  launch_handler?: { client_mode: string };
};

describe("web app manifest", () => {
  it("offers the installed app for .glissando files, opened on the start page", () => {
    expect(manifest.file_handlers).toEqual([
      expect.objectContaining({
        action: ".",
        accept: { "application/x-glissando": [GLISSANDO_FILE_EXTENSION] },
      }),
    ]);
  });

  it("shows a .glissando file with the app's own icon", () => {
    const appIcons = manifest.icons.map((icon) => icon.src);
    const fileIcons = manifest.file_handlers?.[0]?.icons.map((icon) => icon.src) ?? [];

    expect(fileIcons.length).toBeGreaterThan(0);
    expect(appIcons).toEqual(expect.arrayContaining(fileIcons));
  });

  it("opens each launched file in a new window, leaving a running one as it is", () => {
    expect(manifest.launch_handler).toEqual({ client_mode: "navigate-new" });
  });
});
