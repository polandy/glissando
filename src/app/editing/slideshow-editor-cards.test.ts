import { describe, expect, it } from "vitest";
import { setUp } from "./editor-test-harness";

describe("SlideshowEditor's title slide and closing slide (ADR-0032, TITLE_SLIDES.md)", () => {
  it("creates and stores the opening card's defaults the first time it is opened", async () => {
    const { editor, store } = await setUp(["a", "b"]);

    const card = editor.ensureOpeningCard();
    await editor.settled();

    expect(card.background).toEqual({ kind: "picture", pictureId: "a", fade: 60 });
    expect((await store.getSlideshow("show")).openingCard).toEqual(card);
  });

  it("returns the opening card already stored instead of making new defaults", async () => {
    const { editor, store } = await setUp(["a", "b"]);
    const first = editor.ensureOpeningCard();
    await editor.settled();

    const second = editor.ensureOpeningCard();
    await editor.settled();

    expect(second).toEqual(first);
    expect((await store.getSlideshow("show")).openingCard).toEqual(first);
  });

  it("stores a change to the opening card at once", async () => {
    const { editor, store } = await setUp(["a", "b"]);
    const card = editor.ensureOpeningCard();
    await editor.settled();

    editor.setOpeningCard({ ...card, title: "Juli am See" });
    await editor.settled();

    expect((await store.getSlideshow("show")).openingCard?.title).toBe("Juli am See");
  });

  it("drops the opening card outright when removed", async () => {
    const { editor, store } = await setUp(["a", "b"]);
    editor.ensureOpeningCard();
    await editor.settled();

    editor.removeOpeningCard();
    await editor.settled();

    expect((await store.getSlideshow("show")).openingCard).toBeUndefined();
  });

  it("creates and stores the closing card's defaults over the last picture", async () => {
    const { editor, store } = await setUp(["a", "b", "c"]);

    const card = editor.ensureClosingCard();
    await editor.settled();

    expect(card.title).toBe("");
    expect(card.background).toEqual({ kind: "picture", pictureId: "c", fade: 60 });
    expect((await store.getSlideshow("show")).closingCard).toEqual(card);
  });

  it("stores a change to the closing card at once", async () => {
    const { editor, store } = await setUp(["a", "b"]);
    const card = editor.ensureClosingCard();
    await editor.settled();

    editor.setClosingCard({ ...card, title: "Danke fürs Zuschauen" });
    await editor.settled();

    expect((await store.getSlideshow("show")).closingCard?.title).toBe("Danke fürs Zuschauen");
  });

  it("drops the closing card outright when removed", async () => {
    const { editor, store } = await setUp(["a", "b"]);
    editor.ensureClosingCard();
    await editor.settled();

    editor.removeClosingCard();
    await editor.settled();

    expect((await store.getSlideshow("show")).closingCard).toBeUndefined();
  });

  it("normalizes a raw title and subtitle before storing the opening card", async () => {
    const { editor, store } = await setUp(["a", "b"]);
    const card = editor.ensureOpeningCard();
    await editor.settled();

    editor.setOpeningCard({ ...card, title: "Juli  am   See ", subtitle: "  Summer  trip  " });
    await editor.settled();

    const stored = await store.getSlideshow("show");
    expect(stored.openingCard?.title).toBe("Juli am See");
    expect(stored.openingCard?.subtitle).toBe("Summer trip");
  });

  it("normalizes a raw title before storing the closing card", async () => {
    const { editor, store } = await setUp(["a", "b"]);
    const card = editor.ensureClosingCard();
    await editor.settled();

    editor.setClosingCard({ ...card, title: " Danke  fürs Zuschauen  " });
    await editor.settled();

    const stored = await store.getSlideshow("show");
    expect(stored.closingCard?.title).toBe("Danke fürs Zuschauen");
  });
});
