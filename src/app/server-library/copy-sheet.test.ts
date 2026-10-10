import { describe, expect, it } from "vitest";
import type { StoredPicture, StoredSlideshow } from "../../library/stored-slideshow";
import { createTranslator } from "../i18n/translator";
import { keepCopySheet, saveOnServerSheet } from "./copy-sheet";

const t = createTranslator("en");
const MB = 1_000_000;

const picture = (id: string, immichAssetId?: string): StoredPicture => ({
  id,
  capturedAt: "2025-07-01T10:00:00Z",
  width: 3,
  height: 2,
  fileName: `${id}.jpg`,
  ...(immichAssetId === undefined ? {} : { immichAssetId }),
});

const MUSIC = { id: "m", fileName: "song.mp3", durationMs: 1000, mimeType: "audio/mpeg" };

const slideshow = (pictures: StoredPicture[], withMusic = true): StoredSlideshow => ({
  id: "show",
  title: "July",
  createdAt: "2025-07-02T08:00:00Z",
  pictures,
  secondsPerPicture: 5,
  ...(withMusic ? { music: MUSIC } : {}),
});

describe("the sheet confirming “Keep a copy on this device”", () => {
  it("counts the pictures to download and names the music", () => {
    expect(keepCopySheet(t, slideshow([picture("a", "x"), picture("b", "y")]))).toEqual({
      title: "Keep a copy on this device?",
      message: [
        "Downloads 2 pictures from Immich and the music. The copy plays offline and appears under “On this device”.",
        "Later edits to either one stay in that one.",
      ],
      fileNames: [],
      closing: null,
      confirm: "Download and keep",
    });
  });

  it("leaves the music out of a slideshow without music", () => {
    expect(keepCopySheet(t, slideshow([picture("a", "x")], false)).message[0]).toBe(
      "Downloads 1 picture from Immich. The copy plays offline and appears under “On this device”.",
    );
  });
});

describe("the sheet confirming “Save on the server”", () => {
  it("asks to save a slideshow of Immich photos only, with the music's size", () => {
    const shown = slideshow([picture("a", "x"), picture("b", "y")]);

    expect(saveOnServerSheet(t, shown, 3 * MB)).toEqual({
      title: "Save on the server?",
      message: [
        "Every device that opens this Glissando can then play and edit it. Its 2 pictures stay in Immich and are linked, not uploaded. The music (3 MB) is stored on the server.",
        "The slideshow on this device stays as it is. The two copies are independent.",
      ],
      fileNames: [],
      closing: null,
      confirm: "Save on the server",
    });
  });

  it("says nothing of music a slideshow does not have", () => {
    const shown = slideshow([picture("a", "x")], false);

    expect(saveOnServerSheet(t, shown, null).message[0]).toBe(
      "Every device that opens this Glissando can then play and edit it. Its one picture stays in Immich and is linked, not uploaded.",
    );
  });

  it("lists the pictures only on this device and offers to save without them", () => {
    const shown = slideshow([picture("a", "x"), picture("IMG_1"), picture("IMG_2")]);

    expect(saveOnServerSheet(t, shown, 3 * MB)).toEqual({
      title: "2 pictures are only on this device",
      message: [
        "A server slideshow links photos from Immich and stores no pictures itself. These came from this device:",
      ],
      fileNames: ["IMG_1.jpg", "IMG_2.jpg"],
      closing: "Upload them to Immich and add them from there, or save the slideshow without them.",
      confirm: "Save without these 2",
    });
  });

  it("offers no saving when no picture is from Immich, as a server slideshow needs one", () => {
    const shown = slideshow([picture("IMG_1")]);

    expect(saveOnServerSheet(t, shown, null).confirm).toBeNull();
  });
});
