import { describe, expect, it } from "vitest";
import { GLISSANDO_FORMAT_VERSION, manifestFor } from "./glissando-manifest";
import { readManifest } from "./read-manifest";
import type { StoredCard, StoredSlideshow } from "../library/stored-slideshow";

const OPENING: StoredCard = {
  title: "Herbst in Wien",
  subtitle: "2025",
  style: "modern",
  position: "centre",
  entrance: "rise",
  background: { kind: "picture", pictureId: "p2", fade: 60, tint: "picture" },
  motion: true,
};
const CLOSING: StoredCard = {
  title: "",
  style: "modern",
  position: "centre",
  entrance: "rise",
  background: { kind: "colour", colour: "night" },
  motion: false,
};

const SHOW: StoredSlideshow = {
  id: "show-1",
  title: "Herbst in Wien",
  createdAt: "2025-10-01T08:00:00.000Z",
  pictures: [
    {
      id: "p1",
      capturedAt: "2025-09-30T10:00:00Z",
      width: 30,
      height: 40,
      fileName: "a.jpg",
      colours: { veil: "#404040", accent: "#C0C0C0" },
    },
    {
      id: "p2",
      capturedAt: "2025-09-30T11:00:00Z",
      width: 30,
      height: 40,
      fileName: "b.jpg",
      colours: { veil: "#404040", accent: "#C0C0C0" },
    },
  ],
  songs: [],
  secondsPerPicture: 5,
  openingCard: OPENING,
  closingCard: CLOSING,
};

const JPEG = { display: "image/jpeg", thumbnail: "image/jpeg" };
const manifest = () => manifestFor(SHOW, [JPEG, JPEG]);

describe("openingCard and closingCard in the .glissando file (ADR-0032)", () => {
  it("writes from the version that carries them, naming the picture by its index", () => {
    expect(manifest().formatVersion).toBe(GLISSANDO_FORMAT_VERSION);
    expect(manifest().slideshow.openingCard).toEqual({
      title: "Herbst in Wien",
      subtitle: "2025",
      style: "modern",
      position: "centre",
      entrance: "rise",
      background: { kind: "picture", pictureIndex: 1, fade: 60, tint: "picture" },
      motion: true,
    });
    expect(manifest().slideshow.closingCard).toEqual(CLOSING);
  });

  it("keeps a picture background's light or dark tint through a round trip", () => {
    const withTints: StoredSlideshow = {
      ...SHOW,
      openingCard: {
        ...OPENING,
        background: { kind: "picture", pictureId: "p1", fade: 60, tint: "light" },
      },
      closingCard: {
        ...CLOSING,
        background: { kind: "picture", pictureId: "p2", fade: 40, tint: "dark" },
      },
    };
    const written = manifestFor(withTints, [JPEG, JPEG]);
    expect(written.slideshow.openingCard?.background).toEqual({
      kind: "picture",
      pictureIndex: 0,
      fade: 60,
      tint: "light",
    });
    expect(written.slideshow.closingCard?.background).toEqual({
      kind: "picture",
      pictureIndex: 1,
      fade: 40,
      tint: "dark",
    });
    expect(readManifest(JSON.stringify(written))).toEqual({ kind: "ok", manifest: written });
  });

  it("is absent while the slideshow has neither card", () => {
    const noCards: StoredSlideshow = {
      id: SHOW.id,
      title: SHOW.title,
      createdAt: SHOW.createdAt,
      pictures: SHOW.pictures,
      songs: SHOW.songs,
      secondsPerPicture: SHOW.secondsPerPicture,
    };
    const written = manifestFor(noCards, [JPEG, JPEG]);
    expect(written.slideshow).not.toHaveProperty("openingCard");
    expect(written.slideshow).not.toHaveProperty("closingCard");
  });

  it("reads back as written, resolving the picture index to the right picture", () => {
    expect(readManifest(JSON.stringify(manifest()))).toEqual({ kind: "ok", manifest: manifest() });
  });

  it("refuses a pictureIndex out of range, naming the path and value", () => {
    const written = manifest();
    const text = JSON.stringify({
      ...written,
      slideshow: {
        ...written.slideshow,
        openingCard: {
          ...written.slideshow.openingCard,
          background: { kind: "picture", pictureIndex: 2, fade: 60 },
        },
      },
    });
    expect(readManifest(text)).toEqual({
      kind: "damaged",
      reason:
        "glissando.json slideshow.openingCard.background.pictureIndex: expected a whole number from 0 to 1, got 2",
    });
  });

  it("refuses a fade outside the 0-100 step-of-5 rule", () => {
    const written = manifest();
    const text = JSON.stringify({
      ...written,
      slideshow: {
        ...written.slideshow,
        openingCard: {
          ...written.slideshow.openingCard,
          background: { kind: "picture", pictureIndex: 1, fade: 7 },
        },
      },
    });
    expect(readManifest(text)).toEqual({
      kind: "damaged",
      reason:
        "glissando.json slideshow.openingCard.background.fade: expected a whole number from 0 to 100 in steps of 5, got 7",
    });
  });

  it("refuses a style outside the fixed list", () => {
    const written = manifest();
    const text = JSON.stringify({
      ...written,
      slideshow: { ...written.slideshow, closingCard: { ...CLOSING, style: "fancy" } },
    });
    expect(readManifest(text)).toEqual({
      kind: "damaged",
      reason:
        'glissando.json slideshow.closingCard.style: expected one of modern, quiet, bold, classic, got "fancy"',
    });
  });

  it("refuses an unknown key on a card", () => {
    const written = manifest();
    const text = JSON.stringify({
      ...written,
      slideshow: { ...written.slideshow, closingCard: { ...CLOSING, extra: true } },
    });
    expect(readManifest(text)).toEqual({
      kind: "damaged",
      reason:
        'glissando.json slideshow.closingCard.extra: expected one of title, subtitle, style, position, entrance, background, motion, got "extra"',
    });
  });

  it("refuses a file older than the current version, which predates the cards", () => {
    const written = manifest();
    const text = JSON.stringify({ ...written, formatVersion: 11 });
    expect(readManifest(text)).toEqual({
      kind: "damaged",
      reason: "glissando.json formatVersion: expected a whole number from 13 to 14, got 11",
    });
  });
});
