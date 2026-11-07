import { afterEach, describe, expect, it } from "vitest";
import type { StoredCard } from "../../../../library/stored-slideshow";
import { FakeClock, FakeFrameScheduler } from "../../../../player/testing/fakes";
import { mountWithTranslator } from "../../../testing/mount-with-translator";
import type { PictureTile } from "../../view-models";
import CardSheet from "./CardSheet.svelte";

const CARD: StoredCard = {
  title: "Juli 2025",
  subtitle: "1.–20. Juli",
  style: "modern",
  position: "centre",
  entrance: "rise",
  background: { kind: "picture", pictureId: "a", fade: 60, tint: "picture" },
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
    colours: { veil: "#404040", accent: "#C0C0C0" },
  },
];

let destroy: (() => void) | null = null;
afterEach(() => {
  destroy?.();
  destroy = null;
});

function setUp(card: StoredCard | undefined, ensureCard: () => StoredCard = () => CARD) {
  const changes: StoredCard[] = [];
  const removes: null[] = [];
  const closes: null[] = [];
  const previewPorts = { clock: new FakeClock(), frames: new FakeFrameScheduler() };
  const mounted = mountWithTranslator(CardSheet, {
    kind: "opening",
    card,
    ensureCard,
    pictures: PICTURES,
    previewPorts,
    reducedMotion: true,
    onChange: (value: StoredCard) => changes.push(value),
    onRemove: () => removes.push(null),
    onClose: () => closes.push(null),
  });
  destroy = mounted.destroy;
  return { target: mounted.target, changes, removes, closes };
}

describe("CardSheet", () => {
  it("creates the card with defaults when opened absent", () => {
    const ensured: null[] = [];
    const { target } = setUp(undefined, () => {
      ensured.push(null);
      return CARD;
    });

    expect(ensured).toHaveLength(1);
    expect(target.querySelector<HTMLInputElement>("#card-title")?.value).toBe("Juli 2025");
  });

  it("does not call ensureCard again for an already-present card", () => {
    const ensured: null[] = [];
    setUp(CARD, () => {
      ensured.push(null);
      return CARD;
    });

    expect(ensured).toEqual([]);
  });

  it("calls onChange with the title edited, length-capped but not normalized", () => {
    const { target, changes } = setUp(CARD);

    const field = target.querySelector<HTMLInputElement>("#card-title");
    if (field !== null) {
      field.value = "Juli  am See ";
      field.dispatchEvent(new Event("input", { bubbles: true }));
    }

    expect(changes).toEqual([expect.objectContaining({ title: "Juli  am See " })]);
  });

  it("calls onChange with the picked entrance", () => {
    const { target, changes } = setUp(CARD);

    const chips = target.querySelectorAll<HTMLButtonElement>(".chip");
    const words = Array.from(chips).find((chip) => chip.textContent === "Wort für Wort");
    words?.click();

    expect(changes).toEqual([expect.objectContaining({ entrance: "words" })]);
  });

  it("calls onRemove and onClose when Remove is clicked", () => {
    const { target, removes, closes } = setUp(CARD);

    target.querySelector<HTMLButtonElement>("footer .ghost")?.click();

    expect(removes).toHaveLength(1);
    expect(closes).toHaveLength(1);
  });

  it("calls onClose on Done", () => {
    const { target, closes } = setUp(CARD);

    target.querySelector<HTMLButtonElement>("footer .primary")?.click();

    expect(closes).toHaveLength(1);
  });

  it("keeps one tab stop in the Position group and moves it with ArrowDown", () => {
    const { target, changes } = setUp(CARD);

    const radios = target.querySelectorAll<HTMLButtonElement>(
      '[aria-labelledby="card-position-title"] [role=radio]',
    );
    expect([...radios].map((radio) => radio.tabIndex)).toEqual([0, -1]);
    radios[0]?.focus();
    radios[0]?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));

    expect(changes).toEqual([expect.objectContaining({ position: "bottom-left" })]);
    expect(document.activeElement).toBe(radios[1]);
  });
});
