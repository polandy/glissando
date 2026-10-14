import { afterEach, describe, expect, it, vi } from "vitest";
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

function setUp(card: StoredCard | undefined, ensureCard: () => StoredCard = () => CARD) {
  const onChange = vi.fn();
  const onRemove = vi.fn();
  const onClose = vi.fn();
  const previewPorts = { clock: new FakeClock(), frames: new FakeFrameScheduler() };
  const mounted = mountWithTranslator(CardSheet, {
    kind: "opening",
    card,
    ensureCard,
    pictures: PICTURES,
    previewPorts,
    reducedMotion: true,
    onChange,
    onRemove,
    onClose,
  });
  destroy = mounted.destroy;
  return { target: mounted.target, onChange, onRemove, onClose };
}

describe("CardSheet", () => {
  it("creates the card with defaults when opened absent", () => {
    const ensureCard = vi.fn(() => CARD);
    const { target } = setUp(undefined, ensureCard);

    expect(ensureCard).toHaveBeenCalledOnce();
    expect(target.querySelector<HTMLInputElement>("#card-title")?.value).toBe("Juli 2025");
  });

  it("does not call ensureCard again for an already-present card", () => {
    const ensureCard = vi.fn(() => CARD);
    setUp(CARD, ensureCard);

    expect(ensureCard).not.toHaveBeenCalled();
  });

  it("calls onChange with the title edited, length-capped but not normalized", () => {
    const { target, onChange } = setUp(CARD);

    const field = target.querySelector<HTMLInputElement>("#card-title");
    if (field !== null) {
      field.value = "Juli  am See ";
      field.dispatchEvent(new Event("input", { bubbles: true }));
    }

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ title: "Juli  am See " }));
  });

  it("calls onRemove and onClose when Remove is clicked", () => {
    const { target, onRemove, onClose } = setUp(CARD);

    target.querySelector<HTMLButtonElement>("footer .ghost")?.click();

    expect(onRemove).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose on Done", () => {
    const { target, onClose } = setUp(CARD);

    target.querySelector<HTMLButtonElement>("footer .primary")?.click();

    expect(onClose).toHaveBeenCalledOnce();
  });
});
