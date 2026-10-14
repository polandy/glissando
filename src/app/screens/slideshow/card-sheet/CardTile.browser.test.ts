import { flushSync } from "svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { StoredCard } from "../../../../library/stored-slideshow";
import { mountWithTranslator } from "../../../testing/mount-with-translator";
import type { PictureTile } from "../../view-models";
import CardTile from "./CardTile.svelte";

const CARD: StoredCard = {
  title: "Juli 2025",
  style: "modern",
  position: "centre",
  background: { kind: "picture", pictureId: "a", fade: 60 },
  motion: true,
};

const PICTURES: PictureTile[] = [
  {
    id: "a",
    thumbnailUrl: "a.jpg",
    capturedAt: "2025-07-01T10:00:00Z",
    ownMotion: false,
    ownDurationMs: null,
    ownTransition: null,
    pairedWithNumber: null,
    blurredFill: false,
    alone: false,
  },
];

let destroy: (() => void) | null = null;
afterEach(() => {
  destroy?.();
  destroy = null;
});

function setUp(card: StoredCard | undefined) {
  const onOpen = vi.fn();
  const mounted = mountWithTranslator(CardTile, {
    card,
    pictures: PICTURES,
    label: "Title slide",
    onOpen,
  });
  destroy = mounted.destroy;
  return { target: mounted.target, onOpen };
}

describe("CardTile", () => {
  it("shows a dashed placeholder with a + icon when the card is absent", () => {
    const { target } = setUp(undefined);

    const button = target.querySelector(".card-tile");
    expect(button?.classList.contains("empty")).toBe(true);
    expect(target.querySelector("svg")).not.toBeNull();
    expect(target.querySelector("[data-testid='card-face']")).toBeNull();
  });

  it("shows a dashed placeholder when the card's title is empty", () => {
    const { target } = setUp({ ...CARD, title: "" });

    expect(target.querySelector(".card-tile")?.classList.contains("empty")).toBe(true);
  });

  it("shows a still of the card when it has a title", async () => {
    const { target } = setUp(CARD);
    flushSync();
    await new Promise((resolve) => setTimeout(resolve, 50));
    flushSync();

    expect(target.querySelector(".card-tile")?.classList.contains("empty")).toBe(false);
    expect(target.querySelector("[data-testid='card-face']")).not.toBeNull();
  });

  it("calls onOpen when tapped", () => {
    const { target, onOpen } = setUp(undefined);

    target.querySelector<HTMLButtonElement>(".card-tile")?.click();

    expect(onOpen).toHaveBeenCalledOnce();
  });

  it("carries neither the .pick class nor data-picture-id, so the strip's hit-testing skips it", () => {
    const { target } = setUp(CARD);

    expect(target.querySelector(".pick")).toBeNull();
    expect(target.querySelector("[data-picture-id]")).toBeNull();
  });
});
